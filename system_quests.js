import { clamp } from "./rng.js";
import { computeMenuMetrics } from "./system_menu.js";
import { estimateTicketTimes } from "./system_menu.js";

export const QUEST_POOL = [
  {
    id:"q_ticket",
    name:"Speed run",
    desc:"Get average ticket time under 15 minutes (any venue).",
    reward:{ cash:1200, rep:2, prestige:0 },
    check:(state)=> state.venues.some(v=> estimateTicketTimes(v).avgMinutes < 15),
  },
  {
    id:"q_foodcost",
    name:"Margin discipline",
    desc:"Get food cost under 34% (any venue with menu items).",
    reward:{ cash:1400, rep:1, prestige:0 },
    check:(state)=> state.venues.some(v=> { const m=computeMenuMetrics(v); return m.hasMenu && m.foodCostPct < 0.34; }),
  },
  {
    id:"q_regulars",
    name:"Build regulars",
    desc:"Reach 25 regulars at a venue.",
    reward:{ cash:900, rep:2, prestige:0 },
    check:(state)=> state.venues.some(v=> (v.regulars||0) >= 25),
  },
  {
    id:"q_promo",
    name:"Run loyalty",
    desc:"Run a loyalty promo for at least 6 weeks total (any venue).",
    reward:{ cash:1000, rep:1, prestige:0 },
    check:(state)=> (state._loyaltyWeeks||0) >= 6,
  },
  {
    id:"q_prestige",
    name:"Prestige climb",
    desc:"Hit prestige 10 at any venue.",
    reward:{ cash:1800, rep:0, prestige:1 },
    check:(state)=> state.venues.some(v=> (v.prestige||0) >= 10),
  }
];

export function ensureQuests(state){
  if(!state.quests){
    state.quests = { active:[], completed:[], lastRollWeek:-1 };
  }
  return state.quests;
}

export function rollNewQuests(state){
  const q = ensureQuests(state);
  if(q.lastRollWeek === state.week) return;
  q.lastRollWeek = state.week;

  // keep up to 3 active quests
  if(q.active.length >= 3) return;

  const have = new Set([...q.active.map(x=>x.id), ...q.completed.map(x=>x.id)]);
  const candidates = QUEST_POOL.filter(x=>!have.has(x.id));

  // add up to 1 new quest every 2 weeks
  if(state.week % 2 !== 0) return;
  if(!candidates.length) return;

  const pickOne = candidates[Math.floor(((state.seed + state.week*17) % 997) / 997 * candidates.length)];
  q.active.push({ id:pickOne.id, name:pickOne.name, desc:pickOne.desc, reward:pickOne.reward });
}

export function tickQuests(state){
  const q = ensureQuests(state);
  if(!q.active.length) return;

  const newly = [];
  for(const a of q.active){
    const def = QUEST_POOL.find(x=>x.id===a.id);
    if(def && def.check(state)){
      newly.push(a.id);
      award(state, a.reward);
      state.logs.push({ week: state.week, type:"quest", msg:`Quest completed: ${a.name} (+${a.reward.cash||0} cash)` });
      q.completed.push({ ...a, completedWeek: state.week });
    }
  }
  if(newly.length){
    q.active = q.active.filter(x=>!newly.includes(x.id));
  }
}

function award(state, r){
  if(r.cash) state.cash += r.cash;
  if(r.rep){
    // spread rep to all venues a bit
    for(const v of state.venues){
      v.localReputation = clamp((v.localReputation||50) + r.rep, 0, 100);
    }
  }
  if(r.prestige){
    for(const v of state.venues){
      v.prestige = clamp((v.prestige||0) + r.prestige, 0, 100);
    }
  }
}

// Track loyalty weeks
export function trackLoyaltyWeeks(state){
  let weeks = 0;
  for(const v of state.venues){
    for(const p of (v.promos||[])){
      if(p.promoId === "loyalty" && (p.weeksLeft||0) > 0) weeks += 1;
    }
  }
  state._loyaltyWeeks = (state._loyaltyWeeks||0) + (weeks>0 ? 1 : 0);
}
