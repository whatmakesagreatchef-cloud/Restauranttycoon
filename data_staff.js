export const STAFF_ROLES = [
  { id:"gm", name:"General Manager", abbrev:"GM" },
  { id:"chef", name:"Head Chef", abbrev:"HC" },
  { id:"foh", name:"FOH Lead", abbrev:"FOH" }
];

export const FIRST_NAMES = [
  "Ava","Mia","Zoe","Luca","Noah","Leo","Sofia","Elijah","Amara","Kai",
  "Grace","Ivy","Ethan","Hugo","Aria","Mila","Nina","Owen","Rory","Mason",
  "Sam","Tara","Freya","Jay","Dylan","Parker","Alex","Jordan","Casey","Jamie"
];

export const LAST_NAMES = [
  "Nguyen","Rossi","Khan","Patel","Smith","Garcia","Kim","Brown","Watanabe","Dubois",
  "Wilson","O'Connor","Chen","Singh","Martin","Taylor","Lopez","Anderson","Sato","Johnson",
  "Miller","Walker","Scott","White","Hernandez","Young","Lee","Clark","Wright","Baker"
];

// Traits are lightweight modifiers (applied inside the sim)
export const TRAITS = [
  { id:"hard_assessor", name:"Hard Assessor", notes:"Cuts waste but can raise staff stress.", mod:{ waste:-0.010, stress:+6 } },
  { id:"people_person", name:"People Person", notes:"Reduces complaints, improves regulars.", mod:{ complaints:-0.08, regulars:+8 } },
  { id:"systems_brain", name:"Systems Brain", notes:"Improves speed consistency and labour control.", mod:{ speed:+5, labor:-0.015 } },
  { id:"clean_freak", name:"Standards Hawk", notes:"Boosts cleanliness and reduces health risk.", mod:{ clean:+6, complaints:-0.03 } },
  { id:"artist", name:"Creative", notes:"Boosts food score, can increase food cost slightly.", mod:{ food:+6, foodcost:+0.010 } },
  { id:"mentor", name:"Mentor", notes:"Reduces stress, improves consistency over time.", mod:{ stress:-6, consistency:+4 } },
  { id:"calm_under_fire", name:"Calm Under Fire", notes:"Big stress reduction when busy.", mod:{ stress:-10 } },
  { id:"sales_operator", name:"Sales Operator", notes:"Better value perception and upsell.", mod:{ value:+5, spend:+0.03 } }
];


// Hourly crew used in Rosters (simple model)
export const HOURLY_ROLES = [
  { id:"kitchen", name:"Kitchen crew", wageHourly: 32 },
  { id:"foh", name:"FOH crew", wageHourly: 28 },
  { id:"bar", name:"Bar crew", wageHourly: 30 }
];

// Training options (improve effective skills; reduce burnout)
export const TRAINING_OPTIONS = [
  { id:"ops", name:"Systems workshop (GM)", cost: 600, affects:["ops","finance","people"], bonus: 1.5 },
  { id:"consistency", name:"Consistency drills (Chef)", cost: 650, affects:["consistency","culinary"], bonus: 1.5 },
  { id:"cost", name:"Cost control sprint (Chef)", cost: 650, affects:["cost"], bonus: 1.8 },
  { id:"pace", name:"Service pace training (FOH)", cost: 550, affects:["pace","recovery","service"], bonus: 1.4 },
  { id:"standards", name:"Standards refresh (All)", cost: 450, affects:["standards"], bonus: 1.4 }
];
