import { mulberry32, clamp, pick, randInt } from "./rng.js";
import { WORLD } from "./data_world.js";
import { VENUE_TYPES, CONCEPT_STYLES } from "./data_venues.js";
import { totalOutsideEquity, payDividends, tickInvestorGovernance } from "./system_investors.js";
import { weeklyWages, effectiveSkills, traitMods, ensureRoster, rosterWeeklyCost, recommendedPerShift } from "./system_staff.js";
import { computeMenuMetrics } from "./system_menu.js";
import { activePromoEffects, tickPromos, applyMenuPopularityDecay } from "./system_promos.js";
import { processCustomerWeek } from "./system_customers.js";
import { ensureReviewState, ingestVenueReviews } from "./system_reviews.js";
import { ensureInventoryState, tickInventoryWeek } from "./system_inventory.js";
import { ensureFacilitiesState, computeFacilityEffects, tickFacilitiesWeek } from "./system_facilities.js";
import { tickStaffIssues } from "./system_staff_events.js";
import { ensureQuests, rollNewQuests, tickQuests, trackLoyaltyWeeks } from "./system_quests.js";
import { ensureSupplyState, tickSupplyMarket, venueSupplyEffects } from "./system_suppliers.js";
import { ensureBrands, brandById, brandStandards, computeBrandPrestige } from "./system_brands.js";
import { ensureAuditState, tickAudits, finalizeClosures } from "./system_audits.js";
import { ensureAccounting, tickDepreciation, tickLoans, accrueTax, netWorth } from "./system_accounting.js";

const PRAISE_TAGS = ["Loved the vibe","Perfect coffee","Great value","Friendly staff","Unreal flavours","Would return","Best in town","Hot, fast and fresh","Beautiful wine list"];
const COMPLAINT_TAGS = ["Slow service","Overpriced","Too salty","Cold food","Noisy","Rude staff","Dirty tables","Tiny portions","Overcooked","Coffee was burnt"];

function findCity(state){
  return WORLD.cities.find(c => c.id === state.homeCityId) || WORLD.cities[0];
}
function venueById(id){ return VENUE_TYPES.find(v => v.id === id); }
function conceptById(id){ return CONCEPT_STYLES.find(c => c.id === id); }

export function runWeek(state){
  ensureBrands(state);
  ensureSupplyState(state);
  ensureAuditState(state);
  ensureReviewState(state);
  ensureAccounting(state);
  ensureInventoryState(state);
  ensureFacilitiesState(state);
  tickSupplyMarket(state);

  const rng = mulberry32(state.seed + state.week * 99991);
  const city = findCity(state);
  const season = WORLD.seasonality(state.week);

  if(state.venues.length === 0){
    state.lastWeekReport = emptyReport(state);
    state.week += 1;
  ensureQuests(state);
  rollNewQuests(state);
  trackLoyaltyWeeks(state);
    return;
  }

  let totalSales = 0, totalFood = 0, totalLabor = 0, totalOcc = 0, totalOther = 0, totalNet = 0;
  let totalWages = 0;
  let totalStockouts = 0;
  let totalEmergency = 0;
  let supplyIndexWeighted = 0;
  let supplyIndexWeight = 0;
  let praise = {}, complaints = {};
  let featuredReviews = [];
  let regularsDelta = 0;
  let complianceSum = 0, complianceN = 0;
  let auditInspections = 0, auditFines = 0, auditClosures = 0;
  let reviewsNew = 0, reviewsNeg = 0, starsSum = 0, starsN = 0;
  let depExpense = 0, interestExpense = 0, loanPayment = 0, principalPaid = 0, taxExpense = 0;
  let profitBeforeTax = 0, profitAfterTax = 0;
  let invWaste = 0, invStockouts = 0, invEmergency = 0, invOnHand = 0, invIncoming = 0;
  let facMaint = 0, facEnergy = 0, facNewIssues = 0, facDownVenues = 0, facAvgCondition = 0, facN = 0;
  const closedVenueIds = [];

  const macroInflation = 1 + (state.week/5200)*0.05;

  for(const v of state.venues){
    const vt = venueById(v.typeId);
    const closedAtStart = (v.closureWeeks||0) > 0;
    if(closedAtStart) closedVenueIds.push(v.id);
    const cs = conceptById(v.conceptId);

    // Ensure staff/delegation exist
    if(!v.staff) v.staff = { gm:null, chef:null, foh:null };
    if(!v.delegation) v.delegation = { ops:false, menu:false, foh:false };

    const mods = traitMods(v);
    const pe0 = activePromoEffects(state, v);
    const eff = effectiveSkills(v);

    const rep = (state.reputation + v.localReputation) / 2;
    const demandIndex = city.baseDemand * season * (0.70 + rep/200) * (0.85 + (v.footTraffic ?? 70)/200);

    const cap = vt.capBase * (0.85 + v.fitoutQuality/200);

    // Menu metrics
    const menu = computeMenuMetrics(v);
    const standards = v.brandId ? brandStandards(state, v.brandId) : 50;
    const standardsBoost = clamp((standards - 50) * 0.08, -6, 6);
    const standardsBurnout = clamp((standards - 50) * 0.06, -5, 7);

    // Promo effects
    const pe = activePromoEffects(state, v);
    const promoDemand = 1 + pe.demandBoost;
    const promoFoot = pe.footTraffic;

    // Avg spend per cover: use menu when available, otherwise venue baseline
    let avgSpend = (menu.hasMenu ? menu.avgSpendPerCover : vt.avgSpendBase) * (1 + v.pricePosition/100) * (0.95 + rep/250);
    avgSpend *= (1 + (mods.spend || 0));

    // Demand index with promos
    const buzzFactor = 1 + clamp((v.reviewBuzz||0)/120, -0.18, 0.18);
    const demandWithPromos = demandIndex * promoDemand * (0.92 + (promoFoot/250)) * buzzFactor;

    // covers are dampened if stress is high, and boosted slightly by FOH pace
    const fohBoost = v.delegation.foh && v.staff.foh ? (eff.pace/400) : 0;
    const stressPenalty = (v.staffStress/220);
    const covers = Math.round(cap * clamp(demandWithPromos + fohBoost - stressPenalty, 0.40, 1.60));
    const closed = closedAtStart;
    const finalCovers = closed ? 0 : covers;
    const sales = finalCovers * avgSpend;

    // Variable cost %s
    const baseFoodPct = menu.hasMenu ? menu.foodCostPct : vt.foodCostBase;
    let foodPct = baseFoodPct + (0.02*(macroInflation-1)) - (eff.cost/560) + randInt(rng,-2,2)/100;
    foodPct += (mods.foodcost || 0);
    foodPct = clamp(foodPct, 0.20, 0.44);

    // labour: menu complexity pushes labour % up, station staff reduce stress via speed boost elsewhere
    const prepLoad = menu.hasMenu ? menu.prepLoad : 45;
    const stationImb = menu.hasMenu ? menu.stationImbalance : 35;
    const delegatedMenu = (!!v.delegation?.menu && !!v.staff?.chef);
    const effectivePrep = delegatedMenu ? prepLoad*0.90 : prepLoad;
    const menuLaborAdj = clamp((effectivePrep - 45) / 800, -0.01, 0.07);
    // Variable cost %s
    let foodPct = vt.foodCostBase + (0.02*(macroInflation-1)) - (eff.cost/520) + randInt(rng,-2,2)/100;
    foodPct += (mods.foodcost || 0);
    foodPct = clamp(foodPct, 0.24, 0.42);

    let laborPct = vt.laborBase + (v.ownerRun ? 0.04 : 0.00) + (v.staffStress/320) + menuLaborAdj + randInt(rng,-2,2)/100;
    // GM systems can reduce labour drift
    if(v.delegation.ops && v.staff.gm){
      laborPct -= (eff.ops/700);
      laborPct += (mods.labor || 0);
    }
    laborPct = clamp(laborPct, 0.16, 0.52);


    // Roster staffing factor (Staff v2)
    const roster = ensureRoster(v);
    const rosterCost = rosterWeeklyCost(v);
    let staffingFactor = 1.0;
    if(roster.enabled && menu.hasMenu){
      const rec = recommendedPerShift(v, finalCovers, menu);
      const actK = Math.max(0, Number(roster.kitchenPerShift||0));
      const actF = Math.max(0, Number(roster.fohPerShift||0));
      const actB = Math.max(0, Number(roster.barPerShift||0));
      const rk = clamp(actK / Math.max(1, rec.kitchen), 0.55, 1.5);
      const rf = clamp(actF / Math.max(1, rec.foh), 0.55, 1.5);
      const rb = clamp((rec.bar<=0?1:actB / Math.max(1, rec.bar)), 0.55, 1.5);
      staffingFactor = clamp(rk*0.45 + rf*0.45 + rb*0.10, 0.65, 1.35);

      // If roster is enabled we account more labour as fixed wages, so reduce variable labour pct slightly
      laborPct = clamp(laborPct - 0.07, 0.10, 0.42);

      // Understaffing increases stress; overstaffing relieves it
      v.staffStress = clamp(v.staffStress + (1 - staffingFactor) * 14, 0, 95);

      // Burnout drift (weekly)
      const burnout = clamp(Number(v.burnout||0), 0, 100);
      const demandPressure = clamp((finalCovers/140)*2.4, 0, 6);
      const complexityPressure = clamp((menu.prepLoad-55)/22 + (menu.stationImbalance-55)/55, -3, 7);
      const burnoutDelta = clamp(demandPressure + complexityPressure + (1 - staffingFactor)*10 - (staffingFactor-1)*3 + standardsBurnout, -8, 14);
      v.burnout = clamp(burnout + burnoutDelta, 0, 100);

      // Morale tracks burnout + outcomes (rough)
      const moraleBase = clamp(78 - v.burnout*0.55, 0, 100);
      v.morale = clamp(moraleBase + (staffingFactor-1)*6, 0, 100);

      // Rare sick-week when burnout is high
      if(v.burnout > 82 && rng() < 0.06){
        staffingFactor = clamp(staffingFactor - 0.12, 0.55, 1.35);
        v.staffStress = clamp(v.staffStress + 6, 0, 95);
        state.logs.push({ week: state.week, type:"staff", msg:`Sick week at ${v.name} (burnout high).` });
      }
    }


    const occPct = clamp(v.occupancyPct ?? 0.09, 0.04, 0.14);
    const otherPct = clamp(0.12 + (v.equipmentDebt ? 0.02 : 0) + randInt(rng,-2,2)/100, 0.08, 0.22);

    // Fixed wages
    const wages = weeklyWages(v);
    totalWages += wages;

    // Supply chain effects (cost + stockouts)
    const baseFood = sales * foodPct;
    const supply = venueSupplyEffects(state, v, baseFood);
    let food = supply.cogs;

    // Facilities tick (maintenance, energy, breakdowns)
    const fac = tickFacilitiesWeek(state, v, rng, finalCovers);

    // Inventory (ordering, spoilage, shrink, stockouts)
    const inv = tickInventoryWeek(state, v, rng, { cogs: food, covers: finalCovers });
    food += inv.wasteCost + inv.emergencySpend;

    const labor = sales * laborPct + wages;
    const occ = sales * occPct;
    const other = sales * otherPct;
    const net = sales - food - labor - occ - other;

    totalStockouts += supply.stockouts + inv.stockouts;
    totalEmergency += supply.emergencySpend + inv.emergencySpend;
    invWaste += inv.wasteCost;
    invStockouts += inv.stockouts;
    invEmergency += inv.emergencySpend;
    invOnHand += inv.onHand;
    invIncoming += inv.incoming;
    facMaint += fac.maintSpend;
    facEnergy += fac.energy;
    facNewIssues += fac.newIssues;
    if(fac.downtimeWeeks>0) facDownVenues += 1;
    facAvgCondition += fac.condition;
    facN += 1;
    supplyIndexWeighted += supply.indexAvg * Math.max(1, sales);
    supplyIndexWeight += Math.max(1, sales);

    totalSales += sales; totalFood += food; totalLabor += labor; totalOcc += occ; totalOther += other; totalNet += net;

    // Satisfaction components
    const speedScoreBase = clamp(68 - v.staffStress + (eff.ops*0.55) + (eff.pace*0.25), 10, 98);
    const foodScoreBase = clamp(58 + eff.culinary + cs.qualityBias*3 - (v.wastePct*80) + (mods.food||0), 10, 99);
    const valueScoreBase = clamp(60 + cs.valueBias*4 - (v.pricePosition*0.8) + (mods.value||0), 5, 96);
    const cleanScoreBase = clamp(60 + eff.standards - (v.staffStress*0.35) + (mods.clean||0), 5, 99);
    const vibeScoreBase  = clamp(vt.vibeBase + v.fitoutQuality*0.2 + randInt(rng,-3,3), 10, 98);

    // Consistency influences perceived food score (less random drops)
    const consistency = clamp(eff.consistency + (mods.consistency||0), 10, 100);
    const wobble = (100 - consistency) / 30; // 0-3-ish
    const menuQuality = menu.hasMenu ? clamp(menu.varietyScore*0.15 + (1 - menu.foodCostPct)*60, 0, 20) : 0;
    const foodScore = clamp(60 + v.chefSkill + cs.qualityBias*3 + menuQuality - (v.wastePct*80) + (mods.food||0), 10, 99);

    const ss = v.stationStaff || { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };
    const stationBoost = clamp((Number(ss.pan||0)+Number(ss.grill||0)+Number(ss.fryer||0)+Number(ss.cold||0)+Number(ss.pastry||0)) * 1.8 + Number(ss.prep||0)*1.2, 0, 14);

    const burnoutPenalty = clamp((Number(v.burnout||0) - 35) * 0.20, 0, 16);
    const staffBonus = clamp((staffingFactor - 1) * 14, -10, 14);
    const speedPenalty = menu.hasMenu ? clamp((stationImb-35)*0.18 + (effectivePrep-45)*0.20, -8, 18) : 0;
    const speedScore = clamp(70 - v.staffStress + (v.managerSkill*0.6) + (serviceSkill*0.25) + (mods.speed||0) + staffBonus + stationBoost - speedPenalty - burnoutPenalty, 10, 97);
    const valueScore = clamp(valueScoreBase, 5, 96);
    const cleanScore = clamp(cleanScoreBase, 5, 99);
    const vibeScore  = clamp(vibeScoreBase, 10, 98);

    const sat = clamp((foodScore*0.38 + speedScore*0.18 + valueScore*0.16 + vibeScore*0.16 + cleanScore*0.12), 0, 100);

    // Audits / compliance (skip if venue is already closed)
    if(!closed){
      const ar = tickAudits(state, v, rng, { week: state.week, sales, foodScore, speedScore });
      complianceSum += (v.compliance||0);
      complianceN += 1;
      if(ar && ar.inspected){
        auditInspections += 1;
        auditFines += (ar.fine||0);
        totalOther += (ar.fine||0);
        totalNet -= (ar.fine||0);
        if(ar.closed) auditClosures += 1;
      }
    }

    // Tags / feedback with trait effects
    const complaintBias = clamp(0.55 - (sat/200) + (mods.complaints||0), 0.10, 0.80);
    for(let i=0;i<6;i++){
      const isPraise = rng() > complaintBias;
      const tag = isPraise ? pick(rng, PRAISE_TAGS) : pick(rng, COMPLAINT_TAGS);
      const bucket = isPraise ? praise : complaints;
      bucket[tag] = (bucket[tag]||0) + 1;
    }

    if(rng() < 0.35){
      featuredReviews.push(makeReview(rng, v.name, sat, {foodScore,speedScore,valueScore,cleanScore,vibeScore}));
      if(featuredReviews.length > 3) featuredReviews = featuredReviews.slice(0,3);
    }

    const regChange = Math.round((sat - 55) * 0.6 + randInt(rng,-8,8) + (mods.regulars||0));
    v.regulars = clamp(v.regulars + regChange, 0, 5000);
    regularsDelta += regChange;

    // Menu popularity drift + promos tick
    applyMenuPopularityDecay(v);
    tickPromos(state, v, { sat, foodScore, speedScore });


    v.localReputation = clamp(v.localReputation + (sat-60)*0.06 + randInt(rng,-2,2)*0.2, 0, 100);

    // Stress dynamics: better people/staff = less stress growth
    const peopleBuffer = (eff.people/220);
    const stressDelta = (finalCovers/cap - 0.9)*18 + (laborPct - vt.laborBase)*120 - peopleBuffer*10 + randInt(rng,-3,3) + (mods.stress||0)*0.25;
    v.staffStress = clamp(v.staffStress + stressDelta, 0, 100);

    // Waste improves with cost skill and traits
    const wasteDelta = (0.10 - (eff.cost/900)) + (mods.waste||0);
    v.wastePct = clamp(v.wastePct + wasteDelta*0.03 + randInt(rng,-1,1)/1000, 0.03, 0.16);

    // Prestige drift
    const prestigeDelta = ((foodScore-75) * 0.05 + (v.localReputation-70)*0.02) / city.criticHarshness;
    state.prestige = clamp(state.prestige + prestigeDelta, 0, 100);

    if(typeof v.leaseYearsRemaining === "number"){
      v.leaseYearsRemaining = Math.max(0, v.leaseYearsRemaining - (1/52));
    }
  }

  state.reputation = clamp(state.reputation + (totalNet>0 ? 0.4 : -0.8) + (state.prestige-40)*0.01, 0, 100);
  state.cash += totalNet;

  // Owner dependence now responds to delegation settings + hires
  let delegationScore = 0;
  for(const v of state.venues){
    if(v.delegation?.ops && v.staff?.gm) delegationScore += 1.2;
    if(v.delegation?.menu && v.staff?.chef) delegationScore += 0.9;
    if(v.delegation?.foh && v.staff?.foh) delegationScore += 0.6;
  }
  state.ownerDependence = clamp(state.ownerDependence - delegationScore*0.8 + 0.35, 0, 100);

  
  // Accounting (non-cash dep, financing, tax accrual)
  depExpense = tickDepreciation(state);
  const loanRes = tickLoans(state);
  interestExpense = loanRes.totalInterest || 0;
  loanPayment = loanRes.totalPayment || 0;
  principalPaid = loanRes.totalPrincipal || 0;

  profitBeforeTax = (totalNet || 0) - depExpense - interestExpense;
  taxExpense = accrueTax(state, profitBeforeTax);
  profitAfterTax = profitBeforeTax - taxExpense;

  state.accounting.retained = (state.accounting.retained||0) + profitAfterTax;
state.lastWeekReport = {
    week: state.week,
    city: `${city.name}, ${city.country}`,
    seasonality: season,
    sales: totalSales,
    food: totalFood,
    labor: totalLabor,
    wages: totalWages,
    occupancy: totalOcc,
    other: totalOther,
    net: totalNet,
    primePct: (totalFood+totalLabor)/Math.max(1,totalSales),
    occPct: totalOcc/Math.max(1,totalSales),
    praise,
    complaints,
    featuredReviews,
    regularsDelta,
    outsideEquity: totalOutsideEquity(state),
    supplyIndex: (supplyIndexWeight ? (supplyIndexWeighted/supplyIndexWeight) : 1.0),
    stockouts: totalStockouts,
    emergencySpend: totalEmergency,
    complianceAvg: (complianceN ? (complianceSum/complianceN) : 0),
    inspections: auditInspections,
    finesPaid: Math.round(auditFines||0),
    closuresStarted: auditClosures,
    reviewsNew,
    reviewsNegative: reviewsNeg,
    avgStars: (starsN ? (starsSum/starsN) : 0),
    depreciation: Math.round(depExpense||0),
    interest: Math.round(interestExpense||0),
    loanPayment: Math.round(loanPayment||0),
    principalPaid: Math.round(principalPaid||0),
    profitBeforeTax: Math.round(profitBeforeTax||0),
    taxExpense: Math.round(taxExpense||0),
    profitAfterTax: Math.round(profitAfterTax||0),
    taxAccrued: Math.round((state.accounting && state.accounting.taxAccrued)||0),
    netWorth: Math.round(netWorth(state)||0),
    debtOutstanding: Math.round((state.loans||[]).reduce((a,x)=>a+(x.balance||0),0)),
    assetsBook: Math.round((state.fixedAssets||[]).reduce((a,x)=>a+(x.book||0),0)),
  };

  // Partners: dividends + governance pressure
  const div = payDividends(state, totalNet);
  tickInvestorGovernance(state);
  state.lastWeekReport.dividendsPaid = div.paid;
  state.lastWeekReport.boardPressure = state.boardPressure || 0;


  state.netHistory.push(totalNet);
  if(state.netHistory.length > 12) state.netHistory = state.netHistory.slice(-12);

  state.logs.push({ week: state.week, type:"ops", msg:`Week ${state.week} net: $${Math.round(totalNet).toLocaleString()} (wages $${Math.round(totalWages).toLocaleString()})` });
  finalizeClosures(state, closedVenueIds);
  state.week += 1;
}

function emptyReport(state){
  return {
    week: state.week,
    city: "",
    seasonality: 1,
    sales: 0, food:0, labor:0, wages:0, occupancy:0, other:0, net:0,
    primePct: 0, occPct: 0,
    praise:{}, complaints:{},
    featuredReviews: [],
    regularsDelta: 0,
    outsideEquity: totalOutsideEquity(state),
    supplyIndex: 1.0,
    stockouts: 0,
    emergencySpend: 0,
    complianceAvg: 0,
    inspections: 0,
    finesPaid: 0,
    closuresStarted: 0,
    reviewsNew: 0,
    reviewsNegative: 0,
    avgStars: 0,
    invWaste: 0,
    invStockouts: 0,
    invEmergency: 0,
    invOnHand: 0,
    invIncoming: 0,
    facMaint: 0,
    facEnergy: 0,
    facNewIssues: 0,
    facDownVenues: 0,
    facAvgCondition: 0,
    depreciation: 0,
    interest: 0,
    loanPayment: 0,
    principalPaid: 0,
    profitBeforeTax: 0,
    taxExpense: 0,
    profitAfterTax: 0,
    taxAccrued: 0,
    netWorth: 0,
    debtOutstanding: 0,
    assetsBook: 0,
  };
}
function makeReview(rng, venueName, sat, scores){
  const mood =
    sat >= 80 ? "ecstatic" :
    sat >= 65 ? "happy" :
    sat >= 50 ? "mixed" : "furious";

  const opener = pick(rng, [
    "Came in with high hopes.",
    "Dropped by on a whim.",
    "Visited after hearing buzz.",
    "Finally tried it this week.",
    "Booked because a friend recommended it."
  ]);

  const lines = [];
  lines.push(opener);

  if(scores.foodScore >= 78) lines.push("The food had real intent — flavours felt deliberate and clean.");
  else if(scores.foodScore <= 55) lines.push("The food missed the mark — seasoning and execution felt inconsistent.");

  if(scores.speedScore <= 55) lines.push("Service pace was rough. Tickets felt slow and the room got impatient.");
  else if(scores.speedScore >= 75) lines.push("Service flowed smoothly. Timing felt under control.");

  if(scores.valueScore <= 50) lines.push("For the price, the value didn’t stack up.");
  else if(scores.valueScore >= 70) lines.push("Value felt fair for what you get.");

  if(scores.cleanScore <= 55) lines.push("Little cleanliness details stood out in a bad way.");
  if(scores.vibeScore >= 75) lines.push("Atmosphere was a big win — you could feel the energy.");

  const signoff =
    mood === "ecstatic" ? "We’ll be back — and we’re bringing friends." :
    mood === "happy" ? "Would return, especially on a quieter night." :
    mood === "mixed" ? "Some real potential here, but it needs tightening." :
    "Won’t be back unless it seriously improves.";

  lines.push(signoff);

  // Quests completion check
  tickQuests(state);

  return {
    venue: venueName,
    mood,
    rating: clamp(Math.round((sat/20)*10)/10, 0, 5),
    text: lines.join(" ")
  };
}