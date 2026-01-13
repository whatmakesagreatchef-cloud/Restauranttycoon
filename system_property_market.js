import { mulberry32, randInt, pick, clamp, hashStrToSeed } from "./rng.js";
import { WORLD } from "./data_world.js";
import { VENUE_TYPES, CONCEPT_STYLES } from "./data_venues.js";
import { DISTRICTS, SHELL_TYPES, LEASE_REVIEW_TYPES, MAKE_GOOD_LEVELS, APPROVAL_LEVELS } from "./data_properties.js";

function cityById(id){ return WORLD.cities.find(c=>c.id===id) || WORLD.cities[0]; }

function pickPermitted(rng){
  const all = VENUE_TYPES.map(v=>v.id);
  if(rng() < 0.10) return ["food_truck","cafe"];
  if(rng() < 0.10) return ["bistro","casual_dining","fine_dining","hotel_restaurant"];
  return all;
}

function levelFromScore(score, levels){
  const i = score < 34 ? 0 : score < 67 ? 1 : 2;
  return levels[i];
}

export function generateListings(state, cityId){
  const city = cityById(cityId);
  const seed = (state.seed ^ hashStrToSeed(cityId) ^ (state.week*131071)) >>> 0;
  const rng = mulberry32(seed);

  const listings = [];
  const count = 9;

  for(let i=0;i<count;i++){
    const district = pick(rng, DISTRICTS);
    const shell = pick(rng, SHELL_TYPES);

    const size = randInt(rng, shell.sizeRange[0], shell.sizeRange[1]);

    const baseRentPerSqm = randInt(
      rng,
      Math.round(shell.rentPerSqmWeekly[0]*10),
      Math.round(shell.rentPerSqmWeekly[1]*10)
    ) / 10;

    const rentPerSqm = baseRentPerSqm * city.rentIndex * district.rentBias;

    const rentWeekly = Math.round(rentPerSqm * size);
    const outgoingsWeekly = Math.round(rentWeekly * (0.10 + rng()*0.10));

    const footTraffic = clamp(district.traffic + randInt(rng,-10,10), 25, 95);

    const rentReviewScore = clamp(40 + (city.rentIndex-1)*60 + randInt(rng,-15,25), 0, 100);
    const makeGoodScore = clamp(35 + shell.fitoutComplexity*25 + randInt(rng,-10,35), 0, 100);
    const approvalScore  = clamp(30 + shell.fitoutComplexity*30 + randInt(rng,-10,35), 0, 100);

    const rentReview = levelFromScore(rentReviewScore, LEASE_REVIEW_TYPES);
    const makeGood = levelFromScore(makeGoodScore, MAKE_GOOD_LEVELS);
    const approvals = levelFromScore(approvalScore, APPROVAL_LEVELS);

    const termYears = randInt(rng, 3, 10);
    const isAssignment = rng() < 0.35;

    const isExisting = rng() < 0.38;
    let existing = null;

    const permittedUses = pickPermitted(rng);

    if(isExisting){
      const exTypeId = pick(rng, permittedUses);
      const exConceptId = pick(rng, CONCEPT_STYLES).id;

      const goodwill = Math.round((rentWeekly * 18) * (0.65 + footTraffic/200));
      const equipment = Math.round((rentWeekly * 10) * (0.50 + rng()*0.40));
      const askingPrice = goodwill + equipment + randInt(rng, -15000, 25000);

      existing = {
        typeId: exTypeId,
        conceptId: exConceptId,
        askingPrice: Math.max(25000, askingPrice),
        fitoutQuality: clamp(55 + randInt(rng,-15,25), 25, 90),
        localReputation: clamp(55 + randInt(rng,-25,25), 0, 100),
        regulars: clamp(150 + randInt(rng,-120,280), 0, 5000),
        chefSkill: clamp(55 + randInt(rng,-20,30), 10, 95),
        managerSkill: clamp(52 + randInt(rng,-20,30), 10, 95),
        cleanliness: clamp(58 + randInt(rng,-25,25), 10, 95),
        supplierStability: clamp(50 + randInt(rng,-25,30), 0, 100),
      };
    }

    const id = `${cityId}_${district.id}_${shell.id}_${i}_${state.week}`;

    listings.push({
      id,
      cityId,
      districtId: district.id,
      districtName: district.name,
      shellType: shell.id,
      shellName: shell.name,

      sizeSqm: size,
      footTraffic,
      permittedUses,

      rentWeekly,
      outgoingsWeekly,
      leaseTermYears: termYears,
      leaseType: isAssignment ? "assignment" : "new_lease",
      rentReview: rentReview.id,
      rentReviewName: rentReview.name,
      makeGood: makeGood.id,
      makeGoodName: makeGood.name,
      approvals: approvals.id,
      approvalsName: approvals.name,

      existing,
    });
  }

  return listings;
}

export function upfrontCostForLease(listing, capex){
  const bond = Math.round((listing.rentWeekly + listing.outgoingsWeekly) * 8);
  const legal = 3500;
  const approvalsFee = listing.approvals === "strict" ? 2500 : listing.approvals === "standard" ? 1200 : 600;
  return bond + legal + approvalsFee + capex;
}

export function estimateOccupancyPct(listing, expectedWeeklySales){
  const occ = (listing.rentWeekly + listing.outgoingsWeekly) / Math.max(1, expectedWeeklySales);
  return clamp(occ, 0.04, 0.14);
}
