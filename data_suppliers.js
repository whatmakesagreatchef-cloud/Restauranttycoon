// Supplier categories for purchasing & contracts
export const SUPPLY_CATEGORIES = [
  { id:"produce", name:"Produce" },
  { id:"meat", name:"Meat" },
  { id:"seafood", name:"Seafood" },
  { id:"dry", name:"Dry goods" },
  { id:"beverage", name:"Beverage" },
  { id:"coffee", name:"Coffee/Tea" }
];

// A lightweight global supplier pool (usable anywhere).
// basePrice is a multiplier against baseline COGS for that category.
export const SUPPLIERS = [
  { id:"freshfields",  name:"FreshFields Produce",        cat:"produce",  basePrice:0.86, reliability:0.86, leadDays:2, notes:"Consistent greens and seasonal fruit." },
  { id:"metroproduce", name:"Metro Produce Hub",          cat:"produce",  basePrice:0.92, reliability:0.80, leadDays:3, notes:"Good pricing, variable quality." },

  { id:"primebutchers",name:"Prime Butchers Co.",         cat:"meat",     basePrice:1.06, reliability:0.84, leadDays:2, notes:"Quality proteins, not the cheapest." },
  { id:"meatworks",    name:"Meatworks Wholesale",        cat:"meat",     basePrice:0.98, reliability:0.79, leadDays:3, notes:"Solid range; average consistency." },

  { id:"harborcatch",  name:"HarborCatch Seafood",        cat:"seafood",  basePrice:1.08, reliability:0.80, leadDays:2, notes:"Great fish, occasional supply swings." },
  { id:"oceanline",    name:"OceanLine Seafood Traders",  cat:"seafood",  basePrice:0.99, reliability:0.76, leadDays:3, notes:"Good pricing; weather impacts." },

  { id:"dryhouse",     name:"DryHouse Distribution",      cat:"dry",      basePrice:0.95, reliability:0.86, leadDays:2, notes:"Fast delivery; stable pricing." },
  { id:"valuebulk",    name:"ValueBulk Dry",              cat:"dry",      basePrice:0.90, reliability:0.78, leadDays:4, notes:"Cheap staples, slower deliveries." },

  { id:"bevcentral",   name:"Beverage Central",           cat:"beverage", basePrice:0.97, reliability:0.80, leadDays:2, notes:"Competitive; shortages during peaks." },
  { id:"craftcellar",  name:"CraftCellar Beverage",       cat:"beverage", basePrice:1.02, reliability:0.82, leadDays:3, notes:"Great range; strong for events." },

  { id:"roastguild",   name:"RoastGuild Coffee",          cat:"coffee",   basePrice:1.03, reliability:0.88, leadDays:2, notes:"Reliable coffee + training support." },
  { id:"beanline",     name:"BeanLine Coffee",            cat:"coffee",   basePrice:0.96, reliability:0.74, leadDays:4, notes:"Budget coffee; occasional delays." }
];

// Category risk profiles (how often price swings / shortages happen)
export const SUPPLY_RISK = {
  produce:  { priceVol: 0.08, shockChance: 0.08 },
  meat:     { priceVol: 0.06, shockChance: 0.05 },
  seafood:  { priceVol: 0.10, shockChance: 0.09 },
  dry:      { priceVol: 0.03, shockChance: 0.03 },
  beverage: { priceVol: 0.05, shockChance: 0.04 },
  coffee:   { priceVol: 0.04, shockChance: 0.03 }
};
