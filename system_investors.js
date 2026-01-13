import { clamp } from "./rng.js";

export function generateInvestorOffers(state, city){
  const week = state.week;
  const base = [
    {
      id:`silent_${week}`,
      type:"silent",
      name:"Silent Investor Group",
      cash: 150000,
      equity: 0.18,
      control: { capexApprovalOver: 60000, expansionApproval: true, saleApproval: false },
      pressure: { minWeeklyProfit: 1200, deadlineWeeks: 10 },
      notes:"Cash for equity. Light controls. Wants steady performance."
    },
    {
      id:`operator_${week}`,
      type:"operator_partner",
      name:"Operator Partner (GM)",
      cash: 60000,
      equity: 0.10,
      control: { capexApprovalOver: 30000, expansionApproval: false, saleApproval: false },
      pressure: { minWeeklyProfit: 800, deadlineWeeks: 12 },
      notes:"Brings ops skill. Low cash, reduces owner dependence."
    },
    {
      id:`pref_${week}`,
      type:"preferred",
      name:"Preferred Equity Fund",
      cash: 250000,
      equity: 0.22,
      pref: 0.09,
      control: { capexApprovalOver: 40000, expansionApproval: true, saleApproval: true },
      pressure: { minWeeklyProfit: 1800, deadlineWeeks: 8 },
      notes:"Preferred return + heavier controls. Can complicate exit."
    }
  ];

  const risk = city ? city.criticHarshness * city.rentIndex : 1.0;
  for(const o of base){
    o.equity = clamp(o.equity + (risk-1)*0.03, 0.06, 0.40);
    o.cash = Math.round(o.cash * (0.95 + (risk-1)*0.10));
  }
  return base;
}

export function acceptInvestorOffer(state, offer){
  state.cash += offer.cash;

  state.investors.push({
    id: offer.id,
    name: offer.name,
    type: offer.type,
    equity: offer.equity,
    cashIn: offer.cash,
    pref: offer.pref ?? null,
    control: offer.control,
    pressure: offer.pressure,
    joinedWeek: state.week,
  });

  if(offer.type === "preferred") state.ownerDependence = Math.max(0, state.ownerDependence - 6);
  if(offer.type === "operator_partner") state.ownerDependence = Math.max(0, state.ownerDependence - 18);

  state.logs.push({ week: state.week, type:"capital", msg:`Accepted: ${offer.name} (+$${offer.cash.toLocaleString()} for ${(offer.equity*100).toFixed(0)}% equity)` });
}

export function totalOutsideEquity(state){
  let e = 0;
  for(const inv of state.investors) e += inv.equity;
  return Math.min(0.95, e);
}


// --- Governance + dividends + buyouts (v1.9) ---

export function ensureInvestorLedger(state){
  if(!state.boardPressure && state.boardPressure !== 0) state.boardPressure = 0;
  if(!state.dividendsPolicy) state.dividendsPolicy = "reinvest";
  if(state.dividendsPayoutRatio == null){
    state.dividendsPayoutRatio = (state.dividendsPolicy==="distribute") ? 0.55 : (state.dividendsPolicy==="balanced" ? 0.30 : 0.00);
  }
  for(const inv of state.investors){
    if(inv.paidOut == null) inv.paidOut = 0;
    if(inv.prefAccrued == null) inv.prefAccrued = 0;
    if(inv._pressureFailCount == null) inv._pressureFailCount = 0;
  }
}

export function setDividendsPolicy(state, policy){
  state.dividendsPolicy = policy;
  state.dividendsPayoutRatio = (policy==="distribute") ? 0.55 : (policy==="balanced" ? 0.30 : 0.00);
  state.logs.push({ week: state.week, type:"capital", msg:`Dividends policy set to ${policy}` });
}

export function payDividends(state, weeklyNet){
  ensureInvestorLedger(state);
  const outsideEq = totalOutsideEquity(state);
  if(outsideEq <= 0.0001) return { paid:0, prefPaid:0 };

  const net = Math.max(0, Number(weeklyNet||0));
  const ratio = clamp(Number(state.dividendsPayoutRatio||0), 0, 0.80);
  let pool = net * ratio;

  // Never overdraft cash just for dividends
  pool = Math.min(pool, Math.max(0, state.cash * 0.35));

  if(pool <= 1) return { paid:0, prefPaid:0 };

  // Preferred return accrual (weekly)
  for(const inv of state.investors){
    if(inv.type==="preferred" && inv.pref){
      inv.prefAccrued += (inv.cashIn * inv.pref / 52);
    }
  }

  let prefPaid = 0;

  // Pay preferred accrued first
  for(const inv of state.investors){
    if(inv.type!=="preferred") continue;
    const due = Math.max(0, inv.prefAccrued || 0);
    if(due <= 0.5) continue;

    const pay = Math.min(pool, due);
    if(pay <= 0) break;

    state.cash -= pay;
    inv.paidOut += pay;
    inv.prefAccrued -= pay;
    pool -= pay;
    prefPaid += pay;
  }

  if(pool <= 1) return { paid:prefPaid, prefPaid };

  // Pay pro-rata dividends to all outside equity holders
  let paid = prefPaid;
  for(const inv of state.investors){
    const share = pool * (inv.equity / outsideEq);
    if(share <= 0.5) continue;
    const pay = Math.min(share, Math.max(0, state.cash));
    state.cash -= pay;
    inv.paidOut += pay;
    paid += pay;
  }

  if(paid > 1){
    state.logs.push({ week: state.week, type:"capital", msg:`Paid dividends to partners: ${Math.round(paid).toLocaleString()}` });
  }
  return { paid, prefPaid };
}

export function pressureStatus(state, inv){
  // Determine whether you're meeting investor pressure terms.
  const p = inv.pressure;
  if(!p) return { status:"none", weeksLeft:null };

  const deadline = (inv.joinedWeek||0) + (p.deadlineWeeks||0);
  const weeksLeft = deadline - state.week;

  // Use recent net history for rolling average (4 weeks)
  const hist = state.netHistory && state.netHistory.length ? state.netHistory : [];
  const tail = hist.slice(-4);
  const avg = tail.length ? tail.reduce((a,b)=>a+b,0)/tail.length : (state.lastWeekReport ? state.lastWeekReport.net : 0);

  const target = Number(p.minWeeklyProfit||0);
  const onTrack = avg >= target;

  if(weeksLeft > 2){
    return { status: onTrack ? "ok" : "warn", weeksLeft, avg, target };
  }
  if(weeksLeft >= 0){
    return { status: onTrack ? "ok" : "danger", weeksLeft, avg, target };
  }
  // Past deadline
  return { status: onTrack ? "ok" : "failed", weeksLeft, avg, target };
}

export function tickInvestorGovernance(state){
  ensureInvestorLedger(state);

  // Board pressure naturally cools down if you're profitable and stable
  const net = state.lastWeekReport ? Number(state.lastWeekReport.net||0) : 0;
  if(net > 0){
    state.boardPressure = Math.max(0, (state.boardPressure||0) - 1);
  }

  for(const inv of state.investors){
    const s = pressureStatus(state, inv);
    if(s.status !== "failed") continue;

    // Apply penalty once per 4 weeks to avoid spam
    const gate = (state.week - (inv.joinedWeek||0)) % 4 === 0;
    if(!gate) continue;

    inv._pressureFailCount = (inv._pressureFailCount||0) + 1;
    state.boardPressure = clamp((state.boardPressure||0) + 6, 0, 100);
    state.reputation = clamp((state.reputation||50) - 2, 0, 100);

    // Investors may force higher payouts when unhappy
    if(state.boardPressure >= 35 && state.dividendsPolicy === "reinvest"){
      state.dividendsPolicy = "balanced";
      state.dividendsPayoutRatio = 0.30;
      state.logs.push({ week: state.week, type:"capital", msg:`Investor pressure forced a balanced dividends policy.` });
    }

    state.logs.push({ week: state.week, type:"capital", msg:`Investor pressure: missed profit target for ${inv.name}. Board pressure up.` });
  }
}

export function estimateBuyoutCost(state, invId, valuation){
  const inv = state.investors.find(i=>i.id===invId);
  if(!inv) return null;
  const outsideEq = totalOutsideEquity(state);

  // baseline: 1.25× cash in + any unpaid preferred accrual
  const base = inv.cashIn * 1.25 + (inv.prefAccrued || 0);

  // market: their slice of implied sale price (plus a small premium if they have sale approval)
  const sale = valuation ? valuation.salePrice : 0;
  const controlPremium = inv.control && inv.control.saleApproval ? 1.06 : 1.00;
  const market = sale > 0 ? (sale * (inv.equity) * 0.98 * controlPremium) : base;

  // Choose the higher (realistic: buyouts are rarely cheap)
  const cost = Math.max(base, market);

  return { cost, inv };
}

export function buyOutInvestor(state, invId, valuation){
  ensureInvestorLedger(state);
  const est = estimateBuyoutCost(state, invId, valuation);
  if(!est) return { ok:false, reason:"missing" };
  const cost = est.cost;

  if(state.cash < cost){
    return { ok:false, reason:"cash", cost };
  }

  state.cash -= cost;
  state.investors = state.investors.filter(i=>i.id!==invId);

  state.logs.push({ week: state.week, type:"capital", msg:`Bought out investor: ${est.inv.name} (-${Math.round(cost).toLocaleString()})` });
  return { ok:true, cost };
}

export function requiresSaleApproval(state){
  return state.investors.some(i=>i.control && i.control.saleApproval);
}
