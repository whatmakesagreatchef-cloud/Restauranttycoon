export const TAX = {
  defaultRate: 0.25,   // 25%
};

export const LOAN_PRODUCTS = [
  { id:"small", label:"Small business loan", min: 25000, max: 150000, apr: 0.11, termWeeks: 104 },
  { id:"growth", label:"Growth loan", min: 100000, max: 500000, apr: 0.095, termWeeks: 156 },
  { id:"bridge", label:"Bridge loan", min: 50000, max: 250000, apr: 0.135, termWeeks: 52 },
];
