import { mulberry32, randInt, pick, clamp, hashStrToSeed } from "./rng.js";
import { WORLD } from "./data_world.js";
import { STAFF_ROLES, FIRST_NAMES, LAST_NAMES, TRAITS, HOURLY_ROLES, TRAINING_OPTIONS } from "./data_staff.js";

function cityById(id){ return WORLD.cities.find(c=>c.id===id) || WORLD.cities[0]; }

function makeName(rng){
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
}

function pickTraits(rng, count){
  const pool = [...TRAITS];
  const out = [];
  while(out.length < count && pool.length){
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i,1)[0]);
  }
  return out;
}

function baseWageFor(roleId, city){
  // realistic-ish weekly wages (AUD-like scale). We'll tune later.
  const idx = city.rentIndex;
  if(roleId === "gm")  return Math.round(2800 * idx);
  if(roleId === "chef")return Math.round(2600 * idx);
  if(roleId === "foh") return Math.round(2000 * idx);
  return Math.round(2200 * idx);
}

function genSkills(rng, roleId, city){
  const t = city.talentIndex;

  if(roleId === "gm"){
    const ops = clamp(48 + randInt(rng,-10,28) + (t-1)*20, 10, 95);
    const finance = clamp(44 + randInt(rng,-12,26) + (t-1)*16, 10, 92);
    const people = clamp(46 + randInt(rng,-14,28) + (t-1)*14, 10, 95);
    const standards = clamp(46 + randInt(rng,-12,30) + (t-1)*14, 10, 95);
    return { ops, finance, people, standards };
  }

  if(roleId === "chef"){
    const culinary = clamp(52 + randInt(rng,-12,30) + (t-1)*24, 10, 98);
    const consistency = clamp(48 + randInt(rng,-16,30) + (t-1)*20, 10, 96);
    const cost = clamp(44 + randInt(rng,-14,26) + (t-1)*16, 10, 92);
    const leadership = clamp(44 + randInt(rng,-14,28) + (t-1)*16, 10, 94);
    return { culinary, consistency, cost, leadership };
  }

  // FOH
  const service = clamp(48 + randInt(rng,-16,30) + (t-1)*18, 10, 96);
  const pace = clamp(46 + randInt(rng,-18,32) + (t-1)*16, 10, 96);
  const recovery = clamp(44 + randInt(rng,-18,30) + (t-1)*16, 10, 94);
  return { service, pace, recovery };
}

function roleScore(roleId, skills){
  if(roleId === "gm") return (skills.ops*0.35 + skills.finance*0.20 + skills.people*0.25 + skills.standards*0.20);
  if(roleId === "chef") return (skills.culinary*0.40 + skills.consistency*0.25 + skills.cost*0.20 + skills.leadership*0.15);
  return (skills.service*0.40 + skills.pace*0.35 + skills.recovery*0.25);
}

export function generateCandidates(state, venue){
  const city = cityById(venue.cityId || state.homeCityId);
  const seed = (state.seed ^ hashStrToSeed(venue.id || "v") ^ (state.week*99991)) >>> 0;
  const rng = mulberry32(seed);

  const out = [];
  for(const role of STAFF_ROLES){
    const count = 3;
    for(let i=0;i<count;i++){
      const skills = genSkills(rng, role.id, city);
      const score = roleScore(role.id, skills);

      const traitCount = rng() < 0.60 ? 1 : 2;
      const traits = pickTraits(rng, traitCount);

      const base = baseWageFor(role.id, city);
      const wage = Math.round(base * (0.85 + score/220) * (0.95 + (rng()*0.10)));

      out.push({
        id: `${role.id}_${state.week}_${i}_${Math.floor(rng()*1e9)}`,
        roleId: role.id,
        roleName: role.name,
        name: makeName(rng),
        wageWeekly: clamp(wage, 1200, 6500),
        skills,
        traits: traits.map(t=>({ id:t.id, name:t.name, notes:t.notes, mod:t.mod })),
        score: Math.round(score),
      });
    }
  }
  return out;
}

export function hireCandidate(state, venueId, candidate){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return;

  v.staff = v.staff || { gm:null, chef:null, foh:null };
  v.delegation = v.delegation || { ops:false, menu:false, foh:false };

  const hiringFee = 500;
  state.cash -= hiringFee;

  v.staff[candidate.roleId] = {
    roleId: candidate.roleId,
    roleName: candidate.roleName,
    name: candidate.name,
    wageWeekly: candidate.wageWeekly,
    skills: candidate.skills,
    traits: candidate.traits
  };

  // default delegation
  if(candidate.roleId === "gm") v.delegation.ops = true;
  if(candidate.roleId === "chef") v.delegation.menu = true;
  if(candidate.roleId === "foh") v.delegation.foh = true;

  state.logs.push({ week: state.week, type:"staff", msg:`Hired ${candidate.roleName} at ${v.name}: ${candidate.name} (${candidate.wageWeekly.toLocaleString()}/wk)` });
}

export function fireRole(state, venueId, roleId){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v || !v.staff || !v.staff[roleId]) return;

  const wage = v.staff[roleId].wageWeekly || 0;
  const severance = Math.round(wage * 0.5); // light penalty
  state.cash -= severance;

  const name = v.staff[roleId].name;
  v.staff[roleId] = null;

  if(v.delegation){
    if(roleId === "gm") v.delegation.ops = false;
    if(roleId === "chef") v.delegation.menu = false;
    if(roleId === "foh") v.delegation.foh = false;
  }

  state.logs.push({ week: state.week, type:"staff", msg:`Fired ${roleId.toUpperCase()} at ${v.name}: ${name} (severance $${severance.toLocaleString()})` });
}

export function weeklyWages(venue){
const s = venue.staff;
  if(!s) return 0;
  let t = 0;
  if(s.gm) t += s.gm.wageWeekly || 0;
  if(s.chef) t += s.chef.wageWeekly || 0;
  if(s.foh) t += s.foh.wageWeekly || 0;
  return t + stationWages(venue) + rosterWeeklyCost(venue);

}

export function traitMods(venue){
  const mods = { waste:0, stress:0, complaints:0, regulars:0, speed:0, labor:0, clean:0, food:0, foodcost:0, value:0, spend:0, consistency:0 };
  const s = venue.staff;
  if(!s) return mods;
  const all = [s.gm, s.chef, s.foh].filter(Boolean);
  for(const p of all){
    for(const tr of (p.traits||[])){
      const m = tr.mod || {};
      for(const k of Object.keys(m)){
        mods[k] = (mods[k] || 0) + m[k];
      }
    }
  }
  return mods;
}

// Effective skill helpers
export function effectiveSkills(venue){
  const staff = venue.staff || { gm:null, chef:null, foh:null };

  const gm = staff.gm?.skills || null;
  const chef = staff.chef?.skills || null;
  const foh = staff.foh?.skills || null;

  const eff = {
    ops: venue.managerSkill || 45,
    finance: venue.procurementSkill || 35,
    people: venue.managerSkill || 45,
    standards: venue.cleanliness || 55,
    culinary: venue.chefSkill || 48,
    consistency: 55,
    cost: venue.procurementSkill || 35,
    pace: 50,
    service: 50,
    recovery: 50,
  };

  if(gm){
    eff.ops = clamp(eff.ops + gm.ops*0.55, 0, 100);
    eff.finance = clamp(eff.finance + gm.finance*0.45, 0, 100);
    eff.people = clamp(eff.people + gm.people*0.55, 0, 100);
    eff.standards = clamp(eff.standards + gm.standards*0.55, 0, 100);
  }

  if(chef){
    eff.culinary = clamp(eff.culinary + chef.culinary*0.60, 0, 100);
    eff.consistency = clamp(eff.consistency + chef.consistency*0.60, 0, 100);
    eff.cost = clamp(eff.cost + chef.cost*0.55, 0, 100);
  }

  if(foh){
    eff.service = clamp(eff.service + foh.service*0.60, 0, 100);
    eff.pace = clamp(eff.pace + foh.pace*0.60, 0, 100);
    eff.recovery = clamp(eff.recovery + foh.recovery*0.60, 0, 100);
  }


  // Training bonuses (small but meaningful)
  eff.ops = clamp(eff.ops + trainingBonus(venue,"ops"), 0, 100);
  eff.finance = clamp(eff.finance + trainingBonus(venue,"ops")*0.6 + trainingBonus(venue,"cost")*0.6, 0, 100);
  eff.people = clamp(eff.people + trainingBonus(venue,"ops")*0.6, 0, 100);

  eff.culinary = clamp(eff.culinary + trainingBonus(venue,"consistency")*0.7, 0, 100);
  eff.consistency = clamp(eff.consistency + trainingBonus(venue,"consistency"), 0, 100);
  eff.cost = clamp(eff.cost + trainingBonus(venue,"cost"), 0, 100);

  eff.pace = clamp(eff.pace + trainingBonus(venue,"pace"), 0, 100);
  eff.service = clamp(eff.service + trainingBonus(venue,"pace")*0.6, 0, 100);
  eff.recovery = clamp(eff.recovery + trainingBonus(venue,"pace")*0.6, 0, 100);

  eff.standards = clamp(eff.standards + trainingBonus(venue,"standards"), 0, 100);

  // Burnout reduces execution across the board
  const mult = burnoutMultiplier(venue);
  for(const k of Object.keys(eff)){
    eff[k] = clamp(eff[k] * mult, 0, 100);
  }

  return eff;
}


// ---- Station staffing (simple service model) ----
// Venue.stationStaff is an object like { pan:1, grill:0, fryer:1, cold:0, pastry:0, bar:0, coffee:0, prep:0 }
export const STATION_ROLE_WAGE = {
  line: 950,       // per head, per week (adjust later)
  prep: 850,
};

export function ensureStationStaff(venue){
  if(!venue.stationStaff){
    venue.stationStaff = { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };
  }else{
    const def = { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };
    for(const k of Object.keys(def)){
      if(venue.stationStaff[k] == null) venue.stationStaff[k] = 0;
    }
  }
  return venue.stationStaff;
}

export function stationWages(venue){
  const ss = ensureStationStaff(venue);
  let total = 0;
  total += Math.max(0, Number(ss.prep||0)) * STATION_ROLE_WAGE.prep;
  for(const k of ["cold","pan","grill","fryer","pastry","bar","coffee"]){
    total += Math.max(0, Number(ss[k]||0)) * STATION_ROLE_WAGE.line;
  }
  return total;
}

export function adjustStationStaff(state, venueId, key, delta){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return;
  ensureStationStaff(v);
  const next = Math.max(0, (v.stationStaff[key]||0) + delta);
  v.stationStaff[key] = next;
  state.logs.push({ week: state.week, type:"staff", msg:`Station staff at ${v.name}: ${key} = ${next}` });
}


// --- Staff v2: roster + training + burnout ---
export function ensureRoster(venue){
  if(!venue.roster){
    venue.roster = { enabled:false, openDays:6, shiftsPerDay:2, hoursPerShift:6, kitchenPerShift:3, fohPerShift:3, barPerShift:1, auto:true };
  }else{
    if(venue.roster.enabled==null) venue.roster.enabled = false;
    if(venue.roster.openDays==null) venue.roster.openDays = 6;
    if(venue.roster.shiftsPerDay==null) venue.roster.shiftsPerDay = 2;
    if(venue.roster.hoursPerShift==null) venue.roster.hoursPerShift = 6;
    if(venue.roster.kitchenPerShift==null) venue.roster.kitchenPerShift = 3;
    if(venue.roster.fohPerShift==null) venue.roster.fohPerShift = 3;
    if(venue.roster.barPerShift==null) venue.roster.barPerShift = 1;
    if(venue.roster.auto==null) venue.roster.auto = true;
  }
  return venue.roster;
}

export function rosterWeeklyCost(venue){
  const r = ensureRoster(venue);
  if(!r.enabled) return 0;
  const openDays = clamp(Number(r.openDays||0), 2, 7);
  const shifts = clamp(Number(r.shiftsPerDay||0), 1, 2);
  const hrs = clamp(Number(r.hoursPerShift||0), 4, 8);

  const kitchenW = HOURLY_ROLES.find(x=>x.id==="kitchen")?.wageHourly || 32;
  const fohW = HOURLY_ROLES.find(x=>x.id==="foh")?.wageHourly || 28;
  const barW = HOURLY_ROLES.find(x=>x.id==="bar")?.wageHourly || 30;

  const k = clamp(Number(r.kitchenPerShift||0), 0, 12);
  const f = clamp(Number(r.fohPerShift||0), 0, 14);
  const b = clamp(Number(r.barPerShift||0), 0, 10);

  const shiftCount = openDays * shifts;
  const cost = shiftCount * hrs * (k*kitchenW + f*fohW + b*barW);
  return Math.round(cost);
}

export function recommendedPerShift(venue, covers, menuMetrics){
  // Simple but believable staffing rule of thumb.
  const c = clamp(Number(covers||0), 0, 9999);
  const prep = clamp(Number(menuMetrics?.prepLoad ?? 55), 0, 100);
  const imb = clamp(Number(menuMetrics?.stationImbalance ?? 50), 0, 100);

  const kitchen = clamp(Math.round(2 + c/45 + (prep-55)/35 + (imb-50)/60), 2, 10);
  const foh = clamp(Math.round(2 + c/40), 2, 12);
  const bar = (venue.menuStyle==="pub" || venue.menuStyle==="casual" || venue.menuStyle==="hotel" || venue.menuStyle==="winery") ? clamp(Math.round(1 + c/120), 1, 6) : clamp(Math.round(c/220), 0, 4);

  return { kitchen, foh, bar };
}

export function applyTraining(venue, skillId){
  if(!venue.training) venue.training = { ops:0, consistency:0, cost:0, pace:0, standards:0 };
  venue.training[skillId] = clamp(Number(venue.training[skillId]||0) + 1, 0, 10);
}

export function trainingBonus(venue, key){
  const t = venue.training || {};
  const lvl = clamp(Number(t[key]||0), 0, 10);
  // diminishing returns
  return lvl * 1.1;
}

export function burnoutMultiplier(venue){
  const b = clamp(Number(venue.burnout||0), 0, 100);
  // 0 burnout => 1.00, 100 burnout => 0.70
  return clamp(1 - b/333, 0.70, 1.00);
}


export function trainingOptions(){
  return TRAINING_OPTIONS;
}
