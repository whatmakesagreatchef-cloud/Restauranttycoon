import { clamp, mulberry32, pick, randInt } from "./rng.js";
import { computeMenuMetrics } from "./system_menu.js";
import { ensureRoster, rosterWeeklyCost, recommendedPerShift } from "./system_staff.js";

export function ensureStaffEventState(venue){
  if(!venue.staffIssues) venue.staffIssues = [];
  if(!venue.staffPolicy) venue.staffPolicy = { overtime:"pay", raises:"tight", culture:"balanced" }; // pay|timeoff ; tight|normal|generous ; balanced|strict|loose
  if(!venue.staffKpis) venue.staffKpis = { turnover:0, overtime:0, trainingSpend:0 };
  return venue;
}

export function tickStaffIssues(state, venue, context){
  ensureStaffEventState(venue);

  // unresolved issues cause drip penalties (small)
  const open = venue.staffIssues.filter(x=>!x.resolved);
  if(open.length){
    venue.morale = clamp((venue.morale||70) - open.length*0.6, 0, 100);
    venue.burnout = clamp((venue.burnout||12) + open.length*0.4, 0, 100);
  }

  const seed = (state.seed + state.week*911 + hashStr(venue.id||venue.name||"v")) >>> 0;
  const rng = mulberry32(seed);

  // spawn cap: 2 open issues max
  if(open.length >= 2) return;

  // need some staff hired before drama; else very low chance
  const staffed = !!(venue.staff && (venue.staff.gm || venue.staff.chef || venue.staff.foh));
  const baseChance = staffed ? 0.22 : 0.05;

  // pressure raises probability
  const b = clamp(Number(venue.burnout||0), 0, 100);
  const m = clamp(Number(venue.morale||0), 0, 100);
  const pressure = clamp((b-35)/65 + (55-m)/65, 0, 1.2);
  const chance = clamp(baseChance + pressure*0.18, 0, 0.55);

  if(rng() > chance) return;

  const menu = computeMenuMetrics(venue);
  const roster = ensureRoster(venue);
  const covers = clamp(Number(context?.covers||120), 0, 9999);
  const demand = clamp(Math.round((venue.capacity||40) * (0.60 + (venue.popularity||50)/200)), 10, 260);
  const rec = recommendedPerShift(venue, demand, menu);

  // choose event type
  const types = [];
  if(staffed) types.push("raise", "conflict");
  if(roster.enabled) types.push("overtime");
  if(b > 75) types.push("resignation");
  if(m < 45) types.push("culture");
  if(menu.prepLoad > 72) types.push("complexity");
  if(covers > 180) types.push("noshow");

  const type = pick(rng, types.length ? types : ["raise"]);

  const ev = buildEvent(rng, venue, type, { menu, roster, rec, covers });
  venue.staffIssues.unshift(ev);
  venue.staffIssues = venue.staffIssues.slice(0, 25);
}

export function resolveStaffIssue(state, venueId, issueId, action){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return { ok:false };
  ensureStaffEventState(v);

  const it = v.staffIssues.find(x=>x.id===issueId);
  if(!it || it.resolved) return { ok:false };

  const opt = it.options.find(o=>o.id===action);
  if(!opt) return { ok:false };

  // Apply effects
  if(opt.cost && state.cash >= opt.cost){
    state.cash -= opt.cost;
  }else if(opt.cost && state.cash < opt.cost){
    // if can't pay, downgrade to "delay" when available
    const delay = it.options.find(o=>o.id==="delay");
    if(delay){
      action = "delay";
      it.resolution = "delay";
      applyEffects(state, v, delay.effects);
    }
    it.resolved = true;
    state.logs.push({ week: state.week, type:"staff", msg:`Couldn't afford ${opt.label} at ${v.name}. Delayed instead.` });
    return { ok:true };
  }

  it.resolved = true;
  it.resolution = action;
  applyEffects(state, v, opt.effects);

  state.logs.push({ week: state.week, type:"staff", msg:`Staff issue resolved at ${v.name}: ${it.title} → ${opt.label}` });
  return { ok:true };
}

function applyEffects(state, v, e){
  if(!e) return;
  if(e.morale) v.morale = clamp((v.morale||70) + e.morale, 0, 100);
  if(e.burnout) v.burnout = clamp((v.burnout||12) + e.burnout, 0, 100);
  if(e.popularity) v.popularity = clamp((v.popularity||50) + e.popularity, 0, 100);
  if(e.rep){
    v.localReputation = clamp((v.localReputation||50) + e.rep, 0, 100);
    state.reputation = clamp((state.reputation||50) + e.rep*0.35, 0, 100);
  }
  if(e.turnover){
    v.staffKpis = v.staffKpis || { turnover:0, overtime:0, trainingSpend:0 };
    v.staffKpis.turnover += e.turnover;
  }
  if(e.overtime){
    v.staffKpis = v.staffKpis || { turnover:0, overtime:0, trainingSpend:0 };
    v.staffKpis.overtime += e.overtime;
  }
}

function buildEvent(rng, v, type, ctx){
  const id = "si_" + Math.floor(rng()*1e12);
  const b = clamp(Number(v.burnout||12), 0, 100);
  const m = clamp(Number(v.morale||70), 0, 100);

  const commonDelay = { id:"delay", label:"Delay (risk)", cost:0, effects:{ morale:-2, burnout:+2, rep:-1 } };

  if(type==="raise"){
    const cost = 450 + randInt(rng,0,650);
    return {
      id, type,
      title:"Pay rise request",
      body:"A key staff member is asking for a raise. They say workload has increased and other venues are paying more.",
      options:[
        { id:"approve", label:"Approve raise", cost, effects:{ morale:+5, burnout:-2, rep:+1 } },
        { id:"negotiate", label:"Negotiate + training", cost: Math.round(cost*0.65), effects:{ morale:+3, burnout:-1, rep:+1 } },
        commonDelay
      ]
    };
  }

  if(type==="overtime"){
    const extra = 300 + randInt(rng,0,550);
    const policy = (v.staffPolicy && v.staffPolicy.overtime) ? v.staffPolicy.overtime : "pay";
    const payoutLabel = policy==="timeoff" ? "Give time-in-lieu" : "Pay overtime";
    const payoutEffects = policy==="timeoff" ? { morale:+3, burnout:-3, overtime:+1 } : { morale:+2, burnout:-2, overtime:+2 };
    return {
      id, type,
      title:"Overtime creeping up",
      body:`The roster is running hot. Overtime is building and the team is getting tired. Recommended: add 1 kitchen + 1 FOH per shift, or change policy.`,
      options:[
        { id:"addcrew", label:"Add crew (costly)", cost: extra, effects:{ morale:+4, burnout:-4, rep:+1 } },
        { id:"payout", label: payoutLabel, cost: Math.round(extra*0.45), effects: payoutEffects },
        commonDelay
      ]
    };
  }

  if(type==="conflict"){
    return {
      id, type,
      title:"Kitchen/FOH conflict",
      body:"A clash between pass and FOH is affecting service. Tickets are being blamed on each other.",
      options:[
        { id:"mediate", label:"Mediate + reset standards", cost: 220, effects:{ morale:+3, burnout:-1, rep:+1 } },
        { id:"strict", label:"Go strict (warning)", cost: 0, effects:{ morale:-2, burnout:+1, rep:+1 } },
        commonDelay
      ]
    };
  }

  if(type==="resignation"){
    return {
      id, type,
      title:"Resignation risk",
      body:"A senior staff member is at breaking point and may walk. Burnout is too high.",
      options:[
        { id:"retention", label:"Retention package", cost: 900, effects:{ morale:+6, burnout:-6, rep:+1 } },
        { id:"hirefast", label:"Hire fast + simplify menu", cost: 650, effects:{ morale:+2, burnout:-4, rep:0, turnover:+1 } },
        { id:"letgo", label:"Let them go", cost: 0, effects:{ morale:-5, burnout:+3, rep:-2, turnover:+2 } }
      ]
    };
  }

  if(type==="culture"){
    return {
      id, type,
      title:"Culture wobble",
      body:"Staff morale is dipping. You’re hearing ‘we’re just numbers’ vibes. It will spill into reviews if ignored.",
      options:[
        { id:"teammeal", label:"Team meal + check-in", cost: 180, effects:{ morale:+4, burnout:-1, rep:+1 } },
        { id:"rota", label:"Rework roster (more balanced)", cost: 0, effects:{ morale:+2, burnout:-2 } },
        commonDelay
      ]
    };
  }

  if(type==="complexity"){
    return {
      id, type,
      title:"Menu too complex",
      body:"The kitchen says the menu is pushing prep too far. Errors are creeping in.",
      options:[
        { id:"simplify", label:"Cut 2 items (simplify)", cost: 0, effects:{ morale:+2, burnout:-3, rep:+1, popularity:-1 } },
        { id:"prephelp", label:"Add prep help", cost: 420, effects:{ morale:+3, burnout:-4, rep:+1 } },
        commonDelay
      ]
    };
  }

  if(type==="noshow"){
    return {
      id, type,
      title:"No-show shift",
      body:"A casual no-showed a busy shift. The team scrambled. Customers noticed.",
      options:[
        { id:"cover", label:"Pay cover shift bonus", cost: 260, effects:{ morale:+2, burnout:-1, rep:+1 } },
        { id:"discipline", label:"Discipline + tighten roster", cost: 0, effects:{ morale:-1, burnout:+1, rep:+0 } },
        commonDelay
      ]
    };
  }

  // fallback
  return {
    id, type,
    title:"Staff issue",
    body:"A staff issue needs attention.",
    options:[ commonDelay, { id:"resolve", label:"Handle it", cost: 200, effects:{ morale:+1, burnout:-1 } } ]
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
