import { clamp, randInt, mulberry32 } from "./rng.js";

export const PROMO_TYPES = [
  { id:"social", name:"Social campaign", weeks:3, cost:800, demandBoost:0.04, footTraffic:+6, repBoost:0 },
  { id:"event", name:"Local event night", weeks:2, cost:1200, demandBoost:0.06, footTraffic:+10, repBoost:+2 },
  { id:"influencer", name:"Influencer visit", weeks:1, cost:600, demandBoost:0.05, footTraffic:+8, repBoost:+1 },
  { id:"loyalty", name:"Loyalty program", weeks:6, cost:300, demandBoost:0.02, footTraffic:+4, repBoost:0, regularsBoost:+6 },
  { id:"critic", name:"Critic invite", weeks:1, cost:1500, demandBoost:0.00, footTraffic:+0, repBoost:0, prestigeRoll:true },
];

export function ensurePromos(venue){
  if(!venue.promos) venue.promos = [];
  return venue.promos;
}

export function promoById(id){ return PROMO_TYPES.find(p=>p.id===id); }

export function addPromo(state, venueId, promoId){
  const v = state.venues.find(x=>x.id===venueId);
  const p = promoById(promoId);
  if(!v || !p) return { ok:false, reason:"missing" };
  ensurePromos(v);

  if(state.cash < p.cost) return { ok:false, reason:"cash" };

  state.cash -= p.cost;

  const inst = {
    id: "pr_" + Date.now() + "_" + Math.floor(Math.random()*1e6),
    promoId: p.id,
    name: p.name,
    weeksLeft: p.weeks,
    demandBoost: p.demandBoost || 0,
    footTraffic: p.footTraffic || 0,
    repBoost: p.repBoost || 0,
    regularsBoost: p.regularsBoost || 0,
    prestigeRoll: !!p.prestigeRoll,
    startedWeek: state.week
  };
  v.promos.push(inst);

  state.logs.push({ week: state.week, type:"ops", msg:`Started promo at ${v.name}: ${p.name} (-${p.cost})` });
  return { ok:true, inst };
}

export function activePromoEffects(state, venue){
  const promos = ensurePromos(venue);
  let demandBoost = 0;
  let footTraffic = 0;
  let repBoost = 0;
  let regularsBoost = 0;
  let prestigeRoll = false;

  for(const pr of promos){
    if((pr.weeksLeft||0) <= 0) continue;
    demandBoost += (pr.demandBoost||0);
    footTraffic += (pr.footTraffic||0);
    repBoost += (pr.repBoost||0);
    regularsBoost += (pr.regularsBoost||0);
    if(pr.prestigeRoll) prestigeRoll = true;
  }

  return { demandBoost, footTraffic, repBoost, regularsBoost, prestigeRoll };
}

export function tickPromos(state, venue, context){
  // context can include sat, foodScore, speedScore, etc.
  const promos = ensurePromos(venue);
  if(!promos.length) return;

  // Resolve critic outcome once on the week it runs
  for(const pr of promos){
    if(pr.promoId !== "critic") continue;
    if(pr._resolved) continue;
    if((pr.weeksLeft||0) <= 0) continue;

    const seed = (state.seed + state.week*999 + (venue.id||0)) >>> 0;
    const rng = mulberry32(seed);

    const sat = clamp(context?.sat ?? 60, 0, 100);
    const food = clamp(context?.foodScore ?? 60, 0, 100);
    const speed = clamp(context?.speedScore ?? 60, 0, 100);

    // Critic is risky: needs strong food + decent speed.
    const baseChance = clamp((food-55)/70 + (sat-55)/90 - (60-speed)/120, -0.15, 0.85);
    const roll = rng();

    if(roll < baseChance){
      venue.prestige = clamp((venue.prestige||0) + 2 + randInt(rng,0,2), 0, 100);
      venue.localReputation = clamp((venue.localReputation||50) + 3 + randInt(rng,0,2), 0, 100);
      state.logs.push({ week: state.week, type:"ops", msg:`Critic loved ${venue.name}. Prestige up.` });
    }else{
      venue.localReputation = clamp((venue.localReputation||50) - 2 - randInt(rng,0,2), 0, 100);
      state.logs.push({ week: state.week, type:"ops", msg:`Critic panned ${venue.name}. Reputation hit.` });
    }

    pr._resolved = true;
  }

  // Decrement weeks left at end of week
  for(const pr of promos){
    pr.weeksLeft = (pr.weeksLeft||0) - 1;
  }
  // Remove expired promos
  venue.promos = promos.filter(pr => (pr.weeksLeft||0) > 0);
}

export function applyMenuPopularityDecay(venue){
  const items = (venue.menuItems||[]).filter(x=>x);
  for(const it of items){
    // track price changes for elasticity
    const last = (it.lastPrice == null) ? Number(it.price||0) : Number(it.lastPrice||0);
    const now  = Number(it.price||0);
    if(it.lastPrice == null) it.lastPrice = now;

    const deltaPct = last > 0 ? (now-last)/last : 0;

    // price elasticity nudge
    if(deltaPct > 0.06){
      it.popularity = clamp(Number(it.popularity||3) - 0.3, 1, 5);
    }else if(deltaPct < -0.06){
      it.popularity = clamp(Number(it.popularity||3) + 0.2, 1, 5);
    }

    it.lastPrice = now;

    // drift popularity gently back toward 3 over time (unless you actively feature/push)
    const pop = clamp(Number(it.popularity ?? 3), 1, 5);
    const drift = (3 - pop) * 0.08;
    it.popularity = clamp(pop + drift, 1, 5);
  }
}
