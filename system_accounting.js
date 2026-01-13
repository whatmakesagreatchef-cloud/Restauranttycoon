import { clamp } from "./rng.js";
import { TAX } from "./data_accounting.js";

export function ensureAccounting(state){
  if(!state.accounting) state.accounting = {};
  if(state.accounting.taxRate == null) state.accounting.taxRate = TAX.defaultRate;
  if(state.accounting.taxAccrued == null) state.accounting.taxAccrued = 0; // liability
  if(state.accounting.retained == null) state.accounting.retained = 0;

  if(!state.loans) state.loans = []; // {id, principal, balance, apr, weeklyPayment, weeksLeft, lender}
  if(!state.fixedAssets) state.fixedAssets = []; // {id, venueId, name, cost, book, depWeekly}

  return state;
}

export function addFixedAsset(state, venueId, name, cost, depWeeks){
  ensureAccounting(state);
  const id = "fa_" + Date.now() + "_" + Math.floor(Math.random()*1e6);
  const weeks = Math.max(26, Number(depWeeks||260)); // default ~5 years
  const depWeekly = cost / weeks;
  state.fixedAssets.push({ id, venueId, name, cost, book: cost, depWeekly });
  state.logs.push({ week: state.week, type:"asset", msg:`Capitalized: ${name} (${money(cost)})` });
  return id;
}

export function takeLoan(state, amount, apr, termWeeks, lender){
  ensureAccounting(state);
  const principal = Math.max(1000, Number(amount||0));
  const weeks = Math.max(12, Number(termWeeks||52));
  const rate = clamp(Number(apr||0.12), 0.01, 0.40);

  // Simple amortizing payment (weekly)
  const r = rate/52;
  const pay = (r===0) ? (principal/weeks) : (principal*r) / (1 - Math.pow(1+r, -weeks));

  const id = "ln_" + Date.now() + "_" + Math.floor(Math.random()*1e6);
  state.loans.push({
    id,
    principal,
    balance: principal,
    apr: rate,
    weeklyPayment: pay,
    weeksLeft: weeks,
    lender: (lender||"Bank").slice(0,30)
  });

  state.cash += principal;
  state.logs.push({ week: state.week, type:"finance", msg:`Loan funded: ${money(principal)} @ ${(rate*100).toFixed(1)}% APR` });
  return id;
}

export function tickLoans(state){
  ensureAccounting(state);

  let totalPayment = 0;
  let totalInterest = 0;
  let totalPrincipal = 0;

  for(const ln of state.loans){
    if(ln.balance <= 0 || ln.weeksLeft <= 0) continue;

    const r = (ln.apr||0)/52;
    const interest = ln.balance * r;
    let payment = Math.min(ln.weeklyPayment||0, ln.balance + interest);

    // If no cash, partial payment (adds penalty interest next week via balance not reducing)
    if(state.cash < payment) payment = Math.max(0, state.cash);

    const principalPaid = Math.max(0, payment - interest);
    ln.balance = Math.max(0, ln.balance - principalPaid);
    ln.weeksLeft = Math.max(0, ln.weeksLeft - 1);

    state.cash -= payment;

    totalPayment += payment;
    totalInterest += interest;
    totalPrincipal += principalPaid;
  }

  // Cleanup paid loans
  state.loans = state.loans.filter(l => !(l.balance<=0 && l.weeksLeft<=0));

  return { totalPayment, totalInterest, totalPrincipal };
}

export function tickDepreciation(state){
  ensureAccounting(state);

  let dep = 0;
  for(const a of state.fixedAssets){
    if(a.book <= 0) continue;
    const d = Math.min(a.depWeekly||0, a.book);
    a.book = Math.max(0, a.book - d);
    dep += d;
  }
  // Cleanup fully depreciated
  state.fixedAssets = state.fixedAssets.filter(a => a.book > 0.01);
  return dep;
}

export function accrueTax(state, profitBeforeTax){
  ensureAccounting(state);
  const p = Number(profitBeforeTax||0);
  if(p <= 0) return 0;

  const tax = p * (state.accounting.taxRate||TAX.defaultRate);
  state.accounting.taxAccrued = (state.accounting.taxAccrued||0) + tax;
  return tax;
}

export function payTax(state, amount){
  ensureAccounting(state);
  const pay = Math.max(0, Math.min(Number(amount||0), state.accounting.taxAccrued||0, state.cash));
  state.accounting.taxAccrued = Math.max(0, (state.accounting.taxAccrued||0) - pay);
  state.cash -= pay;
  state.logs.push({ week: state.week, type:"tax", msg:`Tax paid: ${money(pay)}` });
  return pay;
}

export function money(n){
  const x = Math.round(Number(n||0));
  return "$" + x.toLocaleString();
}

export function netWorth(state){
  ensureAccounting(state);
  const assets = (state.fixedAssets||[]).reduce((a,x)=>a+(x.book||0),0);
  const debt = (state.loans||[]).reduce((a,x)=>a+(x.balance||0),0);
  return (state.cash||0) + assets - debt;
}
