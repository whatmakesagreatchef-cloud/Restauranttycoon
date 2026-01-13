import { clamp, randInt } from "./rng.js";
import { INV_CATEGORY_PROFILE, INV_EMERGENCY, STORAGE_LEVELS } from "./data_inventory.js";
import { SUPPLY_CATEGORIES, SUPPLIERS } from "./data_suppliers.js";
import { ensureSupplyState, ensureVenueSuppliers, supplierById, activeContract } from "./system_suppliers.js";

export function ensureInventoryState(state){
  ensureSupplyState(state);
  if(!state.inventoryLog) state.inventoryLog = [];
  for(const v of (state.venues||[])){
    ensureVenueInventory(v);
  }
  return state;
}

export function ensureVenueInventory(v){
  if(!v.inventory){
    v.inventory = {
      autoReorder: true,
      parWeeks: 1.2,           // target weeks of stock on hand
      storageLevel: 1,         // 1..4
      lastStocktakeWeek: -999,
      cats: {},                // cat -> { onHand, parTarget, incoming, lastOrderWeek }
      orders: []               // { id, cat, value, etaWeek, status:"open"|"received" }
    };
  }
  if(v.inventory.parWeeks == null) v.inventory.parWeeks = 1.2;
  if(v.inventory.autoReorder == null) v.inventory.autoReorder = true;
  if(v.inventory.storageLevel == null) v.inventory.storageLevel = 1;
  if(!v.inventory.cats) v.inventory.cats = {};
  if(!Array.isArray(v.inventory.orders)) v.inventory.orders = [];

  for(const c of SUPPLY_CATEGORIES){
    if(!v.inventory.cats[c.id]){
      v.inventory.cats[c.id] = { onHand: 0, parTarget: 0, incoming: 0, lastOrderWeek: -999 };
    }
  }
  return v.inventory;
}

export function storageProfile(level){
  return STORAGE_LEVELS.find(x=>x.level===level) || STORAGE_LEVELS[0];
}

export function inventoryOnHandValue(venue){
  ensureVenueInventory(venue);
  return SUPPLY_CATEGORIES.reduce((a,c)=>a + (venue.inventory.cats[c.id]?.onHand||0), 0);
}

export function inventoryIncomingValue(venue){
  ensureVenueInventory(venue);
  return SUPPLY_CATEGORIES.reduce((a,c)=>a + (venue.inventory.cats[c.id]?.incoming||0), 0);
}

export function upgradeStorage(state, venueId){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return { ok:false };
  ensureVenueInventory(v);

  const next = clamp((v.inventory.storageLevel||1) + 1, 1, 4);
  if(next === v.inventory.storageLevel) return { ok:false };
  const prof = storageProfile(next);
  const cost = prof.capex||0;
  if(cost > 0 && state.cash < cost) return { ok:false, reason:"cash" };

  if(cost > 0){
    state.cash -= cost;
    state.logs.push({ week: state.week, type:"capex", msg:`${v.name}: storage upgrade (${prof.label}) ${money(cost)}` });
  }

  v.inventory.storageLevel = next;
  return { ok:true };
}

export function stocktake(state, venueId){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return { ok:false };
  ensureVenueInventory(v);

  // Stocktake reduces future shrink for a few weeks by resetting lastStocktakeWeek.
  v.inventory.lastStocktakeWeek = state.week;
  state.logs.push({ week: state.week, type:"inventory", msg:`${v.name}: completed a stocktake.` });
  return { ok:true };
}

export function setParWeeks(state, venueId, parWeeks){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return;
  ensureVenueInventory(v);
  v.inventory.parWeeks = clamp(Number(parWeeks||1.2), 0.6, 2.2);
}

export function setAutoReorder(state, venueId, on){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return;
  ensureVenueInventory(v);
  v.inventory.autoReorder = !!on;
}

export function receiveOrders(state, venue){
  ensureVenueInventory(venue);

  let received = 0;
  for(const o of venue.inventory.orders){
    if(o.status!=="open") continue;
    if(state.week < o.etaWeek) continue;

    const cat = venue.inventory.cats[o.cat];
    if(!cat) continue;
    cat.onHand += o.value;
    cat.incoming = Math.max(0, (cat.incoming||0) - o.value);
    o.status = "received";
    received += o.value;
  }
  // clean old
  venue.inventory.orders = venue.inventory.orders.filter(o=>o.status==="open" || (state.week - o.etaWeek) <= 4);
  return received;
}

export function placeOrder(state, venue, catId, value, rng){
  ensureSupplyState(state);
  ensureVenueSuppliers(venue);
  ensureVenueInventory(venue);

  const cat = venue.inventory.cats[catId];
  if(!cat) return { ok:false };

  const v = Math.max(0, Number(value||0));
  if(v <= 0) return { ok:false };

  // Cap by storage
  const capMult = storageProfile(venue.inventory.storageLevel||1).capMult;
  const maxOnHand = computeMaxOnHand(venue, capMult);
  const canHold = Math.max(0, maxOnHand - inventoryOnHandValue(venue));
  const toOrder = Math.min(v, canHold);

  if(toOrder <= 0) return { ok:false, reason:"storage" };

  // Supplier & price index
  const supplierId = (venue.suppliers && venue.suppliers[catId]) || pickCheapest(catId);
  const supplier = supplierById(supplierId) || supplierById(pickCheapest(catId));
  const leadWeeks = Math.max(1, Math.ceil((supplier.leadDays||2)/7));

  // Reliability delay chance
  let eta = state.week + leadWeeks;
  if(rng() > (supplier.reliability||0.8)){
    eta += 1; // delayed a week
  }

  // Contract discount
  const contract = activeContract(state, catId);
  const discount = contract ? (contract.discount||0) : 0;

  const marketIdx = Number(state.supplyIndex && state.supplyIndex[catId] || 1);
  const unitIdx = Number(supplier.basePrice||1.0) * marketIdx * (1 - discount);

  const costNow = toOrder * unitIdx;

  if(state.cash < costNow) return { ok:false, reason:"cash" };
  state.cash -= costNow;

  // register
  const id = "po_" + Date.now() + "_" + Math.floor(rng()*1e6);
  venue.inventory.orders.unshift({ id, cat: catId, value: toOrder, etaWeek: eta, status:"open", cost: costNow });

  cat.incoming = (cat.incoming||0) + toOrder;
  cat.lastOrderWeek = state.week;

  state.logs.push({ week: state.week, type:"inventory", msg:`${venue.name}: ordered ${catId} ${money(Math.round(costNow))} (ETA W${eta})` });
  return { ok:true, costNow };
}

export function computeMaxOnHand(venue, capMult){
  // Heuristic: capacity * spend influence
  const cap = Number(venue.capacity||40);
  const base = clamp(cap * 320, 8000, 120000); // $ value
  return base * (capMult||1.0);
}

function pickCheapest(catId){
  const list = SUPPLIERS.filter(s=>s.cat===catId);
  if(!list.length) return null;
  let best = list[0];
  for(const s of list){
    if((s.basePrice||1) < (best.basePrice||1)) best = s;
  }
  return best.id;
}

export function tickInventoryWeek(state, venue, rng, opts){
  ensureSupplyState(state);
  ensureVenueSuppliers(venue);
  ensureVenueInventory(venue);

  const cogs = Number(opts && opts.cogs || 0);
  const covers = Number(opts && opts.covers || 0);

  // Receive deliveries first
  receiveOrders(state, venue);

  let wasteCost = 0;
  let stockouts = 0;
  let emergencySpend = 0;
  let satPenalty = 0;
  let speedPenalty = 0;

  // Consume inventory by category split
  for(const cat of SUPPLY_CATEGORIES){
    const prof = INV_CATEGORY_PROFILE[cat.id] || { split: 1/SUPPLY_CATEGORIES.length, spoil:0.02, shrink:0.008 };
    const want = cogs * prof.split;

    const bucket = venue.inventory.cats[cat.id];
    if(!bucket) continue;

    // Shrink (reduced if you stocktook recently)
    const since = state.week - (venue.inventory.lastStocktakeWeek||-999);
    const shrinkMult = since <= 2 ? 0.35 : (since <= 6 ? 0.65 : 1.0);
    const shrinkRate = (prof.shrink||0.008) * shrinkMult;
    const shrink = bucket.onHand * shrinkRate;
    bucket.onHand = Math.max(0, bucket.onHand - shrink);
    wasteCost += shrink;

    // Spoilage
    const spoil = bucket.onHand * (prof.spoil||0);
    bucket.onHand = Math.max(0, bucket.onHand - spoil);
    wasteCost += spoil;

    // Consume
    if(bucket.onHand >= want){
      bucket.onHand -= want;
    }else{
      const missing = want - bucket.onHand;
      bucket.onHand = 0;
      stockouts += 1;

      // Emergency buy at premium
      const prem = 1 + (INV_EMERGENCY.premiumMin + rng()*(INV_EMERGENCY.premiumMax - INV_EMERGENCY.premiumMin));
      emergencySpend += missing * prem;

      // Service penalties: worse in high-covers settings
      const pressure = clamp(covers/180, 0, 1);
      satPenalty += 1.0 + 2.0*pressure;
      speedPenalty += 0.8 + 1.6*pressure;
    }

    // Update par targets based on current cogs
    const target = cogs * prof.split * (venue.inventory.parWeeks||1.2);
    bucket.parTarget = clamp(target, 0, 999999);
  }

  // Auto-reorder at end of week
  if(venue.inventory.autoReorder){
    const capMult = storageProfile(venue.inventory.storageLevel||1).capMult;
    const maxOnHand = computeMaxOnHand(venue, capMult);

    for(const cat of SUPPLY_CATEGORIES){
      const bucket = venue.inventory.cats[cat.id];
      if(!bucket) continue;

      const need = Math.max(0, bucket.parTarget - (bucket.onHand + (bucket.incoming||0)));
      // Don't spam tiny orders
      if(need < 250) continue;

      const headroom = Math.max(0, maxOnHand - inventoryOnHandValue(venue) - inventoryIncomingValue(venue));
      const toOrder = Math.min(need, headroom);

      if(toOrder > 0){
        placeOrder(state, venue, cat.id, toOrder, rng);
      }
    }
  }

  return {
    wasteCost: Math.round(wasteCost),
    stockouts,
    emergencySpend: Math.round(emergencySpend),
    satPenalty: clamp(satPenalty, 0, 10),
    speedPenalty: clamp(speedPenalty, 0, 8),
    onHand: Math.round(inventoryOnHandValue(venue)),
    incoming: Math.round(inventoryIncomingValue(venue))
  };
}

export function money(n){
  const x = Math.round(Number(n||0));
  return "$" + x.toLocaleString();
}
