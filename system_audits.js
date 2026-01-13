import { clamp, randInt } from "./rng.js";
import { INSPECTION_GRADES } from "./data_audits.js";
import { brandStandards, ensureBrands, brandById } from "./system_brands.js";

export function ensureAuditState(state){
  if(!state.auditLog) state.auditLog = [];
  if(state.auditLog.length > 80) state.auditLog = state.auditLog.slice(0, 80);
  return state;
}

export function venueCompliance(state, v){
  ensureBrands(state);

  const standards = v.brandId ? brandStandards(state, v.brandId) : 50;
  const b = v.brandId ? brandById(state, v.brandId) : null;
  const sop = b && b.playbook ? Number(b.playbook.sop ?? 50) : 50;
  const training = b && b.playbook ? Number(b.playbook.training ?? 50) : 50;

  const clean = Number(v.cleanliness ?? 70);
  const burnout = Number(v.staffPulse?.burnout ?? 25);

  const stdBoost = clamp((standards - 50) * 0.08, -6, 6);

  const comp = 0.36*clean + 0.22*training + 0.22*sop + 0.18*(100 - burnout) + stdBoost;
  return clamp(comp, 0, 100);
}

export function inspectionRisk(state, v){
  const c = venueCompliance(state, v);
  const clean = Number(v.cleanliness ?? 70);

  let p = 0.03
    + clamp((60 - c)/1000, -0.01, 0.06)
    + clamp((70 - clean)/1200, -0.01, 0.05);

  const pop = Number(v.popularity ?? 50);
  p += clamp((pop - 70)/4000, 0, 0.03);

  return clamp(p, 0.01, 0.12);
}

export function isClosed(v){
  return (v.closureWeeks ?? 0) > 0;
}

export function tickAudits(state, v, rng, ctx){
  // ctx: { week, sales, foodScore, speedScore }
  ensureAuditState(state);

  // Update compliance snapshot
  const c = venueCompliance(state, v);
  v.compliance = c;
  if(!v.auditHistory) v.auditHistory = [];

  // Health inspection
  const p = inspectionRisk(state, v);
  if(rng() < p){
    const score = clamp(c + randInt(rng, -8, 8), 0, 100);
    const row = INSPECTION_GRADES.find(g=> score >= g.min) || INSPECTION_GRADES[INSPECTION_GRADES.length-1];

    const fine = Math.max(0, (ctx.sales||0) * row.finePct);
    state.cash -= fine;

    v.localReputation = clamp((v.localReputation||50) + row.repDelta, 0, 100);

    let closedWeeks = 0;
    if(row.closureWeeks > 0){
      v.closureWeeks = Math.max(v.closureWeeks||0, row.closureWeeks);
      closedWeeks = row.closureWeeks;
    }

    const msg = `${v.name}: Health inspection ${row.grade} (score ${Math.round(score)}). Fine ${fine>0?("$"+Math.round(fine)):"$0"}${closedWeeks?` • CLOSED ${closedWeeks}w`:""}.`;
    state.auditLog.unshift({ week: ctx.week, type:"inspection", msg });
    v.auditHistory.unshift({ week: ctx.week, type:"inspection", grade: row.grade, score: Math.round(score), fine: Math.round(fine), closureWeeks: closedWeeks });

    return { inspected:true, grade:row.grade, fine, closed: closedWeeks>0 };
  }

  // Mystery diner (reputation swing)
  const mdP = clamp(0.02 + (Number(v.popularity||50)/5000), 0.01, 0.08);
  if(rng() < mdP){
    const food = clamp(Number(ctx.foodScore||70) + randInt(rng,-6,6), 0, 100);
    const speed = clamp(Number(ctx.speedScore||70) + randInt(rng,-6,6), 0, 100);
    const overall = clamp(0.6*food + 0.4*speed, 0, 100);
    const repDelta = clamp((overall - 70) * 0.10, -5, 5);

    v.localReputation = clamp((v.localReputation||50) + repDelta, 0, 100);

    const msg = `${v.name}: Mystery diner ${repDelta>=0?"+":""}${repDelta.toFixed(1)} rep (overall ${Math.round(overall)}).`;
    state.auditLog.unshift({ week: ctx.week, type:"mystery", msg });
    v.auditHistory.unshift({ week: ctx.week, type:"mystery", score: Math.round(overall), repDelta: Number(repDelta.toFixed(1)) });

    return { mystery:true, repDelta };
  }

  return { inspected:false, mystery:false };
}

export function finalizeClosures(state, closedVenueIds){
  // Decrement only venues that were already closed during this simulated week.
  // New closures triggered this week should start next week.
  const set = closedVenueIds ? new Set(closedVenueIds) : null;
  for(const v of (state.venues||[])){
    if(v.closureWeeks == null) v.closureWeeks = 0;
    if(v.closureWeeks > 0){
      if(!set || set.has(v.id)) v.closureWeeks = Math.max(0, v.closureWeeks - 1);
    }
  }
}
