export const INSPECTION_GRADES = [
  { grade:"A", min: 85, repDelta:+2, finePct: 0.00, closureWeeks:0 },
  { grade:"B", min: 70, repDelta:+0, finePct: 0.01, closureWeeks:0 },
  { grade:"C", min: 55, repDelta:-3, finePct: 0.03, closureWeeks:0 },
  { grade:"D", min: 0,  repDelta:-8, finePct: 0.06, closureWeeks:1 },
];

export const AUDIT_ACTIONS = {
  deepClean: { label:"Deep clean", baseCost: 2500, clean:+15, comp:+8, burnout:-1 },
  maintenance: { label:"Maintenance + pest control", baseCost: 3500, clean:+8, comp:+10, burnout:+0 },
  trainingDay: { label:"Staff training day", baseCost: 1800, clean:+0, comp:+6, burnout:-2 },
};
