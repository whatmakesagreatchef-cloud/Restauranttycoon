import { clamp, randInt } from "./rng.js";
import { EQUIPMENT_LIBRARY, ENERGY, RENOVATIONS } from "./data_facilities.js";

export function ensureFacilitiesState(state){
  if(!state.facilityLog) state.facilityLog = [];
  for(const v of (state.venues||[])){
    ensureVenueFacilities(v);
  }
  return state;
}

export function ensureVenueFacilities(v){
  if(!v.facilities){
    v.facilities = {
      condition: 75,           // 0..100
      maintenanceLevel: 1.0,   // 0.6..1.5 (spend multiplier)
      downtimeWeeks: 0,        // forced closure from breakdown/reno
      activeIssues: [],        // { id, eqId, weeksLeft, speedHit, foodHit, complianceHit }
      equipment: {},           // eqId -> { level:1, installed:true }
      renovation: null,        // { id, weeksLeft }
    };
  }
  if(v.facilities.condition==null) v.facilities.condition = 75;
  if(v.facilities.maintenanceLevel==null) v.facilities.maintenanceLevel = 1.0;
  if(v.facilities.downtimeWeeks==null) v.facilities.downtimeWeeks = 0;
  if(!Array.isArray(v.facilities.activeIssues)) v.facilities.activeIssues = [];
  if(!v.facilities.equipment) v.facilities.equipment = {};
  if(v.facilities.renovation===undefined) v.facilities.renovation = null;

  // Ensure default equipment relevant to venue type
  for(const eq of EQUIPMENT_LIBRARY){
    if(v.facilities.equipment[eq.id] == null){
      // Not all venues need coffee machine
      const needsCoffee = (v.menuStyle==="cafe" || v.typeId==="cafe" || v.typeId==="hotel" || v.typeId==="winery");
      if(eq.id==="coffee" && !needsCoffee) continue;
      v.facilities.equipment[eq.id] = { level: 1, installed: true };
    }
  }

  return v.facilities;
}

export function equipmentList(v){
  ensureVenueFacilities(v);
  const list = [];
  for(const eq of EQUIPMENT_LIBRARY){
    const inst = v.facilities.equipment[eq.id];
    if(!inst || !inst.installed) continue;
    list.push({ ...eq, level: inst.level||1 });
  }
  return list;
}

export function setMaintenanceLevel(state, venueId, lvl){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return;
  ensureVenueFacilities(v);
  v.facilities.maintenanceLevel = clamp(Number(lvl||1.0), 0.6, 1.5);
}

export function scheduleRenovation(state, venueId, renoId){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return { ok:false };
  ensureVenueFacilities(v);

  if(v.facilities.renovation) return { ok:false };
  const r = RENOVATIONS.find(x=>x.id===renoId);
  if(!r) return { ok:false };

  if(state.cash < r.cost) return { ok:false, reason:"cash" };
  state.cash -= r.cost;

  v.facilities.renovation = { id: renoId, weeksLeft: r.weeks };
  // renovation downtime (reduced service)
  v.facilities.downtimeWeeks = Math.max(v.facilities.downtimeWeeks||0, r.weeks);

  state.logs.push({ week: state.week, type:"reno", msg:`${v.name}: started renovation (${r.name})` });
  return { ok:true };
}

export function cancelRenovation(state, venueId){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return { ok:false };
  ensureVenueFacilities(v);
  if(!v.facilities.renovation) return { ok:false };
  // no refunds for simplicity
  v.facilities.renovation = null;
  state.logs.push({ week: state.week, type:"reno", msg:`${v.name}: renovation cancelled.` });
  return { ok:true };
}

export function computeFacilityEffects(state, v){
  ensureVenueFacilities(v);

  const f = v.facilities;
  const issues = f.activeIssues || [];

  // Condition influences energy and breakdown chance
  const condition = clamp(f.condition||75, 0, 100);
  const condPenalty = condition < 55 ? (55-condition)/55 : 0;

  const speedHit = issues.reduce((a,x)=>a+(x.speedHit||0),0);
  const foodHit  = issues.reduce((a,x)=>a+(x.foodHit||0),0);
  const complianceHit = issues.reduce((a,x)=>a+(x.complianceHit||0),0);

  // if in downtime, reduce capacity/availability heavily
  const isDown = (f.downtimeWeeks||0) > 0;
  const coverCapMult = isDown ? 0.35 : 1.0;

  return {
    isDown,
    coverCapMult,
    speedHit,
    foodHit,
    complianceHit,
    condPenalty
  };
}

export function tickFacilitiesWeek(state, v, rng, covers){
  ensureVenueFacilities(v);
  const f = v.facilities;

  // Maintenance spend
  const eqs = equipmentList(v);
  const baseMaint = eqs.reduce((a,e)=>a+(e.maintPerWeek||0),0);
  const maintSpend = baseMaint * (f.maintenanceLevel||1.0);
  if(state.cash >= maintSpend) state.cash -= maintSpend;
  else {
    // if broke, maintenance effectively drops
    f.maintenanceLevel = clamp((f.maintenanceLevel||1.0)*0.95, 0.6, 1.5);
  }

  // Condition change: degrades with use and improves with maintenance
  const use = clamp(Number(covers||0) / 120, 0, 2.0);
  const improve = 1.2 * (f.maintenanceLevel||1.0);
  const degrade = 1.4 + (1.2*use);
  f.condition = clamp((f.condition||75) + improve - degrade, 0, 100);

  // Renovation ticking
  let renoCompleted = null;
  if(f.renovation){
    f.renovation.weeksLeft -= 1;
    if(f.renovation.weeksLeft <= 0){
      renoCompleted = f.renovation.id;
      f.renovation = null;

      // Apply boosts
      const rr = RENOVATIONS.find(x=>x.id===renoCompleted);
      if(rr){
        v.localReputation = clamp((v.localReputation||50) + (rr.repBoost||0), 0, 100);
        // compliance also benefits
        if(v.compliance!=null) v.compliance = clamp(v.compliance + (rr.complianceBoost||0), 0, 100);
        // condition reset
        f.condition = clamp((f.condition||75) + 18, 0, 100);
      }

      state.logs.push({ week: state.week, type:"reno", msg:`${v.name}: renovation completed.` });
    }
  }

  // Downtime tick
  if(f.downtimeWeeks>0) f.downtimeWeeks -= 1;

  // Existing issues tick down
  for(const iss of f.activeIssues){
    iss.weeksLeft -= 1;
  }
  f.activeIssues = f.activeIssues.filter(x=>x.weeksLeft > 0);

  // Breakdown chance per equipment, reduced by maintenance & condition
  let newIssues = 0;
  for(const eq of eqs){
    const base = eq.breakdownBase||0.01;
    const maint = clamp(f.maintenanceLevel||1.0, 0.6, 1.5);
    const condition = clamp(f.condition||75, 0, 100);
    const condRisk = condition < 60 ? (60-condition)/120 : 0; // up to +0.5
    const maintRisk = maint < 1.0 ? (1.0-maint)*0.9 : -(maint-1.0)*0.35; // higher maint lowers
    const chance = clamp(base + condRisk + maintRisk, 0.002, 0.22);

    if(rng() < chance){
      // avoid duplicating same equipment issue already active
      if(f.activeIssues.find(x=>x.eqId===eq.id)) continue;
      const iss = {
        id: "iss_" + Date.now() + "_" + randInt(rng, 0, 999999),
        eqId: eq.id,
        weeksLeft: eq.downtimeWeeks||1,
        speedHit: eq.speedHit||0,
        foodHit: eq.foodHit||0,
        complianceHit: eq.id==="fridge" ? 3 : 0
      };
      f.activeIssues.push(iss);
      newIssues += 1;

      // Some issues cause downtime (soft closure)
      f.downtimeWeeks = Math.max(f.downtimeWeeks||0, 1);

      state.logs.push({ week: state.week, type:"facility", msg:`${v.name}: equipment failure (${eq.name}).` });
    }
  }

  // Energy costs (utilities)
  const condition = clamp(f.condition||75, 0, 100);
  const oldPenalty = condition < 55 ? (1 + ENERGY.penaltyWhenOld) : 1.0;
  const energy = (ENERGY.basePerWeek + (ENERGY.basePerCover * (covers||0))) * oldPenalty;
  if(state.cash >= energy) state.cash -= energy;
  else state.cash = Math.max(0, state.cash - energy); // can go to 0, no overdraft

  return {
    maintSpend: Math.round(maintSpend),
    energy: Math.round(energy),
    newIssues,
    condition: Math.round(f.condition||0),
    downtimeWeeks: Math.round(f.downtimeWeeks||0)
  };
}

export function money(n){
  const x = Math.round(Number(n||0));
  return "$" + x.toLocaleString();
}
