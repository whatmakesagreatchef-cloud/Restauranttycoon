import { clamp, randInt, mulberry32, pick } from "./rng.js";
import { computeMenuMetrics } from "./system_menu.js";
import { estimateTicketTimes } from "./system_menu.js";

export const CUSTOMER_SEGMENTS = [
  { id:"locals", name:"Locals", key:"locals" },
  { id:"families", name:"Families", key:"families" },
  { id:"foodies", name:"Foodies", key:"foodies" },
  { id:"tourists", name:"Tourists", key:"tourists" },
  { id:"office", name:"Office crowd", key:"office" },
  { id:"students", name:"Students", key:"students" },
];

export function ensureCustomerData(venue){
  if(!venue.customer){
    venue.customer = {
      regulars: clamp(Number(venue.regulars||0), 0, 200),
      segments: seedSegments(venue),
      inbox: [],
      reviews: [],
      lastWeekProcessed: -1
    };
  }else{
    if(!venue.customer.segments) venue.customer.segments = seedSegments(venue);
    if(!venue.customer.inbox) venue.customer.inbox = [];
    if(!venue.customer.reviews) venue.customer.reviews = [];
    if(venue.customer.regulars == null) venue.customer.regulars = clamp(Number(venue.regulars||0), 0, 200);
  }
  return venue.customer;
}

function seedSegments(venue){
  // Basic believable mix based on style
  const style = venue.menuStyle || "a_la_carte";
  const base = { locals:38, families:16, foodies:14, tourists:12, office:12, students:8 };

  if(style==="cafe"){ base.office += 8; base.students += 6; base.foodies -= 4; base.tourists -= 2; }
  if(style==="pub"){ base.families += 6; base.locals += 8; base.foodies -= 6; base.tourists -= 2; }
  if(style==="truck"){ base.students += 8; base.office += 6; base.families -= 4; base.foodies -= 2; }
  if(style==="tasting"){ base.foodies += 16; base.tourists += 8; base.students -= 6; base.office -= 6; }
  if(style==="winery"){ base.tourists += 12; base.foodies += 8; base.office -= 6; }
  if(style==="hotel"){ base.tourists += 10; base.locals += 2; base.students -= 4; }

  // normalize
  const keys = Object.keys(base);
  const sum = keys.reduce((a,k)=>a+base[k],0);
  const out = {};
  for(const k of keys){
    out[k] = Math.round(base[k] / sum * 100);
  }
  // adjust to 100
  let tot = Object.values(out).reduce((a,b)=>a+b,0);
  while(tot>100){ out.locals -= 1; tot--; }
  while(tot<100){ out.locals += 1; tot++; }

  return out;
}

export function processCustomerWeek(state, venue, context){
  // context: { covers, sat, foodScore, speedScore }
  const c = ensureCustomerData(venue);
  if(c.lastWeekProcessed === state.week) return;

  const seed = (state.seed + state.week*1337 + hashStr(venue.name)) >>> 0;
  const rng = mulberry32(seed);

  const sat = clamp(context?.sat ?? 60, 0, 100);
  const food = clamp(context?.foodScore ?? 60, 0, 100);
  const speed = clamp(context?.speedScore ?? 60, 0, 100);
  const covers = clamp(Number(context?.covers ?? 120), 0, 9999);

  const m = computeMenuMetrics(venue);
  const tt = estimateTicketTimes(venue);

  // Regulars update: combine sat + loyalty promo effect already applied elsewhere to venue.regulars,
  // but we also keep customer.regulars in sync.
  c.regulars = clamp(Number(venue.regulars||0), 0, 200);

  // Inbox volume scales with covers and bad experiences
  const baseMsgs = Math.max(0, Math.round(covers/120));
  const badFactor = clamp((70 - sat)/30 + (65 - speed)/50 + (60 - food)/50, 0, 2.0);
  const msgCount = clamp(Math.round(baseMsgs + badFactor * (1 + rng()*2)), 0, 6);

  for(let i=0;i<msgCount;i++){
    c.inbox.unshift(generateMessage(rng, venue, { sat, food, speed, tt, m }));
  }
  c.inbox = c.inbox.slice(0, 30);

  // Reviews: a few per week
  const revBase = Math.round(covers/150);
  const revCount = clamp(Math.round(revBase + (rng()<0.35?1:0) + badFactor), 0, 5);
  for(let i=0;i<revCount;i++){
    const rv = generateReview(rng, venue, { sat, food, speed, tt, m });
    rv.week = state.week;
    rv.createdAtWeek = state.week;
    c.reviews.unshift(rv);
  }
  c.reviews = c.reviews.slice(0, 40);

  c.lastWeekProcessed = state.week;
}

export function respondToMessage(state, venueId, msgId, action){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return { ok:false };
  const c = ensureCustomerData(v);
  const msg = c.inbox.find(x=>x.id===msgId);
  if(!msg || msg.resolved) return { ok:false };

  // action: "apology", "comp", "ignore"
  msg.resolved = true;
  msg.resolution = action;

  if(action==="apology"){
    v.localReputation = clamp((v.localReputation||50) + 1, 0, 100);
    state.logs.push({ week: state.week, type:"cust", msg:`Replied to customer at ${v.name} with apology.` });
  }
  if(action==="comp"){
    // comps cost cash but soften rep damage
    const cost = clamp(Number(msg.compValue||30), 10, 120);
    if(state.cash >= cost){
      state.cash -= cost;
      v.localReputation = clamp((v.localReputation||50) + 2, 0, 100);
      v.prestige = clamp((v.prestige||0) + 0.2, 0, 100);
      state.logs.push({ week: state.week, type:"cust", msg:`Issued comp at ${v.name} (-${cost}).` });
    }else{
      // fallback
      v.localReputation = clamp((v.localReputation||50) + 1, 0, 100);
      state.logs.push({ week: state.week, type:"cust", msg:`Wanted to comp at ${v.name} but cash low. Apology sent.` });
      msg.resolution = "apology";
    }
  }
  if(action==="ignore"){
    v.localReputation = clamp((v.localReputation||50) - 1, 0, 100);
    state.logs.push({ week: state.week, type:"cust", msg:`Ignored complaint at ${v.name}. Reputation down.` });
  }

  return { ok:true };
}

function generateMessage(rng, venue, x){
  const problems = [];
  if(x.speed < 58 || x.tt.label==="slow") problems.push("slow");
  if(x.food < 60) problems.push("food");
  if(x.m.foodCostPct > 0.38 && (venue.pricePosition||0) > 8) problems.push("value");
  if(x.m.stationImbalance > 70) problems.push("bottleneck");
  if(x.m.prepLoad > 72) problems.push("complex");

  const tone = x.sat > 75 ? "nice" : (x.sat > 60 ? "neutral" : "angry");
  const p = problems.length ? pick(rng, problems) : "other";

  const templates = {
    slow: [
      "We waited ages for mains. Kitchen was clearly backed up.",
      "Loved the vibe but ticket times were rough — felt forgotten.",
      "Took too long between courses. Please fix the pacing."
    ],
    food: [
      "Dish wasn't as described and tasted flat.",
      "Seasoning was off and the sauce split.",
      "Food felt rushed — not up to standard."
    ],
    value: [
      "Price felt high for the portion size.",
      "Great idea but not worth the spend right now.",
      "Can you justify the price? Felt expensive."
    ],
    bottleneck: [
      "Everything seemed stuck at the grill station.",
      "Fryer backlog was obvious — lots of waiting.",
      "Service stalled when the kitchen hit peak."
    ],
    complex: [
      "Menu seems over-complicated. Too many elements, slower service.",
      "Maybe simplify the dishes? Felt like the team struggled.",
      "Great ambition, but execution needs streamlining."
    ],
    other: [
      "Had a good night overall — just wanted to share feedback.",
      "We’ll be back, but the team looked stressed.",
      "Nice service — keep building on it."
    ]
  };

  const niceOpen = ["Hey team,", "Hi there,", "Hello,"];
  const angryOpen = ["Not happy.", "Disappointed.", "This wasn’t acceptable."];
  const neutralOpen = ["Just some feedback.", "Quick note.", "FYI."];

  const open = tone==="nice" ? pick(rng, niceOpen) : (tone==="angry" ? pick(rng, angryOpen) : pick(rng, neutralOpen));
  const body = pick(rng, templates[p]);
  const compValue = (p==="slow" || p==="food") ? (20 + randInt(rng,0,40)) : (15 + randInt(rng,0,25));

  return {
    id: "cm_" + Math.floor(rng()*1e12),
    week: null,
    venueId: venue.id,
    type: "message",
    topic: p,
    tone,
    text: `${open} ${body}`,
    compValue,
    resolved: false,
    resolution: null
  };
}

function generateReview(rng, venue, x){
  // Stars driven by sat/food/speed
  const score = clamp((x.food*0.45 + x.speed*0.25 + x.sat*0.30), 0, 100);
  let stars = clamp(Math.round(score/20), 1, 5);

  const seg = pick(rng, Object.keys(ensureCustomerData(venue).segments));
  const segName = ({
    locals:"Local",
    families:"Family",
    foodies:"Foodie",
    tourists:"Tourist",
    office:"Office",
    students:"Student"
  })[seg] || "Guest";

  const snippets = [];
  if(stars>=4) snippets.push(pick(rng, [
    "Great flavours and a solid vibe.",
    "Would happily come back.",
    "Service felt warm and confident."
  ]));
  if(stars<=2) snippets.push(pick(rng, [
    "Not worth the wait.",
    "Kitchen seemed overwhelmed.",
    "Left disappointed."
  ]));
  if(x.tt.label==="slow") snippets.push("Ticket times were slow.");
  if(x.m.foodCostPct>0.38 && (venue.pricePosition||0)>8) snippets.push("Felt pricey for the value.");
  if(x.m.prepLoad>72) snippets.push("Ambitious menu — execution needs streamlining.");

  if(!snippets.length) snippets.push(pick(rng, ["Good night overall.", "Decent experience.", "Solid spot."]));

  return {
    id: "rv_" + Math.floor(rng()*1e12),
    week: null,
    venueId: venue.id,
    stars,
    text: `${segName} review: ${snippets.join(" ")}`,
    createdAtWeek: null
  };
}

function hashStr(str){
  let h = 2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h>>>0;
}
