const KEY = "resim_v1_save";

export function defaultState(){
  const seed = Math.floor(Math.random() * 1e9);
  return {
    version: 4,
    seed,
    route: "world",
    seenSetup: false,
    tutorialDone: {},
    walkthrough: { active:false },
    week: 1,
    homeCityId: null,

    cash: 120000,
    debt: 0,

    prestige: 0,
    reputation: 50,
    ownerDependence: 85,

    // Partners / investors
    investors: [],
    boardPressure: 0,
    dividendsPolicy: "reinvest",      // reinvest | balanced | distribute
    dividendsPayoutRatio: 0.0,        // 0.00 | 0.30 | 0.55

    venues: [],

    lastWeekReport: null,
    netHistory: [],

    sold: null,
    logs: [],

    quests: { active:[], completed:[], lastRollWeek:-1 },
    _loyaltyWeeks: 0,

    settings: {
      realism: "realistic",
    },

    // Business model / brands
    brandMode: null, // 'chain' | 'portfolio' | null
    chainBrandId: null,
    chainBrandName: "",
    brands: [],

    // HQ / supply chain
    hq: { centralPurchasing:false, contracts:[] },
    supplyIndex: {},
    supplyLog: [],

    // Audits / inspections
    auditLog: [],

    // Reviews
    reviewFeed: [],

    // Accounting
    accounting: { taxRate: 0.25, taxAccrued: 0, retained: 0 },
    loans: [],
    fixedAssets: [],
  };
}

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    if(!s || typeof s !== "object") return defaultState();
    return migrate(s);
  }catch{
    return defaultState();
  }
}

function migrate(s){
  if(!s.version) s.version = 1;

  if(!Array.isArray(s.netHistory)) s.netHistory = [];
  if(!("sold" in s)) s.sold = null;
  if(!Array.isArray(s.logs)) s.logs = [];

  if(!s.quests) s.quests = { active:[], completed:[], lastRollWeek:-1 };
  if(s._loyaltyWeeks==null) s._loyaltyWeeks = 0;

  if(!Array.isArray(s.venues)) s.venues = [];
  if(!Array.isArray(s.investors)) s.investors = [];

  if(!s.hq) s.hq = { centralPurchasing:false, contracts:[] };
  if(s.hq.centralPurchasing==null) s.hq.centralPurchasing = false;
  if(!s.hq.contracts) s.hq.contracts = [];
  if(!s.supplyIndex) s.supplyIndex = {};
  if(!s.supplyLog) s.supplyLog = [];
  if(!s.inventoryLog) s.inventoryLog = [];
  if(!s.facilityLog) s.facilityLog = [];
  if(!s.auditLog) s.auditLog = [];
  if(!s.reviewFeed) s.reviewFeed = [];
  if(!s.accounting) s.accounting = { taxRate: 0.25, taxAccrued: 0, retained: 0 };
  if(s.accounting.taxRate==null) s.accounting.taxRate = 0.25;
  if(s.accounting.taxAccrued==null) s.accounting.taxAccrued = 0;
  if(s.accounting.retained==null) s.accounting.retained = 0;
  if(!Array.isArray(s.loans)) s.loans = [];
  if(!Array.isArray(s.fixedAssets)) s.fixedAssets = [];

  // Brands
  if(s.brandMode==null) s.brandMode = null;
  if(s.chainBrandId==null) s.chainBrandId = null;
  if(s.chainBrandName==null) s.chainBrandName = "";
  if(!Array.isArray(s.brands)) s.brands = [];

  if(s.boardPressure == null) s.boardPressure = 0;

  if(s.dividendsPolicy == null){
    // Back-compat: older saves may have settings.dividendsPolicy
    s.dividendsPolicy = (s.settings && s.settings.dividendsPolicy) ? s.settings.dividendsPolicy : "reinvest";
  }
  if(s.dividendsPayoutRatio == null){
    s.dividendsPayoutRatio = (s.dividendsPolicy === "distribute") ? 0.55 : (s.dividendsPolicy === "balanced" ? 0.30 : 0.0);
  }

  // Investor ledger fields
  for(const inv of s.investors){
    if(inv.paidOut == null) inv.paidOut = 0;
    if(inv.prefAccrued == null) inv.prefAccrued = 0;
    if(inv._pressureFailCount == null) inv._pressureFailCount = 0;
  }

  // Ensure venue fields (wizard + menu engine + promos + customers)
  for(const v of s.venues){
    if(!v.staff) v.staff = { gm:null, chef:null, foh:null };
    if(!v.delegation) v.delegation = { ops:false, menu:false, foh:false };

    // Staff v2
    if(v.burnout==null) v.burnout = 12; // 0-100
    if(v.morale==null) v.morale = 70;   // 0-100
    if(!v.training) v.training = { ops:0, consistency:0, cost:0, pace:0, standards:0 };
    if(!v.roster) v.roster = { enabled:false, openDays:6, shiftsPerDay:2, hoursPerShift:6, kitchenPerShift:3, fohPerShift:3, barPerShift:1, auto:true };
    if(!v.staffIssues) v.staffIssues = [];
    if(!v.staffPolicy) v.staffPolicy = { overtime:"pay", raises:"tight", culture:"balanced" };
    if(!v.staffKpis) v.staffKpis = { turnover:0, overtime:0, trainingSpend:0 };

    // Brand
    if(v.brandId==null) v.brandId = null;

    // Audits
    if(v.compliance==null) v.compliance = 60;
    if(v.closureWeeks==null) v.closureWeeks = 0;
    if(!v.auditHistory) v.auditHistory = [];

    // Supply chain
    if(!v.suppliers) v.suppliers = {};
    if(!v.supplyKpis) v.supplyKpis = { stockouts:0, emergencySpend:0, avgIndex:1.0 };

    if(!v.menuStyle) v.menuStyle = "a_la_carte";
    if(!v.menuItems) v.menuItems = [];
    if(!v.menuStep) v.menuStep = (v.menuItems.length ? 2 : 1);

    if(!v.stationStaff) v.stationStaff = { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };
    if(!v.promos) v.promos = [];

    if(!v.customer) v.customer = { regulars: (v.regulars||0), segments:null, inbox:[], reviews:[], lastWeekProcessed:-1 };

    // Reviews
    if(v.reviewBuzz==null) v.reviewBuzz = 0;
    if(!v.reviewStats) v.reviewStats = { avgStars:0, total:0, newThisWeek:0, negativeThisWeek:0 };

    // Inventory
    if(!v.inventory) v.inventory = { autoReorder:true, parWeeks:1.2, storageLevel:1, lastStocktakeWeek:-999, cats:{}, orders:[] };

    // Facilities
    if(!v.facilities) v.facilities = { condition:75, maintenanceLevel:1.0, downtimeWeeks:0, activeIssues:[], equipment:{}, renovation:null };
    if(v.customer){
      if(v.customer.regulars == null) v.customer.regulars = (v.regulars||0);
      if(!v.customer.inbox) v.customer.inbox = [];
      if(!v.customer.reviews) v.customer.reviews = [];
      if(!v.customer.segments) v.customer.segments = null;
      if(v.customer.lastWeekProcessed == null) v.customer.lastWeekProcessed = -1;
    }

    // Menu item price history
    if(Array.isArray(v.menuItems)){
      for(const it of v.menuItems){
        if(it && it.lastPrice == null) it.lastPrice = Number(it.price||0);
      }
    }
  }

  // Keep version at least 4
  if(s.version < 4) s.version = 4;

  if(!s.settings) s.settings = { realism:"realistic" };
  if(!s.settings.realism) s.settings.realism = "realistic";

  return s;
}

export function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function exportSave(state){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  return URL.createObjectURL(blob);
}

export async function importSave(file){
  const txt = await file.text();
  const parsed = JSON.parse(txt);
  return migrate(parsed);
}

export function resetSave(){
  localStorage.removeItem(KEY);
}


// for UI reset button
if(typeof window !== 'undefined'){
  window.__RESIM_DEFAULT_STATE__ = defaultState;
}
