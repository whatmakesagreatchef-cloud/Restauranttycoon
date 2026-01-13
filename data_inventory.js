// Inventory is tracked as $-value by category for simplicity (but still behaves like stock).
// 'split' is typical spend share of weekly COGS for that category.
export const INV_CATEGORY_PROFILE = {
  produce:  { split: 0.22, spoil: 0.07, shrink: 0.010 },
  meat:     { split: 0.28, spoil: 0.04, shrink: 0.008 },
  seafood:  { split: 0.12, spoil: 0.06, shrink: 0.010 },
  dry:      { split: 0.18, spoil: 0.01, shrink: 0.006 },
  beverage: { split: 0.12, spoil: 0.00, shrink: 0.004 },
  coffee:   { split: 0.08, spoil: 0.02, shrink: 0.006 },
};

// Emergency buy premium when you run out mid-week
export const INV_EMERGENCY = {
  premiumMin: 0.18,
  premiumMax: 0.35,
};

// Storage upgrade ladder (multiplies max on-hand value)
export const STORAGE_LEVELS = [
  { level: 1, label: "Basic",    capMult: 1.00, capex: 0 },
  { level: 2, label: "Improved", capMult: 1.35, capex: 30000 },
  { level: 3, label: "Pro",      capMult: 1.75, capex: 65000 },
  { level: 4, label: "Cold-chain",capMult: 2.20, capex: 110000 },
];
