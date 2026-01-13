import { clamp } from "./rng.js";

export function ensureBrands(state){
  if(state.brandMode == null) state.brandMode = null; // 'chain' | 'portfolio' | null
  if(state.chainBrandId == null) state.chainBrandId = null;
  if(state.chainBrandName == null) state.chainBrandName = "";
  if(!Array.isArray(state.brands)) state.brands = [];

  // Ensure playbook defaults for migrated saves
  for(const b of state.brands){
    if(!b.playbook) b.playbook = { sop:50, training:50, cadence:10 };
    if(b.playbook.sop==null) b.playbook.sop = 50;
    if(b.playbook.training==null) b.playbook.training = 50;
    if(b.playbook.cadence==null) b.playbook.cadence = 10;
  }

  // If chain mode selected but no chain brand exists, create it.
  if(state.brandMode === "chain" && !state.chainBrandId){
    const id = "b_" + Date.now() + "_" + Math.floor(Math.random()*1e6);
    state.chainBrandId = id;
    const name = (state.chainBrandName || "My Brand").trim().slice(0,40) || "My Brand";
    state.brands.push({
      id,
      name,
      standards:55,
      prestige:0,
      createdWeek: state.week||1,
      playbook:{ sop:55, training:55, cadence:8 }
    });
  }

  return state;
}

export function createBrand(state, name){
  ensureBrands(state);
  const id = "b_" + Date.now() + "_" + Math.floor(Math.random()*1e6);
  const nm = (name || "New Brand").trim().slice(0,40) || "New Brand";
  state.brands.push({
    id,
    name: nm,
    standards:50,
    prestige:0,
    createdWeek: state.week||1,
    playbook:{ sop:50, training:50, cadence:10 }
  });
  state.logs.push({ week: state.week, type:"brand", msg:`Created brand: ${nm}` });
  return id;
}

export function listBrands(state){
  ensureBrands(state);
  return state.brands;
}

export function brandById(state, id){
  ensureBrands(state);
  return state.brands.find(b=>b.id===id) || null;
}

export function setBrandMode(state, mode, brandName){
  ensureBrands(state);
  state.brandMode = mode;

  if(mode === "chain"){
    state.chainBrandName = (brandName || state.chainBrandName || "My Brand").trim().slice(0,40);
    if(!state.chainBrandId) ensureBrands(state);
  }else{
    state.chainBrandId = null;
  }

  state.logs.push({ week: state.week, type:"brand", msg:`Business model set: ${mode}` });
}

export function setBrandStandards(state, brandId, standards){
  const b = brandById(state, brandId);
  if(!b) return;
  b.standards = clamp(Number(standards||50), 0, 100);
  state.logs.push({ week: state.week, type:"brand", msg:`Standards: ${b.name} → ${Math.round(b.standards)}` });
}

export function setBrandPlaybook(state, brandId, patch){
  const b = brandById(state, brandId);
  if(!b) return;
  if(!b.playbook) b.playbook = { sop:50, training:50, cadence:10 };
  if(patch.sop!=null) b.playbook.sop = clamp(Number(patch.sop), 0, 100);
  if(patch.training!=null) b.playbook.training = clamp(Number(patch.training), 0, 100);
  if(patch.cadence!=null) b.playbook.cadence = clamp(Number(patch.cadence), 2, 16);
  state.logs.push({ week: state.week, type:"brand", msg:`Playbook updated: ${b.name}` });
}

export function computeBrandPrestige(state){
  ensureBrands(state);
  for(const b of state.brands){
    const venues = (state.venues||[]).filter(v=>v.brandId===b.id);
    if(!venues.length){
      b.prestige = clamp((b.prestige||0) - 0.5, 0, 100);
      continue;
    }
    const rep = venues.reduce((a,v)=>a + (v.localReputation||50), 0) / venues.length;
    const pop = venues.reduce((a,v)=>a + (v.popularity||50), 0) / venues.length;
    const clean = venues.reduce((a,v)=>a + (v.cleanliness||70), 0) / venues.length;
    const compliance = venues.reduce((a,v)=>a + (v.compliance||60), 0) / venues.length;
    const score = 0.45*rep + 0.25*pop + 0.15*clean + 0.15*compliance;
    b.prestige = clamp((b.prestige||0)*0.75 + score*0.25, 0, 100);
  }
}

export function brandStandards(state, brandId){
  const b = brandById(state, brandId);
  return b ? clamp(Number(b.standards||50), 0, 100) : 50;
}
