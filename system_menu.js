import { mulberry32, pick, randInt, clamp, hashStrToSeed } from "./rng.js";
import { VENUE_TYPES } from "./data_venues.js";

function vtById(id){ return VENUE_TYPES.find(v=>v.id===id); }

export function computeMenuMetrics(venue){
  const items = (venue.menuItems || []).filter(x=>x && x.active !== false);

  const vt = vtById(venue.typeId);
  const fallbackAvg = vt ? vt.avgSpendBase * 0.70 : 28;

  if(items.length === 0){
    return {
      hasMenu: false,
      itemCount: 0,
      avgPrice: fallbackAvg,
      foodCostPct: vt ? vt.foodCostBase : 0.32,
      prepLoad: 45,
      stationImbalance: 35,
      varietyScore: 25,
      avgSpendPerCover: vt ? vt.avgSpendBase : fallbackAvg,
      stationTotals: {},
      catTotals: {},
      warnings: ["No menu items yet — simulation uses venue defaults."],
    };
  }

  // popularity weights: 1..5 default 3
  let wSum = 0;
  let priceW = 0;
  let costW = 0;
  let prepW = 0;

  const stationTotals = {};
  const catTotals = {};

  for(const it of items){
    const w = clamp(Number(it.popularity ?? 3), 1, 5);
    const price = clamp(Number(it.price ?? 0), 0, 999);
    const cost = clamp(Number(it.cost ?? 0), 0, 999);
    const prep = clamp(Number(it.prep ?? 50), 0, 100);

    wSum += w;
    priceW += price * w;
    costW += cost * w;
    prepW += prep * w;

    const st = it.station || "pan";
    stationTotals[st] = (stationTotals[st]||0) + w;

    const cat = it.category || "mains";
    catTotals[cat] = (catTotals[cat]||0) + 1;
  }

  const avgPrice = priceW / Math.max(1, wSum);
  const avgCost = costW / Math.max(1, wSum);
  const foodCostPct = clamp(avgCost / Math.max(1, avgPrice), 0.18, 0.45);

  const prepLoad = clamp(prepW / Math.max(1, wSum), 0, 100);

  const stationImbalance = stationImbalanceScore(stationTotals);
  const varietyScore = varietyScoreFromCats(catTotals, items.length);

  const attachRate = attachRateForStyle(venue.menuStyle || "a_la_carte");
  const avgSpendPerCover = clamp(avgPrice * attachRate, fallbackAvg*0.7, fallbackAvg*2.0);

  const warnings = [];
  if(foodCostPct > 0.36) warnings.push("Food cost looks high (over 36%). Consider price/cost tweaks.");
  if(foodCostPct < 0.22) warnings.push("Food cost looks very low — could hurt perceived quality.");
  if(prepLoad > 72) warnings.push("Prep complexity is high — service speed and labour will suffer.");
  if(stationImbalance > 65) warnings.push("Station load is unbalanced — likely bottlenecks and slow service.");
  if(items.length < 6) warnings.push("Very small menu — demand may be limited (unless tasting).");

  return {
    hasMenu: true,
    itemCount: items.length,
    avgPrice,
    foodCostPct,
    prepLoad,
    stationImbalance,
    varietyScore,
    avgSpendPerCover,
    stationTotals,
    catTotals,
    warnings
  };
}

function stationImbalanceScore(stTotals){
  const keys = Object.keys(stTotals);
  if(keys.length <= 1) return 80; // one station = bottleneck
  const vals = keys.map(k=>stTotals[k]);
  const mean = vals.reduce((a,b)=>a+b,0) / vals.length;
  let variance = 0;
  for(const v of vals) variance += Math.pow(v-mean,2);
  variance /= Math.max(1, vals.length);
  const std = Math.sqrt(variance);
  // map 0..high => 0..100
  const score = clamp((std / Math.max(1, mean)) * 120 + 20, 0, 100);
  return score;
}

function varietyScoreFromCats(catTotals, n){
  const unique = Object.keys(catTotals).length;
  // target 4-6 categories depending on size
  const sizeFactor = clamp(n/14, 0.35, 1.0);
  const score = clamp((unique / 6) * 100 * sizeFactor + (n>=10?15:0), 0, 100);
  return score;
}

function attachRateForStyle(style){
  // Approx covers spend multiplier vs “avg item price”
  const map = {
    a_la_carte: 1.35,
    tasting: 1.00,
    counter: 1.20,
    pub: 1.45,
    cafe: 1.25,
    truck: 1.15,
    hotel: 1.35,
    winery: 1.45,
  };
  return map[style] ?? 1.35;
}

export function generateStarterMenu(state, venue){
  const seed = (state.seed + state.week*777 + hashStrToSeed(venue.typeId + "|" + (venue.menuStyle||"")) ) >>> 0;
  const rng = mulberry32(seed);

  const vt = vtById(venue.typeId);
  const base = vt ? vt.avgSpendBase : 40;

  const style = venue.menuStyle || "a_la_carte";

  const out = [];
  const push = (name, category, station, price, cost, prep, pop=3)=> {
    out.push({
      id: "mi_" + Math.floor(rng()*1e12),
      name,
      category,
      station,
      price: roundTo(price, 0.5),
      cost: roundTo(cost, 0.5),
      prep: Math.round(prep),
      popularity: pop,
      active: true,
      isSpecial: false
    });
  };

  if(style === "tasting"){
    push("Amuse • seasonal bite", "snacks", "cold", base*0.22, base*0.07, 72, 3);
    push("Starter • cured fish / citrus", "entrees", "cold", base*0.28, base*0.09, 74, 3);
    push("Pasta • butter + umami", "mains", "pan", base*0.32, base*0.11, 78, 3);
    push("Main • roast / sauce", "mains", "grill", base*0.40, base*0.14, 80, 3);
    push("Dessert • set + crunch", "dessert", "pastry", base*0.26, base*0.09, 76, 3);
  } else if(style === "cafe"){
    push("House eggs + toast", "mains", "pan", base*0.55, base*0.18, 55, 4);
    push("Seasonal salad bowl", "mains", "cold", base*0.45, base*0.14, 42, 3);
    push("Chicken sandwich", "mains", "pan", base*0.50, base*0.16, 48, 4);
    push("Pastry of the day", "dessert", "pastry", base*0.30, base*0.10, 50, 3);
    push("Flat white", "coffee", "coffee", base*0.18, base*0.05, 22, 5);
  } else if(style === "truck"){
    push("Signature wrap / taco", "mains", "pan", base*0.45, base*0.16, 50, 5);
    push("Loaded fries", "sides", "fryer", base*0.28, base*0.10, 40, 4);
    push("Slaw + pickles", "sides", "cold", base*0.18, base*0.06, 28, 3);
    push("Soft drink", "drinks", "bar", base*0.12, base*0.03, 10, 4);
  } else if(style === "pub"){
    push("Chicken parmigiana", "mains", "fryer", base*0.70, base*0.26, 55, 5);
    push("Steak + chips", "mains", "grill", base*0.85, base*0.32, 58, 4);
    push("Fish + chips", "mains", "fryer", base*0.78, base*0.28, 52, 4);
    push("Garden salad", "sides", "cold", base*0.24, base*0.08, 25, 3);
    push("Pint of beer", "drinks", "bar", base*0.22, base*0.06, 12, 4);
  } else {
    // a_la_carte / counter / hotel / winery etc
    push("Bread + whipped butter", "snacks", "cold", base*0.18, base*0.06, 25, 4);
    push("Crispy calamari", "entrees", "fryer", base*0.34, base*0.12, 45, 4);
    push("Seasonal veg entrée", "entrees", "cold", base*0.32, base*0.11, 40, 3);
    push("Roast chicken + jus", "mains", "grill", base*0.62, base*0.22, 55, 4);
    push("Fish of the day", "mains", "pan", base*0.64, base*0.23, 58, 3);
    push("Fries", "sides", "fryer", base*0.22, base*0.07, 22, 4);
    push("Cheesecake", "dessert", "pastry", base*0.28, base*0.10, 46, 3);
    push("House wine (glass)", "drinks", "bar", base*0.24, base*0.07, 12, 3);
  }

  // a little random variation
  for(const it of out){
    it.price = roundTo(it.price * (0.92 + rng()*0.18), 0.5);
    it.cost  = roundTo(it.cost  * (0.92 + rng()*0.18), 0.5);
    it.prep  = clamp(it.prep + randInt(rng,-6,8), 0, 100);
    it.popularity = clamp(it.popularity + randInt(rng,-1,1), 1, 5);
  }

  return out;
}

function roundTo(x, step){ return Math.round(x/step)*step; }


import { effectiveSkills } from "./system_staff.js";

export function stationLoads(menuOrVenue){
  const items = Array.isArray(menuOrVenue) ? menuOrVenue : ((menuOrVenue.menuItems||[]).filter(x=>x && x.active!==false));
  const totals = {};
  let wSum = 0;
  for(const it of items){
    const w = clamp(Number(it.popularity ?? 3), 1, 5);
    const st = it.station || "pan";
    totals[st] = (totals[st]||0) + w;
    wSum += w;
  }
  const out = Object.keys(totals).map(k=>({ station:k, weight:totals[k], pct: (totals[k]/Math.max(1,wSum)) }));
  out.sort((a,b)=>b.weight-a.weight);
  return out;
}

export function menuEngineering(menuItems){
  const items = (menuItems||[]).filter(x=>x && x.active!==false);
  if(items.length===0){
    return { avgCm:0, avgPop:0, rows:[], notes:["No active items to analyse."] };
  }

  const cms = [];
  const pops = [];
  for(const it of items){
    const price = clamp(Number(it.price ?? 0), 0, 999);
    const cost = clamp(Number(it.cost ?? 0), 0, 999);
    const cm = price - cost;
    cms.push(cm);
    pops.push(clamp(Number(it.popularity ?? 3), 1, 5));
  }
  const avgCm = cms.reduce((a,b)=>a+b,0) / cms.length;
  const avgPop = pops.reduce((a,b)=>a+b,0) / pops.length;

  const rows = items.map(it=>{
    const price = clamp(Number(it.price ?? 0), 0, 999);
    const cost = clamp(Number(it.cost ?? 0), 0, 999);
    const cm = price - cost;
    const pop = clamp(Number(it.popularity ?? 3), 1, 5);

    const highPop = pop >= avgPop;
    const highCm = cm >= avgCm;

    const quad = highPop && highCm ? "star"
               : highPop && !highCm ? "plowhorse"
               : !highPop && highCm ? "puzzle"
               : "dog";

    const suggestion = suggestForQuad(quad, {price,cost,cm,pop});

    return {
      id: it.id,
      name: it.name || "Untitled",
      category: it.category || "mains",
      station: it.station || "pan",
      price, cost, cm, pop,
      quad,
      suggestion
    };
  });

  const notes = [];
  notes.push("Stars: protect consistency and feature them.");
  notes.push("Plowhorses: popular but thin margins — adjust price/portion or upsell.");
  notes.push("Puzzles: great margin but low demand — improve description, placement, or promo.");
  notes.push("Dogs: low demand and low margin — redesign or remove.");

  return { avgCm, avgPop, rows, notes };
}

function suggestForQuad(quad, x){
  if(quad==="star") return "Keep featured. Guard quality + speed. Consider small price test (+2–4%).";
  if(quad==="plowhorse") return "Raise price slightly or reduce cost. Add upsell (side/drink).";
  if(quad==="puzzle") return "Improve naming/description. Move position. Run as special or staff recommendation.";
  return "Redesign or cut. If it stays, make it simpler/faster or use it as limited-time.";
}

export function estimateTicketTimes(venue){
  // Simple kitchen/service model: style baseline + menu complexity + station bottlenecks + skills/stress.
  const m = computeMenuMetrics(venue);

  const style = venue.menuStyle || "a_la_carte";
  const base = ({
    truck: 6,
    counter: 8,
    cafe: 10,
    pub: 14,
    a_la_carte: 16,
    hotel: 16,
    winery: 18,
    tasting: 22,
  })[style] ?? 16;

  const eff = effectiveSkills(venue);

  const delegatedMenu = (!!venue.delegation?.menu && !!venue.staff?.chef);
  const delegatedOps  = (!!venue.delegation?.ops && !!venue.staff?.gm);
  const delegatedFoh  = (!!venue.delegation?.foh && !!venue.staff?.foh);

  const prep = m.hasMenu ? m.prepLoad : 45;
  const imb  = m.hasMenu ? m.stationImbalance : 35;

  const ss = venue.stationStaff || { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };

  const prepHelp = Math.min(0.35, (Number(ss.prep||0)) * 0.12);
  const prepPenalty = (prep - 45) * (delegatedMenu ? 0.15 : 0.18) * (1 - prepHelp); // minutes
  // station help: staff on dominant station reduces bottleneck
  const dominant = stationLoads(venue).slice(0,1)[0];
  const domKey = dominant ? dominant.station : "pan";
  const domHelp = Math.min(0.45, (Number(ss[domKey]||0)) * 0.18);
  const imbPenalty  = Math.max(0, imb - 35) * 0.10 * (1 - domHelp);

  const stress = clamp(Number(venue.staffStress ?? 30), 0, 100);
  const stressPenalty = stress * (delegatedOps ? 0.04 : 0.06);

  const paceSkill = clamp((eff.pace - 50) + (eff.ops - 50)*0.6 + (eff.culinary - 50)*0.3 + (delegatedFoh ? 6 : 0), -40, 50);
  const skillBenefit = paceSkill * 0.06; // minutes reduced

  let avg = base + prepPenalty + imbPenalty + stressPenalty - skillBenefit;

  avg = clamp(avg, 4, 60);

  const varianceFactor = 1.25 + Math.max(0, imb - 50)/200 + Math.max(0, prep - 60)/300;
  const p95 = clamp(avg * varianceFactor, avg+2, 75);

  const label = avg <= 10 ? "fast" : (avg <= 18 ? "okay" : "slow");

  return { avgMinutes: avg, p95Minutes: p95, label, baseMinutes: base };
}

export function applySafePriceTweaks(state, venueId){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return { changed:0, changes:[] };

  const eng = menuEngineering(v.menuItems || []);
  if(!eng.rows.length) return { changed:0, changes:[] };

  // pick up to 6 plowhorses (popular but low margin) and raise price modestly
  const plows = eng.rows
    .filter(r=>r.quad==="plowhorse")
    .sort((a,b)=> (b.pop - a.pop) - (a.cm - b.cm));

  const changes = [];
  for(const r of plows){
    if(changes.length >= 6) break;
    const it = (v.menuItems||[]).find(x=>x.id===r.id);
    if(!it) continue;

    const old = Number(it.price||0);
    const cost = Number(it.cost||0);

    // raise by 5% capped to $2, min +0.5
    let up = Math.max(0.5, Math.min(2.0, old*0.05));
    let next = roundTo(old + up, 0.5);

    // avoid absurd food cost ratios
    if(next <= cost*1.5) next = roundTo(cost*1.6, 0.5);

    if(next > old){
      it.price = next;
      changes.push({ item: it.name || "Untitled", from: old, to: next });
    }
  }

  if(changes.length){
    state.logs.push({ week: state.week, type:"menu", msg:`Applied safe price tweaks (${changes.length} items).` });
  }

  return { changed: changes.length, changes };
}
