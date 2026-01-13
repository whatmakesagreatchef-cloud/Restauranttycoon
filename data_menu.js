// Menu categories + stations are lightweight building blocks.
// We’ll extend this later with allergens, dietary tags, wine pairings, etc.

export const MENU_CATEGORIES = [
  { id:"snacks", name:"Snacks / Small" },
  { id:"entrees", name:"Entrées / Starters" },
  { id:"mains", name:"Mains" },
  { id:"sides", name:"Sides" },
  { id:"dessert", name:"Dessert" },
  { id:"coffee", name:"Coffee" },
  { id:"drinks", name:"Drinks" },
];

export const STATIONS = [
  { id:"cold", name:"Cold / Larder" },
  { id:"pan", name:"Pan" },
  { id:"grill", name:"Grill" },
  { id:"fryer", name:"Fryer" },
  { id:"pastry", name:"Pastry" },
  { id:"bar", name:"Bar" },
  { id:"coffee", name:"Coffee" },
];

export function catName(id){
  const c = MENU_CATEGORIES.find(x=>x.id===id);
  return c ? c.name : id;
}
export function stationName(id){
  const s = STATIONS.find(x=>x.id===id);
  return s ? s.name : id;
}
