export const VENUE_TYPES = [
  { id:"food_truck", name:"Food Truck", capBase: 180, avgSpendBase: 18, foodCostBase: 0.30, laborBase: 0.22, vibeBase: 55, capexBase: 35000 },
  { id:"cafe", name:"Cafe", capBase: 320, avgSpendBase: 22, foodCostBase: 0.29, laborBase: 0.28, vibeBase: 60, capexBase: 65000 },
  { id:"bistro", name:"Bistro", capBase: 420, avgSpendBase: 34, foodCostBase: 0.31, laborBase: 0.30, vibeBase: 62, capexBase: 110000 },
  { id:"pub_kitchen", name:"Pub Kitchen", capBase: 520, avgSpendBase: 28, foodCostBase: 0.32, laborBase: 0.27, vibeBase: 58, capexBase: 130000 },
  { id:"casual_dining", name:"Casual Dining", capBase: 650, avgSpendBase: 32, foodCostBase: 0.31, laborBase: 0.29, vibeBase: 60, capexBase: 160000 },
  { id:"fine_dining", name:"Fine Dining", capBase: 260, avgSpendBase: 120, foodCostBase: 0.34, laborBase: 0.40, vibeBase: 72, capexBase: 220000 },
  { id:"winery_restaurant", name:"Winery Restaurant", capBase: 420, avgSpendBase: 75, foodCostBase: 0.33, laborBase: 0.35, vibeBase: 70, capexBase: 180000 },
  { id:"hotel_restaurant", name:"Hotel Restaurant", capBase: 520, avgSpendBase: 58, foodCostBase: 0.32, laborBase: 0.33, vibeBase: 66, capexBase: 170000 },
];

export const CONCEPT_STYLES = [
  { id:"modern_a_la_carte", name:"Modern À La Carte", qualityBias:+2, valueBias:0 },
  { id:"classic_a_la_carte", name:"Classic À La Carte", qualityBias:+1, valueBias:+1 },
  { id:"tasting_menu", name:"Tasting Menu", qualityBias:+4, valueBias:-2 },
  { id:"family_value", name:"Family / Value", qualityBias:-1, valueBias:+3 },
  { id:"local_provenance", name:"Local Provenance", qualityBias:+2, valueBias:0 },
];
