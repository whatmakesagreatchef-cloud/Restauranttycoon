export const EQUIPMENT_LIBRARY = [
  { id:"line", name:"Cook line (range/ovens)", capex: 80000, maintPerWeek: 180, breakdownBase: 0.020, speedHit: 10, foodHit: 6, downtimeWeeks: 1 },
  { id:"fridge", name:"Cold storage (fridges/freezers)", capex: 50000, maintPerWeek: 140, breakdownBase: 0.018, speedHit: 4, foodHit: 4, downtimeWeeks: 1 },
  { id:"dish", name:"Dishwasher", capex: 25000, maintPerWeek: 70, breakdownBase: 0.014, speedHit: 6, foodHit: 0, downtimeWeeks: 1 },
  { id:"hood", name:"Ventilation/hood", capex: 22000, maintPerWeek: 60, breakdownBase: 0.012, speedHit: 2, foodHit: 0, downtimeWeeks: 1 },
  { id:"pos", name:"POS + printers", capex: 18000, maintPerWeek: 50, breakdownBase: 0.013, speedHit: 5, foodHit: 0, downtimeWeeks: 1 },
  { id:"coffee", name:"Coffee machine", capex: 16000, maintPerWeek: 40, breakdownBase: 0.016, speedHit: 2, foodHit: 0, downtimeWeeks: 1 },
  { id:"hvac", name:"HVAC / aircon", capex: 30000, maintPerWeek: 55, breakdownBase: 0.012, speedHit: 2, foodHit: 0, downtimeWeeks: 1 },
];

export const ENERGY = {
  basePerCover: 0.18,     // $ per cover baseline
  basePerWeek: 350,       // $ fixed utilities (small venue)
  penaltyWhenOld: 0.20,   // +20% when poor condition
};

export const RENOVATIONS = [
  { id:"refresh", name:"Cosmetic refresh", cost: 25000, weeks: 2, repBoost: 2.5, speedBoost: 0, complianceBoost: 2 },
  { id:"kitchen", name:"Kitchen overhaul", cost: 95000, weeks: 4, repBoost: 4.0, speedBoost: 2, complianceBoost: 4 },
  { id:"full", name:"Full refit", cost: 180000, weeks: 6, repBoost: 6.5, speedBoost: 4, complianceBoost: 6 },
];
