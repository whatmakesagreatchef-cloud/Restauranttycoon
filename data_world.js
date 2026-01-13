export const WORLD = {
  cities: [
    { id:"perth", name:"Perth", country:"Australia", baseDemand: 1.00, rentIndex: 1.00, talentIndex: 0.95, criticHarshness: 0.90 },
    { id:"melbourne", name:"Melbourne", country:"Australia", baseDemand: 1.15, rentIndex: 1.10, talentIndex: 1.00, criticHarshness: 1.05 },
    { id:"tokyo", name:"Tokyo", country:"Japan", baseDemand: 1.25, rentIndex: 1.35, talentIndex: 1.20, criticHarshness: 1.20 },
    { id:"singapore", name:"Singapore", country:"Singapore", baseDemand: 1.20, rentIndex: 1.45, talentIndex: 1.05, criticHarshness: 1.20 },
    { id:"london", name:"London", country:"UK", baseDemand: 1.20, rentIndex: 1.45, talentIndex: 1.10, criticHarshness: 1.15 },
    { id:"paris", name:"Paris", country:"France", baseDemand: 1.20, rentIndex: 1.40, talentIndex: 1.10, criticHarshness: 1.30 },
    { id:"nyc", name:"New York", country:"USA", baseDemand: 1.30, rentIndex: 1.50, talentIndex: 1.15, criticHarshness: 1.25 }
  ],

  seasonality(week){
    const w = week % 52;
    const peak = (x, m, s)=> Math.exp(-Math.pow((x-m)/s,2));
    return 1 + 0.10*peak(w,10,6) + 0.08*peak(w,26,7) + 0.12*peak(w,50,5);
  }
};
