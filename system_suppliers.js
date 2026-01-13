import { clamp, mulberry32, pick } from "./rng.js";
import { SUPPLY_CATEGORIES, SUPPLIERS, SUPPLY_RISK } from "./data_suppliers.js";

// --- State helpers ---
export function ensureSupplyState(state){
  if(!state.hq) state.hq = {};
  if(state.hq.centralPurchasing==null) state.hq.centralPurchasing = false;
  if(!state.hq.contracts) state.hq.contracts = []; // {cat, supplierId, termWeeks, startWeek, discount, breakFeePct}
  if(!state.supplyIndex) state.supplyIndex = {};   // per category price index
  if(!state.supplyLog) state.supplyLog = [];       // short history

  // init indexes
  for(const c of SUPPLY_CATEGORIES){
    if(state.supplyIndex[c.id]==null) state.supplyIndex[c.id] = 1.0;
  }

  for(const v of (state.venues||[])){
    ensureVenueSuppliers(v);
  }
  return state;
}

export function ensureVenueSuppliers(v){
  if(!v.suppliers) v.suppliers = {}; // cat -> supplierId
  if(!v.supplyKpis) v.supplyKpis = { stockouts:0, emergencySpend:0, avgIndex:1.0 };
  return v;
}

export function listCategories(){ return SUPPLY_CATEGORIES; }
export function suppliersFor(cat){ return SUPPLIERS.filter(s=>s.cat===cat); }
export function supplierById(id){ return SUPPLIERS.find(s=>s.id===id) || null; }

export function setVenueSupplier(state, venueId, cat, supplierId){
  ensureSupplyState(state);
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return;
  ensureVenueSuppliers(v);
  v.suppliers[cat] = supplierId;
}

export function setCentralPurchasing(state, on){
  ensureSupplyState(state);
  state.hq.centralPurchasing = !!on;
}

export function activeContract(state, cat){
  ensureSupplyState(state);
  const c = state.hq.contracts.find(x=>x.cat===cat);
  if(!c) return null;
  const endWeek = c.startWeek + c.termWeeks;
  if(state.week > endWeek) return null;
  return c;
}

export function createContract(state, cat, supplierId, termWeeks){
  ensureSupplyState(state);

  // Scale discount based on number of venues
  const n = (state.venues||[]).length;
  const scale = clamp(Math.log2(Math.max(1,n)) * 0.02, 0.00, 0.07); // up to ~7%

  const term = clamp(Number(termWeeks||0), 4, 26);
  const termDisc = term>=26 ? 0.06 : (term>=12 ? 0.04 : 0.02);
  const discount = clamp(termDisc + scale, 0.02, 0.12);

  const breakFeePct = term>=26 ? 0.08 : (term>=12 ? 0.06 : 0.04);

  // replace existing contract for category
  state.hq.contracts = state.hq.contracts.filter(x=>x.cat!==cat);
  state.hq.contracts.push({
    cat, supplierId,
    termWeeks: term,
    startWeek: state.week,
    discount,
    breakFeePct
  });

  state.logs.push({ week: state.week, type:"hq", msg:`Signed ${cat} contract with ${supplierById(supplierId)?.name||supplierId} (${Math.round(discount*100)}% off, ${term}w).` });
}

export function breakContract(state, cat){
  ensureSupplyState(state);
  const c = state.hq.contracts.find(x=>x.cat===cat);
  if(!c) return { ok:false, reason:"none" };
  // Fee is % of typical weekly spend: rough proxy
  const weeklySpend = estimateWeeklyCategorySpend(state, cat);
  const fee = Math.round(weeklySpend * c.breakFeePct);

  if(state.cash < fee) return { ok:false, reason:"cash", fee };

  state.cash -= fee;
  state.hq.contracts = state.hq.contracts.filter(x=>x.cat!==cat);
  state.logs.push({ week: state.week, type:"hq", msg:`Broke ${cat} contract (-${fee.toLocaleString()}).` });
  return { ok:true, fee };
}

function estimateWeeklyCategorySpend(state, cat){
  // rough: revenue * cogsPct * cat weight
  const rev = state.lastWeekReport ? Number(state.lastWeekReport.revenue||0) : 150000;
  const cogs = state.lastWeekReport ? Number(state.lastWeekReport.cogs||0) : rev*0.31;
  const w = categoryWeight(cat);
  return Math.max(1200, cogs*w);
}
function categoryWeight(cat){
  if(cat==="produce") return 0.22;
  if(cat==="meat") return 0.22;
  if(cat==="seafood") return 0.14;
  if(cat==="dry") return 0.18;
  if(cat==="beverage") return 0.16;
  if(cat==="coffee") return 0.08;
  return 0.15;
}

// --- Weekly simulation ---
export function tickSupplyMarket(state){
  ensureSupplyState(state);

  const seed = (state.seed + state.week*1337) >>> 0;
  const rng = mulberry32(seed);

  const shocks = [];

  for(const c of SUPPLY_CATEGORIES){
    const risk = SUPPLY_RISK[c.id] || { priceVol:0.05, shockChance:0.05 };
    let idx = Number(state.supplyIndex[c.id]||1);

    // mean reversion towards 1.0
    idx = idx + (1.0 - idx)*0.15;

    // noise
    const noise = (rng()*2-1) * risk.priceVol;
    idx = idx * (1 + noise);

    // occasional shock
    if(rng() < risk.shockChance){
      const shock = 1 + (rng()*0.22 + 0.06); // +6% to +28%
      idx = idx * shock;
      shocks.push({ cat:c.id, shock: shock });
    }

    state.supplyIndex[c.id] = clamp(idx, 0.78, 1.55);
  }

  if(shocks.length){
    const msg = shocks.map(s=>`${s.cat} +${Math.round((s.shock-1)*100)}%`).join(", ");
    state.supplyLog.unshift({ week: state.week, msg });
    state.supplyLog = state.supplyLog.slice(0, 8);
    state.logs.push({ week: state.week, type:"supply", msg:`Supply shock: ${msg}` });
  }
}

export function venueSupplyEffects(state, venue, baseCogs){
  ensureSupplyState(state);
  ensureVenueSuppliers(venue);

  // Decide suppliers: either central contract (if on), else venue selections (fallback to cheapest in cat)
  const central = state.hq && state.hq.centralPurchasing;

  let indexAvg = 1.0;
  let idxSum = 0, wSum = 0;

  let stockouts = 0;
  let emergencySpend = 0;
  let cogs = Number(baseCogs||0);

  for(const cat of SUPPLY_CATEGORIES){
    const w = categoryWeight(cat.id);
    let chosenId = null;

    const contract = central ? activeContract(state, cat.id) : null;
    if(contract) chosenId = contract.supplierId;
    else chosenId = (venue.suppliers && venue.suppliers[cat.id]) ? venue.suppliers[cat.id] : null;

    let supplier = chosenId ? supplierById(chosenId) : null;
    if(!supplier){
      // fallback: best value among suppliers in category
      const pool = suppliersFor(cat.id);
      supplier = pool.sort((a,b)=>a.basePrice-b.basePrice)[0];
      chosenId = supplier.id;
      venue.suppliers[cat.id] = chosenId;
    }

    const market = Number(state.supplyIndex[cat.id] || 1.0);
    const contract = central ? activeContract(state, cat.id) : null;
    const disc = contract && contract.supplierId===supplier.id ? Number(contract.discount||0) : 0;

    const effIdx = clamp(supplier.basePrice * market * (1 - disc), 0.70, 1.70);

    idxSum += effIdx*w;
    wSum += w;

    // stockout chance: worse when low reliability + market high
    const pressure = clamp((market-1)*0.9, 0, 0.6);
    const stockChance = clamp((1 - supplier.reliability) * 0.55 + pressure*0.25, 0.02, 0.22);

    // Roll once per category to keep it light
    const seed = (state.seed + state.week*777 + hashStr(venue.id||venue.name||"v") + hashStr(cat.id)) >>> 0;
    const rng = mulberry32(seed);

    if(rng() < stockChance){
      stockouts += 1;

      // emergency buying costs more
      const emergencyPremium = 1 + (0.18 + rng()*0.18);
      const add = baseCogs * w * (emergencyPremium - 1);
      cogs += add;
      emergencySpend += add;
    }

    // apply cost index to cogs
    cogs += baseCogs * w * (effIdx - 1);
  }

  indexAvg = wSum ? idxSum / wSum : 1.0;

  venue.supplyKpis.stockouts += stockouts;
  venue.supplyKpis.emergencySpend += Math.round(emergencySpend);
  venue.supplyKpis.avgIndex = indexAvg;

  // Quality hit if stockouts (affects satisfaction elsewhere)
  const satPenalty = clamp(stockouts * 1.6, 0, 8);
  const speedPenalty = clamp(stockouts * 1.0, 0, 6);

  return { cogs: Math.max(0, Math.round(cogs)), stockouts, emergencySpend: Math.round(emergencySpend), indexAvg, satPenalty, speedPenalty };
}

function hashStr(str){
  let h = 2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h>>>0;
}
