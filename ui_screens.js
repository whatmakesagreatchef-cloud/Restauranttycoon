import { el, money, pct, topTags } from "./ui_components.js";
import { WORLD } from "./data_world.js";
import { VENUE_TYPES, CONCEPT_STYLES } from "./data_venues.js";
import { runWeek } from "./system_sim.js";
import { generateInvestorOffers, acceptInvestorOffer, totalOutsideEquity, setDividendsPolicy, pressureStatus, estimateBuyoutCost, buyOutInvestor, requiresSaleApproval } from "./system_investors.js";
import { generateListings, upfrontCostForLease, estimateOccupancyPct } from "./system_property_market.js";
import { ensureSupplyState, listCategories, suppliersFor, supplierById, setVenueSupplier, setCentralPurchasing, activeContract, createContract, breakContract } from "./system_suppliers.js";
import { ensureInventoryState, ensureVenueInventory, setParWeeks, setAutoReorder, placeOrder, upgradeStorage, stocktake, storageProfile } from "./system_inventory.js";
import { ensureFacilitiesState, ensureVenueFacilities, setMaintenanceLevel, scheduleRenovation, cancelRenovation } from "./system_facilities.js";
import { ensureBrands, listBrands, createBrand, setBrandMode, setBrandStandards, setBrandPlaybook, brandById } from "./system_brands.js";
import { generateCandidates, hireCandidate, fireRole, weeklyWages, stationWages, adjustStationStaff, ensureRoster, rosterWeeklyCost, recommendedPerShift, applyTraining, trainingOptions } from "./system_staff.js";
import { mulberry32, randInt, clamp, pick } from "./rng.js";
import { resolveStaffIssue, ensureStaffEventState } from "./system_staff_events.js";
import { computeMenuMetrics, generateStarterMenu, stationLoads, menuEngineering, estimateTicketTimes, applySafePriceTweaks } from "./system_menu.js";
import { PROMO_TYPES, addPromo } from "./system_promos.js";
import { respondToMessage, ensureCustomerData } from "./system_customers.js";
import { respondToReview } from "./system_reviews.js";
import { inspectionRisk } from "./system_audits.js";
import { AUDIT_ACTIONS } from "./data_audits.js";
import { MENU_CATEGORIES, STATIONS, catName, stationName } from "./data_menu.js";

function cityById(id){ return WORLD.cities.find(c=>c.id===id); }
function venueType(id){ return VENUE_TYPES.find(v=>v.id===id); }
function concept(id){ return CONCEPT_STYLES.find(c=>c.id===id); }

export function render(state, setState){
  const app = document.getElementById("app");
  app.innerHTML = "";

  const topbarMeta = document.getElementById("topbarMeta");
  const city = state.homeCityId ? cityById(state.homeCityId) : null;
  topbarMeta.innerHTML = `<span>Week ${state.week} • Cash ${money(state.cash)}${city ? " • " + escapeHtml(city.name) : ""}</span><button class="helpbtn" data-action="help" title="Setup & tutorials">?</button>`;

  if(state.sold){
    app.appendChild(renderSold(state, setState));
    return;
  }

  switch(state.route){
    case "setup": app.appendChild(screenSetup(state, setState)); break;
    case "world": app.appendChild(screenWorld(state, setState)); break;
    case "venues": app.appendChild(screenVenues(state, setState)); break;
    case "ops": app.appendChild(screenOps(state, setState)); break;
    case "hq": app.appendChild(screenHQ(state, setState)); break;
    case "capital": app.appendChild(screenCapital(state, setState)); break;
    case "sell": app.appendChild(screenSell(state, setState)); break;
    default: app.appendChild(screenWorld(state, setState));}
}


/* -----------------------------
   SETUP & TUTORIALS
------------------------------*/
function screenSetup(state, setState){
  const wrap = document.createElement("div");

  wrap.appendChild(el(`
    <div class="card">
      <div class="h1">Setup & Tutorials</div>
      <div class="small">This sim is deep. Use the guided setup to open your first venue, then run week-by-week ops. You can always come back here from the <b>?</b> button.</div>
      <div class="hr"></div>
      <div class="row" style="gap:10px; flex-wrap:wrap;">
        <button class="btn primary" id="btnStartWizard">Start setup wizard</button>
        <button class="btn" id="btnWalkthrough">Guided walkthrough</button>
        <button class="btn" id="btnQuickStart">Quick start</button>
        <button class="btn" id="btnMarkDone">Skip / I’m good</button>
      </div>
    </div>
  `));

  wrap.appendChild(el(`
    <div class="card" style="margin-top:12px; background:rgba(255,255,255,.03);">
      <div class="h2">How the sim works (30 seconds)</div>
      <div class="small">
        <b>Money</b>: cash is king. Loans boost cash but add payments. Depreciation is non-cash. Tax accrues on profit.<br/>
        <b>Demand</b>: promos + reviews + reputation influence covers. Facilities downtime caps covers.<br/>
        <b>Operations</b>: each week calculates sales, COGS, labour, issues, reviews, compliance, inventory, facilities.
      </div>
    </div>
  `));

  // Tutorial library (tap to expand)
  const topics = [
    { id:"wizard", title:"1) Setup wizard", body:"Acquire a listing (lease or buy), choose whether you keep it or convert, set concept + menu style, then staff hires and launch." },
    { id:"service", title:"2) Service model", body:"Service speed, ticket time, satisfaction and refunds. Stockouts and breakdowns hit speed and satisfaction." },
    { id:"menu", title:"3) Menu + pricing", body:"Adjust pricing, margin, popularity and engineering. High price position can raise spend but can lower demand if reputation is low." },
    { id:"reviews", title:"4) Reviews + reply strategy", body:"Reviews land on different platforms. Replies can recover demand (or make it worse). Viral low-star spikes hit demand for weeks." },
    { id:"staff", title:"5) Staff + issues", body:"Hire roles (GM/Chef/FOH), delegation, morale, absenteeism. Strong leadership reduces weekly headaches." },
    { id:"inventory", title:"6) Inventory", body:"Par levels by category, auto reorder, lead times, reliability delays. Stockouts cause emergency buys + satisfaction penalties. Stocktakes reduce shrink." },
    { id:"facilities", title:"7) Facilities", body:"Maintenance spend, energy costs, condition, breakdowns, renovations. Poor condition increases risk and utilities." },
    { id:"compliance", title:"8) Audits & compliance", body:"Inspections and closure risk. Facilities issues (e.g., fridge failure) can hurt compliance." },
    { id:"empire", title:"9) Empire + sell score", body:"Expand globally or perfect one venue. When you sell, score is based on net worth + prestige (and how you got there)." },
  ];

  wrap.appendChild(el(`
    <div class="card" style="margin-top:12px;">
      <div class="h2">Tutorials</div>
      <div class="small">Tap a topic to open it.</div>
      <div class="hr"></div>
      ${topics.map(t=>`
        <button class="btn" style="width:100%; text-align:left; margin:8px 0;" data-tut="${t.id}">
          <b>${escapeHtml(t.title)}</b><div class="small">${escapeHtml(t.body)}</div>
        </button>
      `).join("")}
    </div>
  `));

  wrap.appendChild(el(`
    <div class="card" style="margin-top:12px; background:rgba(255,255,255,.03);">
      <div class="h2">Recommended first run</div>
      <div class="small">
        1) Start setup wizard → open your first venue<br/>
        2) Run 4–8 weeks → watch Ops snapshots (Accounting / Inventory / Facilities)<br/>
        3) Tune par levels + maintenance<br/>
        4) Expand or refine → then sell when you want your final score
      </div>
    </div>
  `));

  // Buttons
  wrap.querySelector("#btnStartWizard").onclick = ()=>{
    setState(s=>{ s.route="venues"; s._openWizard=true; s.seenSetup=true; return s; });
  };
  const wtBtn = wrap.querySelector("#btnWalkthrough");
  if(wtBtn){
    wtBtn.onclick = ()=>{
      setState(s=>{ s.walkthrough = { active:true, id:"first_venue", step:0 }; s.route="setup"; return s; });
    };
  }
  wrap.querySelector("#btnQuickStart").onclick = ()=>{
    // If no venues, jump to venues acquire
    if((state.venues||[]).length===0){
      setState(s=>{ s.route="venues"; s._openWizard=true; s.seenSetup=true; return s; });
    }else{
      setState(s=>{ s.route="ops"; s.seenSetup=true; return s; });
    }
  };
  wrap.querySelector("#btnMarkDone").onclick = ()=>{
    setState(s=>{ s.seenSetup=true; s.route="world"; return s; });
  };

  // Tutorial click: for now, just navigate to the most relevant screen
  wrap.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-tut]");
    if(!b) return;
    const id = b.getAttribute("data-tut");
    if(id==="wizard") setState(s=>{ s.route="venues"; s._openWizard=true; s.seenSetup=true; return s; });
    else if(id==="inventory" || id==="facilities" || id==="staff" || id==="menu") setState(s=>{ s.route="venues"; s.seenSetup=true; return s; });
    else if(id==="reviews" || id==="service") setState(s=>{ s.route="ops"; s.seenSetup=true; return s; });
    else if(id==="compliance") setState(s=>{ s.route="hq"; s.seenSetup=true; return s; });
    else if(id==="empire") setState(s=>{ s.route="sell"; s.seenSetup=true; return s; });
  });

  return wrap;
}


/* -----------------------------
   WALKTHROUGHS (interactive)
------------------------------*/
const WALKTHROUGHS = {
  first_venue: {
    title: "Open your first venue",
    steps: [
      { route:"setup", selector:"#btnStartWizard", title:"Start the wizard", body:"Tap <b>Start setup wizard</b> to begin acquiring your first venue." },
      { route:"venues", selector:"#wizard", title:"Wizard opened", body:"You’re in the staged setup wizard. We’ll go step-by-step. If you don’t see the wizard, tap <b>Acquire</b>.", ensureWizard:true },
      { route:"venues", selector:"#wizBody", title:"Pick a listing", body:"Choose a listing. <b>Lease shell</b> is cheaper to start; <b>Buy existing</b> is faster but costs more upfront." },
      { route:"venues", selector:"#wizNext", title:"Continue steps", body:"Work through: Brand → Venue → Menu style → Staff. Then tap <b>Acquire</b> at the end." },
      { route:"ops", selector:".card", title:"Run your first week", body:"Now go to <b>Ops</b> and simulate week-by-week. Watch Accounting / Inventory / Facilities snapshots." }
    ]
  }
};

function renderWalkthroughOverlay(state, setState){
  const wt = state.walkthrough || {};
  const def = WALKTHROUGHS[wt.id];
  if(!def) return document.createElement("div");

  const idx = clamp(wt.step||0, 0, def.steps.length-1);
  const step = def.steps[idx];

  // Ensure we're on the right screen
  if(step.route && state.route !== step.route){
    // jump route
    setTimeout(()=>setState(s=>{ s.route = step.route; return s; }), 0);
  }

  // Ensure wizard if requested
  if(step.ensureWizard && state.route==="venues" && !state._openWizard){
    setTimeout(()=>setState(s=>{ s._openWizard = true; return s; }), 0);
  }

  const overlay = document.createElement("div");
  overlay.className = "wtOverlay";

  // Find target element
  let target = null;
  try{
    target = step.selector ? document.querySelector(step.selector) : null;
  }catch(_e){ target = null; }

  if(target){
    const r = target.getBoundingClientRect();
    overlay.style.setProperty("--wt-x", `${Math.max(8, r.left)}px`);
    overlay.style.setProperty("--wt-y", `${Math.max(8, r.top)}px`);
    overlay.style.setProperty("--wt-w", `${Math.max(40, r.width)}px`);
    overlay.style.setProperty("--wt-h", `${Math.max(30, r.height)}px`);
  }else{
    overlay.classList.add("wtNoTarget");
  }

  overlay.innerHTML = `
    <div class="wtShade"></div>
    <div class="wtSpotlight"></div>
    <div class="wtSheet">
      <div class="row" style="justify-content:space-between; gap:10px;">
        <div>
          <div class="h2">${escapeHtml(def.title)}</div>
          <div class="small">Step ${idx+1}/${def.steps.length}: <b>${escapeHtml(step.title||"")}</b></div>
        </div>
        <button class="btn" data-wt="exit">Exit</button>
      </div>
      <div class="hr"></div>
      <div class="small">${step.body||""}</div>
      ${target ? "" : `<div class="small" style="margin-top:8px; opacity:.8;">(Can’t find the highlighted button yet — try scrolling or switching tabs.)</div>`}
      <div class="hr"></div>
      <div class="row" style="gap:10px; flex-wrap:wrap;">
        <button class="btn" data-wt="back" ${idx===0?"disabled":""}>Back</button>
        <button class="btn primary" data-wt="next">${idx===def.steps.length-1 ? "Finish" : "Next"}</button>
      </div>
    </div>
  `;

  overlay.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-wt]");
    if(!b) return;
    const act = b.getAttribute("data-wt");

    if(act==="exit"){
      setState(s=>{ s.walkthrough = { active:false }; return s; });
      return;
    }
    if(act==="back"){
      setState(s=>{ s.walkthrough.step = clamp((s.walkthrough.step||0)-1, 0, 999); return s; });
      return;
    }
    if(act==="next"){
      setState(s=>{
        const last = def.steps.length-1;
        const next = (s.walkthrough.step||0) + 1;
        if(next > last){
          s.walkthrough = { active:false };
          s.seenSetup = true;
          s.route = "ops";
        }else{
          s.walkthrough.step = next;
          // If next step is ops, jump
          const ns = def.steps[next];
          if(ns && ns.route) s.route = ns.route;
        }
        return s;
      });
      return;
    }
  });

  return overlay;
}

/* -----------------------------
   WORLD
------------------------------*/
function screenWorld(state, setState){
  const wrap = document.createElement("div");
  // Business model gate: choose chain vs portfolio before acquiring venues
  ensureBrands(state);
  const needsModel = !!state.homeCityId && !state.brandMode;

  wrap.appendChild(el(`
    <div class="card">
      <div class="h2">World</div>
      <div class="small">Pick a home city. Acquisitions are step-by-step: <b>Location → Venue → Menu style → Staff → Confirm</b>. After setup, each venue gets a <b>Manage</b> panel (the “everything menu”).</div>
    </div>
  `));

  const season = WORLD.seasonality(state.week);
  wrap.appendChild(el(`
    <div class="card">
      <div class="h2">Market conditions</div>
      <div class="small">Seasonality this week: <b>${(season*100).toFixed(0)}%</b></div>
      <div class="small">Higher seasonality = more demand and more stress if your systems aren’t tight.</div>
    </div>
  `));

  for(const c of WORLD.cities){
    const isHome = state.homeCityId === c.id;
    const btn = isHome ? `<button class="btn" disabled>Home City</button>` : `<button class="btn primary" data-home="${c.id}">Set Home</button>`;
    wrap.appendChild(el(`
      <div class="card">
        <div class="row">
          <div>
            <div class="h2">${c.name}</div>
            <div class="small">${c.country} • Demand ${c.baseDemand.toFixed(2)} • Rent ${c.rentIndex.toFixed(2)} • Talent ${c.talentIndex.toFixed(2)} • Critics ${c.criticHarshness.toFixed(2)}</div>
          </div>
          ${btn}
        </div>
      </div>
    `));
  }

  wrap.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-home]");
    if(!btn) return;
    const id = btn.getAttribute("data-home");
    setState(s=>{
      s.homeCityId = id;
      s.logs.push({ week:s.week, type:"world", msg:`Set home city: ${cityById(id).name}` });
      return s;
    });
  });

  return wrap;
}

/* -----------------------------
   VENUES (wizard + manage)
------------------------------*/
function screenVenues(state, setState){
  const wrap = document.createElement("div");

  if(!state.homeCityId){
    wrap.appendChild(el(`<div class="card"><div class="h2">Venues</div><div class="small">Pick a home city first on the World tab.</div></div>`));
    return wrap;
  }

  wrap.appendChild(el(`
    <div class="card">
      <div class="row">
        <div>
          <div class="h2">Venues</div>
          <div class="small">Buy/lease locations. Each acquisition is a guided setup. When finished, use <b>Manage</b> to adjust and review.</div>
        </div>
        <button class="btn primary" id="btnAcquire">Acquire</button>
      </div>
    </div>
  `));

  if(state.venues.length === 0){
    wrap.appendChild(el(`<div class="card"><div class="small">No venues yet. Tap <b>Acquire</b> to start the wizard.</div></div>`));
  }else{
    for(const v of state.venues){
      if(!v.staff) v.staff = { gm:null, chef:null, foh:null };
      if(!v.delegation) v.delegation = { ops:false, menu:false, foh:false };

      const vt = venueType(v.typeId);
      const cs = concept(v.conceptId);

      const staffCount = (v.staff.gm?1:0) + (v.staff.chef?1:0) + (v.staff.foh?1:0);
      const status = `<span class="badge good">Operating</span>`;

      wrap.appendChild(el(`
        <div class="card">
          <div class="row">
            <div>
              <div class="h2">${v.name} ${status}</div>
              <div class="small">${vt.name} • ${cs.name} • <span class="badge">${labelMenuStyle(v.menuStyle || "a_la_carte")}</span> • ${v.acquisitionLabel}</div>
              <div class="small">Rent+outgoings: <b>${money(v.lease.rentWeekly + v.lease.outgoingsWeekly)}/wk</b> • Occupancy: <b>${(v.occupancyPct*100).toFixed(1)}%</b></div>
              <div class="small">Staff: <b>${staffCount}</b> • Wages: <b>${money(weeklyWages(v))}/wk</b></div>
              <div class="small">Local rep ${Math.round(v.localReputation)}/100 • Regulars ${Math.round(v.regulars)} • Stress ${Math.round(v.staffStress)}/100</div>
            </div>
            <div class="row">
              <button class="btn primary" data-manage="${v.id}">Manage</button>
              <button class="btn" data-toggle-owner="${v.id}">${v.ownerRun ? "You’re hands-on" : "You’re hands-off"}</button>
            </div>
          </div>
        </div>
      `));
    }
  }

  // Wizard panel (staged setup)
  const wizard = el(`
    <div class="card" id="wizard" style="display:none;">
      <div class="h2" id="wizTitle">Acquire</div>
      <div class="small" id="wizHint"></div>
      <div class="hr"></div>
      <div id="wizBody"></div>
      <div class="hr"></div>
      <div class="row">
        <button class="btn" id="wizBack">Back</button>
        <button class="btn primary" id="wizNext">Next</button>
        <button class="btn" id="wizClose">Close</button>
      </div>
    </div>
  `);
  wrap.appendChild(wizard);

  // Manage panel (the “everything menu”)
  const manage = el(`
    <div class="card" id="manage" style="display:none;">
      <div class="row">
        <div>
          <div class="h2" id="mgTitle">Manage</div>
          <div class="small" id="mgSub">Adjust, check, and review this venue.</div>
        </div>
        <button class="btn" id="mgClose">Close</button>
      </div>
      <div class="hr"></div>
      <div class="row" style="gap:8px; flex-wrap:wrap;">
        <button class="btn" data-mgtab="overview">Overview</button>
        <button class="btn" data-mgtab="staff">Staff</button>
        <button class="btn" data-mgtab="suppliers">Suppliers</button>
        <button class="btn" data-mgtab="inventory">Inventory</button>
        <button class="btn" data-mgtab="facilities">Facilities</button>
        <button class="btn" data-mgtab="compliance">Compliance</button>
        <button class="btn" data-mgtab="menu">Menu</button>
        <button class="btn" data-mgtab="settings">Settings</button>
          <button class="btn" data-mgtab="marketing">Marketing</button>
          <button class="btn" data-mgtab="customers">Customers</button>
      </div>
      <div class="hr"></div>
      <div id="mgBody"></div>
    </div>
  `);
  wrap.appendChild(manage);

  // Wizard state
  const steps = [
    { id:"location", title:"Location", hint:"Step 1/6 — choose a property listing" },
    { id:"brand", title:"Brand", hint:"Step 2/6 — chain or portfolio brand" },
    { id:"venue", title:"Venue", hint:"Step 3/6 — choose type + concept + positioning" },
    { id:"menu", title:"Menu style", hint:"Step 4/6 — choose service format" },
    { id:"staff", title:"Staff", hint:"Step 5/6 — hire key roles or stay owner-run" },
    { id:"confirm", title:"Confirm", hint:"Step 6/6 — review and acquire" },
  ];

  const wiz = {
    step: 0,
    listing: null,
    acquireMode: null,      // "lease" or "buy"
    keepOrConvert: "keep",  // if buy existing
    typeId: null,
    conceptId: null,
    menuStyle: null,
    pricePosition: 0,
    staffPick: { gm:null, chef:null, foh:null },
    brandId: (wiz.brandId || (state.brandMode==="chain" ? state.chainBrandId : null)),
    newBrandName: "",
    staffCands: { gm:[], chef:[], foh:[] },
  };

  const wizTitle = wizard.querySelector("#wizTitle");
  const wizHint = wizard.querySelector("#wizHint");
  const wizBody = wizard.querySelector("#wizBody");
  const btnBack = wizard.querySelector("#wizBack");
  const btnNext = wizard.querySelector("#wizNext");
  const btnClose = wizard.querySelector("#wizClose");

  function openWizard(){
    wiz.step = 0;
    wiz.listing = null;
    wiz.acquireMode = null;
    wiz.keepOrConvert = "keep";
    wiz.typeId = null;
    wiz.conceptId = null;
    wiz.menuStyle = null;
    wiz.pricePosition = 0;
    wiz.staffPick = { gm:null, chef:null, foh:null };
    wiz.brandId = null;
    wiz.newBrandName = "";
    wiz.staffCands = { gm:[], chef:[], foh:[] };

    wizard.style.display = "block";
    renderWizard();
  }

  // allow external screens (Setup/Tutorials) to request the wizard
  if(state._openWizard){
    openWizard();
    setTimeout(()=>setState(s=>{ delete s._openWizard; return s; }), 0);
  }

  function stepDef(){ return steps[wiz.step]; }

  function renderWizard(){
    const s = stepDef();
    wizTitle.textContent = s.title;
    wizHint.textContent = s.hint;

    btnBack.disabled = (wiz.step === 0);
    btnNext.textContent = (wiz.step === steps.length-1) ? "Acquire" : "Next";

    wizBody.innerHTML = "";
    if(s.id === "location") renderWizLocation();
    if(s.id === "brand") renderWizBrand();
    if(s.id === "venue") renderWizVenue();
    if(s.id === "menu") renderWizMenu();
    if(s.id === "staff") renderWizStaff();
    if(s.id === "confirm") renderWizConfirm();
  }

  function renderWizLocation(){

    const listings = generateListings(state, state.homeCityId);

    wizBody.appendChild(el(`<div class="small">Choose one listing to continue:</div>`));

    for(const l of listings){
      const headline = l.existing ? "Buy existing business" : "Lease shell";
      wizBody.appendChild(el(`
        <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div class="row">
            <div>
              <div><b>${headline}</b> • ${l.districtName}</div>
              <div class="small">${l.shellName} • ${l.sizeSqm}sqm • Foot traffic ${l.footTraffic}/100</div>
              <div class="small">Rent+outgoings: <b>${money(l.rentWeekly + l.outgoingsWeekly)}/wk</b></div>
              ${l.existing ? `<div class="small">Asking: <b>${money(l.existing.askingPrice)}</b></div>` : ``}
            </div>
            <button class="btn primary" data-pick="${l.id}">Pick</button>
          </div>
        </div>
      `));
    }

    if(wiz.listing){
      wizBody.appendChild(el(`<div class="card"><div class="small">Selected: <b>${wiz.listing.districtName}</b> • ${wiz.listing.shellName}</div></div>`));
    }

    wizBody.onclick = (e)=>{
      const b = e.target.closest("[data-pick]");
      if(!b) return;
      const id = b.getAttribute("data-pick");
      wiz.listing = listings.find(x=>x.id===id) || null;
      // reset following steps
      wiz.acquireMode = null;
      wiz.keepOrConvert = "keep";
      wiz.typeId = null;
      wiz.conceptId = null;
      wiz.menuStyle = null;
      wiz.pricePosition = 0;
      wiz.staffPick = { gm:null, chef:null, foh:null };
    wiz.brandId = null;
    wiz.newBrandName = "";
      renderWizard();
    };
  }

  
  function renderWizBrand(){
    ensureBrands(state);

    if(state.brandMode === "chain"){
      wiz.brandId = state.chainBrandId;
      const b = brandById(state, wiz.brandId);
      wizBody.appendChild(el(`
        <div class="card">
          <div class="h2">Brand</div>
          <div class="small">Chain mode: all venues belong to one brand.</div>
          <div class="hr"></div>
          <div class="small">Brand: <b>${escapeHtml(b ? b.name : (state.chainBrandName||"My Brand"))}</b></div>
          <div class="small">Tip: adjust standards in <b>HQ</b> later.</div>
        </div>
      `));
      return;
    }

    const brands = listBrands(state);
    const opts = brands.map(b=>`<option value="${escapeHtml(b.id)}"${b.id===wiz.brandId?' selected':''}>${escapeHtml(b.name)} (std ${Math.round(b.standards||50)})</option>`).join("");

    wizBody.appendChild(el(`
      <div class="card">
        <div class="h2">Brand</div>
        <div class="small">Portfolio mode: attach this venue to an existing brand — or create a new one.</div>
        <div class="hr"></div>

        <label>Attach to existing brand</label>
        <select id="wizBrandPick">
          <option value="">— Create new brand —</option>
          ${opts}
        </select>

        <div class="hr"></div>
        <label>New brand name</label>
        <input id="wizNewBrandName" placeholder="e.g., Corner Table" value="${escapeHtml(wiz.newBrandName||"")}" />

        <div class="small" style="margin-top:8px;">You can adjust standards in <b>HQ</b> anytime.</div>
      </div>
    `));

    const pick = wizBody.querySelector("#wizBrandPick");
    const name = wizBody.querySelector("#wizNewBrandName");
    pick.addEventListener("change", ()=>{ wiz.brandId = pick.value || null; renderWizard(); });
    name.addEventListener("input", ()=>{ wiz.newBrandName = name.value; renderWizard(); });
  }

function renderWizVenue(){
    if(!wiz.listing){
      wizBody.appendChild(el(`<div class="card"><div class="small">Go back and pick a location first.</div></div>`));
      return;
    }

    const canBuy = !!wiz.listing.existing;
    if(!wiz.acquireMode){
      wiz.acquireMode = canBuy ? "buy" : "lease";
    }

    wizBody.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div><b>Deal</b></div>
        <label>Acquire mode</label>
        <select id="acqMode">
          <option value="lease"${wiz.acquireMode==="lease"?" selected":""}>Lease (shell)</option>
          <option value="buy"${wiz.acquireMode==="buy"?" selected":""}${canBuy?"":" disabled"}>Buy existing business</option>
        </select>
      </div>
    `));

    if(wiz.acquireMode === "buy"){
      wizBody.appendChild(el(`
        <div class="card" style="background:rgba(255,255,255,.03);">
          <div><b>Existing business</b></div>
          <div class="small">Asking: <b>${money(wiz.listing.existing.askingPrice)}</b></div>
          <label>Keep or convert</label>
          <select id="keepConvert">
            <option value="keep"${wiz.keepOrConvert==="keep"?" selected":""}>Keep as-is</option>
            <option value="convert"${wiz.keepOrConvert==="convert"?" selected":""}>Convert / rebrand</option>
          </select>
        </div>
      `));
    }

    // lock venue settings if keeping as-is
    const lock = (wiz.acquireMode==="buy" && wiz.keepOrConvert==="keep");
    if(lock){
      wiz.typeId = wiz.listing.existing.typeId;
      wiz.conceptId = wiz.listing.existing.conceptId;
    }else{
      if(!wiz.typeId) wiz.typeId = wiz.listing.permittedUses[0];
      if(!wiz.conceptId) wiz.conceptId = CONCEPT_STYLES[0].id;
    }

    const typeOptions = wiz.listing.permittedUses.map(id=>{
      const t = venueType(id);
      if(!t) return "";
      const sel = (id===wiz.typeId) ? " selected" : "";
      return `<option value="${id}"${sel}>${t.name}</option>`;
    }).join("");

    const conceptOptions = CONCEPT_STYLES.map(c=>{
      const sel = (c.id===wiz.conceptId) ? " selected" : "";
      return `<option value="${c.id}"${sel}>${c.name}</option>`;
    }).join("");

    wizBody.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div><b>Venue</b></div>
        <label>Type</label>
        <select id="typeSel" ${lock?"disabled":""}>${typeOptions}</select>
        <label>Concept</label>
        <select id="conceptSel" ${lock?"disabled":""}>${conceptOptions}</select>
        <label>Price position</label>
        <select id="priceSel">
          <option value="-10"${wiz.pricePosition===-10?" selected":""}>Value (-10%)</option>
          <option value="0"${wiz.pricePosition===0?" selected":""}>Market (0%)</option>
          <option value="10"${wiz.pricePosition===10?" selected":""}>Premium (+10%)</option>
          <option value="20"${wiz.pricePosition===20?" selected":""}>High-end (+20%)</option>
        </select>
      </div>
    `));

    const acqMode = wizBody.querySelector("#acqMode");
    const keepConvert = wizBody.querySelector("#keepConvert");
    const typeSel = wizBody.querySelector("#typeSel");
    const conceptSel = wizBody.querySelector("#conceptSel");
    const priceSel = wizBody.querySelector("#priceSel");

    acqMode.onchange = ()=>{
      wiz.acquireMode = acqMode.value;
      renderWizard();
    };
    if(keepConvert){
      keepConvert.onchange = ()=>{
        wiz.keepOrConvert = keepConvert.value;
        renderWizard();
      };
    }
    if(typeSel) typeSel.onchange = ()=>{ wiz.typeId = typeSel.value; };
    if(conceptSel) conceptSel.onchange = ()=>{ wiz.conceptId = conceptSel.value; };
    priceSel.onchange = ()=>{ wiz.pricePosition = Number(priceSel.value); };
  }

  function renderWizMenu(){
    if(!wiz.typeId || !wiz.conceptId){
      wizBody.appendChild(el(`<div class="card"><div class="small">Go back and choose venue settings first.</div></div>`));
      return;
    }

    const options = [
      { id:"a_la_carte", name:"À la carte" },
      { id:"tasting", name:"Tasting menu" },
      { id:"counter", name:"Counter / fast casual" },
      { id:"pub", name:"Pub service" },
      { id:"cafe", name:"Cafe / all-day" },
      { id:"truck", name:"Food truck window" },
      { id:"hotel", name:"Hotel all-day" },
      { id:"winery", name:"Winery lunch" },
    ];

    if(!wiz.menuStyle){
      wiz.menuStyle =
        wiz.typeId==="food_truck" ? "truck" :
        wiz.typeId==="cafe" ? "cafe" :
        wiz.typeId==="pub_kitchen" ? "pub" :
        wiz.typeId==="fine_dining" ? "tasting" :
        "a_la_carte";
    }

    wizBody.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div><b>Menu style</b></div>
        <div class="small">This sets the service rhythm. (Full menu builder is the next stage.)</div>
        <label>Service format</label>
        <select id="menuStyleSel">
          ${options.map(o=>`<option value="${o.id}"${o.id===wiz.menuStyle?" selected":""}>${o.name}</option>`).join("")}
        </select>
      </div>
    `));

    wizBody.querySelector("#menuStyleSel").onchange = (e)=>{ wiz.menuStyle = e.target.value; };
  }

  function renderWizStaff(){
    if(!wiz.listing){
      wizBody.appendChild(el(`<div class="card"><div class="small">Missing location.</div></div>`));
      return;
    }

    const vTmp = { id:"tmp", cityId: state.homeCityId };
    // deterministic candidates per step
    const cands = generateCandidates(state, vTmp);

    wiz.staffCands = {
      gm: cands.filter(x=>x.roleId==="gm"),
      chef: cands.filter(x=>x.roleId==="chef"),
      foh: cands.filter(x=>x.roleId==="foh"),
    };

    wizBody.appendChild(el(`<div class="card" style="background:rgba(255,255,255,.03);"><div><b>Key roles</b></div><div class="small">Pick now or stay owner-run. Hires add fixed wages but reduce complaints and stress over time.</div></div>`));

    wizBody.appendChild(rolePicker("General Manager", "gm", wiz.staffCands.gm, wiz.staffPick.gm));
    wizBody.appendChild(rolePicker("Head Chef", "chef", wiz.staffCands.chef, wiz.staffPick.chef));
    wizBody.appendChild(rolePicker("FOH Lead", "foh", wiz.staffCands.foh, wiz.staffPick.foh));

    wizBody.onchange = (e)=>{
      const sel = e.target.closest("[data-role]");
      if(!sel) return;
      const role = sel.getAttribute("data-role");
      const id = sel.value;
      const list = wiz.staffCands[role] || [];
      const cand = list.find(x=>x.id===id) || null;
      wiz.staffPick[role] = cand;
    };
  }

  function rolePicker(label, roleKey, candidates, picked){
    const pickId = picked?.id || "";
    const opts = [`<option value="">Owner handles it (for now)</option>`].concat(
      candidates.map(c=>`<option value="${c.id}"${c.id===pickId?" selected":""}>${c.name} • ${money(c.wageWeekly)}/wk • score ${c.score}/100</option>`)
    ).join("");

    return el(`
      <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
        <div><b>${label}</b></div>
        <label>Select</label>
        <select data-role="${roleKey}">${opts}</select>
      </div>
    `);
  }

  function renderWizConfirm(){
    if(!wiz.listing || !wiz.typeId || !wiz.conceptId || !wiz.menuStyle){
      wizBody.appendChild(el(`<div class="card"><div class="small">Missing steps. Go back and complete the setup.</div></div>`));
      return;
    }

    const t = venueType(wiz.typeId);
    const cs = concept(wiz.conceptId);

    const isExisting = !!wiz.listing.existing && wiz.acquireMode==="buy";
    const keep = isExisting && wiz.keepOrConvert==="keep";

    let capex = 0;
    if(!isExisting){
      capex = Math.round(t.capexBase * 0.35 * (wiz.listing.approvals==="strict"?1.10:wiz.listing.approvals==="standard"?1.05:1.00));
    }else{
      capex = keep ? Math.round(t.capexBase * 0.06) : Math.round(t.capexBase * 0.18);
    }

    const leaseUpfront = upfrontCostForLease(wiz.listing, capex);
    const purchase = isExisting ? wiz.listing.existing.askingPrice : 0;
    const totalUpfront = leaseUpfront + purchase;

    const expectedSales = (t.capBase * 0.95) * (t.avgSpendBase * (1 + Number(wiz.pricePosition)/100)) * (0.85 + wiz.listing.footTraffic/200);
    const occPct = estimateOccupancyPct(wiz.listing, expectedSales);

    const hires = [wiz.staffPick.gm, wiz.staffPick.chef, wiz.staffPick.foh].filter(Boolean);
    const wages = hires.reduce((a,x)=>a+(x.wageWeekly||0),0);

    wizBody.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div><b>Review</b></div>
        <div class="small">${wiz.listing.districtName} • ${wiz.listing.shellName} • Rent+outgoings ${money(wiz.listing.rentWeekly + wiz.listing.outgoingsWeekly)}/wk</div>
        <div class="small">Venue: <b>${t.name}</b> • Concept: <b>${cs.name}</b> • Menu style: <b>${labelMenuStyle(wiz.menuStyle)}</b> • Price: <b>${wiz.pricePosition>=0?"+":""}${wiz.pricePosition}%</b></div>
        <div class="hr"></div>
        <div>Upfront: <b>${money(totalUpfront)}</b> (${money(leaseUpfront)} lease+capex${isExisting?`, ${money(purchase)} purchase`:""})</div>
        <div>Estimated occupancy: <b class="${occPct<=0.10?"good":(occPct<=0.12?"warn":"bad")}">${(occPct*100).toFixed(1)}%</b></div>
        <div>Hires: <b>${hires.length}</b> • Fixed wages: <b>${money(wages)}/wk</b></div>
        <div class="small" style="margin-top:8px;">${state.cash >= totalUpfront ? "You can afford this deal." : "Not enough cash yet."}</div>
      </div>
    `));
  }

  function canNext(){
    const s = stepDef().id;
    if(s==="location") return !!wiz.listing;
    if(s==="brand"){
      if(state.brandMode==="chain") return true;
      return (!!wiz.brandId) || ((wiz.newBrandName||"").trim().length>=3);
    }
    if(s==="venue") return !!wiz.acquireMode && !!wiz.typeId && !!wiz.conceptId;
    if(s==="menu") return !!wiz.menuStyle;
    if(s==="staff") return true;
    if(s==="confirm"){
      // affordability gate
      const t = venueType(wiz.typeId);
      const isExisting = !!wiz.listing.existing && wiz.acquireMode==="buy";
      const keep = isExisting && wiz.keepOrConvert==="keep";

      let capex = 0;
      if(!isExisting) capex = Math.round(t.capexBase * 0.35);
      else capex = keep ? Math.round(t.capexBase * 0.06) : Math.round(t.capexBase * 0.18);

      const leaseUpfront = upfrontCostForLease(wiz.listing, capex);
      const purchase = isExisting ? wiz.listing.existing.askingPrice : 0;
      return state.cash >= (leaseUpfront + purchase);
    }
    return true;
  }

  btnBack.onclick = ()=>{
    if(wiz.step>0){ wiz.step--; renderWizard(); }
  };

  btnNext.onclick = ()=>{
    if(!canNext()){
      alert("Finish this step first (or you may not have enough cash).");
      return;
    }
    if(wiz.step < steps.length-1){
      wiz.step++;
      renderWizard();
      return;
    }
    acquireNow();
  };

  btnClose.onclick = ()=>{ wizard.style.display = "none"; };

  function acquireNow(){
    const t = venueType(wiz.typeId);
    const cs = concept(wiz.conceptId);

    const isExisting = !!wiz.listing.existing && wiz.acquireMode==="buy";
    const keep = isExisting && wiz.keepOrConvert==="keep";

    let capex = 0;
    if(!isExisting){
      capex = Math.round(t.capexBase * 0.35 * (wiz.listing.approvals==="strict"?1.10:wiz.listing.approvals==="standard"?1.05:1.00));
    }else{
      capex = keep ? Math.round(t.capexBase * 0.06) : Math.round(t.capexBase * 0.18);
    }

    const leaseUpfront = upfrontCostForLease(wiz.listing, capex);
    const purchase = isExisting ? wiz.listing.existing.askingPrice : 0;
    const totalUpfront = leaseUpfront + purchase;

    if(state.cash < totalUpfront){
      alert("Not enough cash.");
      return;
    }

    const expectedSales = (t.capBase * 0.95) * (t.avgSpendBase * (1 + Number(wiz.pricePosition)/100)) * (0.85 + wiz.listing.footTraffic/200);
    const occPct = estimateOccupancyPct(wiz.listing, expectedSales);

    const rng = mulberry32(state.seed + state.week*12345 + state.venues.length*77 + wiz.listing.sizeSqm);
    const name = generateVenueName(rng, t.name, cs.name, state.venues.length + 1);

    // Base stats (inherit vs new)
    let localReputation = 50;
    let regulars = 0;
    let fitoutQuality = clamp(50 + randInt(rng,-5,15), 20, 95);
    let chefSkill = 46;
    let managerSkill = 42;
    let cleanliness = 60;
    let procurementSkill = 35;
    let wastePct = 0.10;
    let staffStress = 30;

    let acquisitionLabel = !isExisting ? "New lease" : (keep ? "Bought (kept as-is)" : "Bought (converted)");

    if(isExisting){
      localReputation = wiz.listing.existing.localReputation;
      regulars = wiz.listing.existing.regulars;
      fitoutQuality = wiz.listing.existing.fitoutQuality;
      chefSkill = wiz.listing.existing.chefSkill;
      managerSkill = wiz.listing.existing.managerSkill;
      cleanliness = wiz.listing.existing.cleanliness;
      procurementSkill = clamp(35 + (wiz.listing.existing.supplierStability-50)*0.4 + randInt(rng,-6,6), 0, 100);
      wastePct = clamp(0.08 + (70 - procurementSkill)*0.001 + randInt(rng,-1,2)/100, 0.03, 0.14);
      staffStress = clamp(40 + randInt(rng,-15,20), 0, 100);

      if(!keep){
        regulars = Math.round(regulars * 0.35);
        localReputation = clamp(localReputation - 12, 0, 100);
        staffStress = clamp(staffStress + 18, 0, 100);
        cleanliness = clamp(cleanliness - 6, 0, 100);
        fitoutQuality = clamp(fitoutQuality + 6, 20, 95);
      }
    }

    const lease = {
      listingId: wiz.listing.id,
      rentWeekly: wiz.listing.rentWeekly,
      outgoingsWeekly: wiz.listing.outgoingsWeekly,
      leaseTermYears: wiz.listing.leaseTermYears,
      leaseType: wiz.listing.leaseType,
      rentReview: wiz.listing.rentReview,
      rentReviewName: wiz.listing.rentReviewName,
      makeGood: wiz.listing.makeGood,
      makeGoodName: wiz.listing.makeGoodName,
      approvals: wiz.listing.approvals,
      approvalsName: wiz.listing.approvalsName,
      districtId: wiz.listing.districtId,
      districtName: wiz.listing.districtName,
      shellType: wiz.listing.shellType,
      shellName: wiz.listing.shellName
    };

    setState(s=>{
      s.cash -= totalUpfront;

      const id = `v_${Date.now()}_${Math.floor(rng()*1e6)}`;
      // Accounting: capitalize upfront costs
      if(capex>0) addFixedAsset(s, id, "Fit-out", capex, 260);
      if(purchase>0) addFixedAsset(s, id, "Goodwill", purchase, 520);

      if(s.brandMode === "portfolio" && !wiz.brandId){
        wiz.brandId = createBrand(s, wiz.newBrandName || name);
      }
      if(s.brandMode === "chain" && !wiz.brandId){
        ensureBrands(s);
        wiz.brandId = s.chainBrandId;
      }

      s.venues.push({
        id,
        name,
        cityId: s.homeCityId,
        brandId: wiz.brandId,

        typeId: t.id,
        conceptId: cs.id,

        menuStyle: wiz.menuStyle,
        acquisitionLabel,

        ownerRun: true,

        localReputation,
        regulars,

        fitoutQuality,
        pricePosition: wiz.pricePosition,
        procurementSkill,
        wastePct,
        chefSkill,
        managerSkill,
        cleanliness,
        staffStress,

        footTraffic: wiz.listing.footTraffic,

        lease,
        leaseYearsRemaining: wiz.listing.leaseTermYears,
        occupancyPct: occPct,

        equipmentDebt: false,

        staff: { gm:null, chef:null, foh:null },
        delegation: { ops:false, menu:false, foh:false }
      });

      // Apply wizard hires
      if(wiz.staffPick.gm) hireCandidate(s, id, wiz.staffPick.gm);
      if(wiz.staffPick.chef) hireCandidate(s, id, wiz.staffPick.chef);
      if(wiz.staffPick.foh) hireCandidate(s, id, wiz.staffPick.foh);

      s.logs.push({ week:s.week, type:"venues", msg:`Acquired: ${name} • Upfront ${money(totalUpfront)} • Occupancy ${(occPct*100).toFixed(1)}%` });
      return s;
    });

    wizard.style.display = "none";
  }

  /* -----------------------------
     MANAGE PANEL
  ------------------------------*/
  let mgVenueId = null;
  let mgTab = "overview";

  const mgTitle = manage.querySelector("#mgTitle");
  const mgSub = manage.querySelector("#mgSub");
  const mgBody = manage.querySelector("#mgBody");

  function openManage(venueId, tab="overview"){
    mgVenueId = venueId;
    mgTab = tab;
    manage.style.display = "block";
    renderManage();
  }

  function renderManage(){
    const v = state.venues.find(x=>x.id===mgVenueId);
    if(!v){ manage.style.display="none"; return; }

    if(!v.staff) v.staff = { gm:null, chef:null, foh:null };
    if(!v.delegation) v.delegation = { ops:false, menu:false, foh:false };

    const vt = venueType(v.typeId);
    const cs = concept(v.conceptId);

    mgTitle.textContent = `Manage: ${v.name}`;
    mgSub.textContent = `${vt.name} • ${cs.name} • ${labelMenuStyle(v.menuStyle || "a_la_carte")}`;

    mgBody.innerHTML = "";
    if(mgTab === "overview") mgBody.appendChild(manageOverview(v));
    if(mgTab === "staff") mgBody.appendChild(manageStaff(v, state, setState, ()=>openManage(v.id,"staff")));
    if(mgTab === "suppliers") mgBody.appendChild(manageSuppliers(v, state, setState));
    if(mgTab === "inventory") mgBody.appendChild(manageInventory(v, state, setState));
    if(mgTab === "facilities") mgBody.appendChild(manageFacilities(v, state, setState));
    if(mgTab === "compliance") mgBody.appendChild(manageCompliance(v, state, setState));
    if(mgTab === "menu") mgBody.appendChild(manageMenu(v, state, setState));
    if(mgTab === "settings") mgBody.appendChild(manageSettings(v));
  }

  function manageOverview(v){
    const staffCount = (v.staff.gm?1:0)+(v.staff.chef?1:0)+(v.staff.foh?1:0);
    const card = el(`
      <div>
        <div class="card" style="background:rgba(255,255,255,.03);">
          <div class="h2">Snapshot</div>
          <div class="small">Cash impact is weekly via Ops. Adjustments here affect future simulation.</div>
          <div class="hr"></div>
          <div class="small">Rent+outgoings: <b>${money(v.lease.rentWeekly + v.lease.outgoingsWeekly)}/wk</b></div>
          <div class="small">Fixed wages: <b>${money(weeklyWages(v))}/wk</b> • Staff count: <b>${staffCount}</b></div>
          <div class="small">Local rep: <b>${Math.round(v.localReputation)}/100</b> • Regulars: <b>${Math.round(v.regulars)}</b> • Stress: <b>${Math.round(v.staffStress)}/100</b></div>
          <div class="hr"></div>
          <div class="small">Delegation — Ops: <b>${v.delegation.ops?"yes":"no"}</b>, Menu: <b>${v.delegation.menu?"yes":"no"}</b>, FOH: <b>${v.delegation.foh?"yes":"no"}</b></div>
        </div>

        <div class="card" style="background:rgba(255,255,255,.03);">
          <div class="h2">Quick adjustments</div>
          <label>Price position</label>
          <select id="mgPrice">
            <option value="-10"${v.pricePosition===-10?" selected":""}>Value (-10%)</option>
            <option value="0"${v.pricePosition===0?" selected":""}>Market (0%)</option>
            <option value="10"${v.pricePosition===10?" selected":""}>Premium (+10%)</option>
            <option value="20"${v.pricePosition===20?" selected":""}>High-end (+20%)</option>
          </select>

          <div class="row" style="margin-top:10px;">
            <button class="btn" id="mgToggleOwner">${v.ownerRun ? "Switch to hands-off" : "Switch to hands-on"}</button>
          </div>
          <div class="small" style="margin-top:8px;">Hands-off reduces owner dependence over time, but requires staff/delegation to stay stable.</div>
        </div>
      </div>
    `);

    // bind
    card.querySelector("#mgPrice").onchange = (e)=>{
      const val = Number(e.target.value);
      setState(s=>{
        const vv = s.venues.find(x=>x.id===v.id);
        if(!vv) return s;
        vv.pricePosition = val;
        s.logs.push({ week:s.week, type:"venues", msg:`Price position set at ${vv.name}: ${val}%` });
        return s;
      });
    };

    card.querySelector("#mgToggleOwner").onclick = ()=>{
      setState(s=>{
        const vv = s.venues.find(x=>x.id===v.id);
        if(!vv) return s;
        vv.ownerRun = !vv.ownerRun;
        s.logs.push({ week:s.week, type:"staff", msg:`Owner mode at ${vv.name}: ${vv.ownerRun ? "hands-on" : "hands-off"}` });
        return s;
      });
    };

    retfunction manageMenu(v, state, setState){
    // 3-step mini-wizard inside Manage → Menu
    // Step 1: Starter menu
    // Step 2: Edit items
    // Step 3: Review
    if(!v.menuStep) v.menuStep = (v.menuItems && v.menuItems.length) ? 2 : 1;
    if(!v.menuItems) v.menuItems = [];

    const wrap = document.createElement("div");

    const metrics = computeMenuMetrics(v);

    wrap.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="h2">Menu Builder</div>
        <div class="small">Build your menu item-by-item. This directly affects spend, food cost, labour pressure, speed, and reviews.</div>
        <div class="hr"></div>
        <div class="row" style="gap:8px; flex-wrap:wrap;">
          <button class="btn ${v.menuStep===1?'primary':''}" data-menustep="1">1) Start</button>
          <button class="btn ${v.menuStep===2?'primary':''}" data-menustep="2">2) Items</button>
          <button class="btn ${v.menuStep===3?'primary':''}" data-menustep="3">3) Review</button>
        </div>
      </div>
    `));

    const body = document.createElement("div");
    wrap.appendChild(body);

    function render(){
      body.innerHTML = "";
      const step = v.menuStep || 1;
      if(step===1) body.appendChild(stepStart());
      if(step===2) body.appendChild(stepItems());
      if(step===3) body.appendChild(stepReview());
    }

    function stepStart(){
      const has = (v.menuItems||[]).length > 0;

      const card = el(`
        <div class="card" style="background:rgba(255,255,255,.03);">
          <div><b>Starter menu</b></div>
          <div class="small">Choose a template to get going fast, or start blank. You can edit everything later.</div>
          <div class="hr"></div>
          <div class="row">
            <button class="btn primary" id="btnGen">Generate starter menu</button>
            <button class="btn" id="btnBlank">Start blank</button>
            ${has ? `<button class="btn danger" id="btnClear">Clear menu</button>` : ``}
          </div>
          <div class="small" style="margin-top:8px;">Current items: <b>${(v.menuItems||[]).length}</b></div>
        </div>
      `);

      card.querySelector("#btnGen").onclick = ()=>{
        setState(s=>{
          const vv = s.venues.find(x=>x.id===v.id);
          if(!vv) return s;
          vv.menuItems = generateStarterMenu(s, vv);
          vv.menuStep = 2;
          s.logs.push({ week:s.week, type:"menu", msg:`Generated starter menu at ${vv.name} (${vv.menuItems.length} items)` });
          return s;
        });
      };

      card.querySelector("#btnBlank").onclick = ()=>{
        setState(s=>{
          const vv = s.venues.find(x=>x.id===v.id);
          if(!vv) return s;
          vv.menuItems = vv.menuItems || [];
          vv.menuStep = 2;
          s.logs.push({ week:s.week, type:"menu", msg:`Started blank menu at ${vv.name}` });
          return s;
        });
      };

      const clr = card.querySelector("#btnClear");
      if(clr){
        clr.onclick = ()=>{
          if(!confirm("Clear all menu items?")) return;
          setState(s=>{
            const vv = s.venues.find(x=>x.id===v.id);
            if(!vv) return s;
            vv.menuItems = [];
            vv.menuStep = 1;
            s.logs.push({ week:s.week, type:"menu", msg:`Cleared menu at ${vv.name}` });
            return s;
          });
        };
      }

      return card;
    }

    function stepItems(){
      const card = document.createElement("div");

      card.appendChild(el(`
        <div class="card" style="background:rgba(255,255,255,.03);">
          <div class="row">
            <div>
              <div class="h2">Menu items</div>
              <div class="small">Tap an item to edit. Add items to balance stations and improve flow.</div>
            </div>
            <button class="btn primary" id="btnAdd">Add item</button>
          </div>
        </div>
      `));

      // quick summary
      const m = computeMenuMetrics(v);
      card.appendChild(el(`
        <div class="card" style="background:rgba(255,255,255,.03);">
          <div class="small">Avg spend/cover: <b>${money(m.avgSpendPerCover)}</b> • Food cost: <b>${pct(m.foodCostPct)}</b> • Prep load: <b>${Math.round(m.prepLoad)}/100</b> • Station imbalance: <b>${Math.round(m.stationImbalance)}/100</b></div>
        </div>
      `));

      // list
      const list = document.createElement("div");
      const items = (v.menuItems||[]);

      if(items.length===0){
        list.appendChild(el(`<div class="card"><div class="small">No items yet. Add your first dish.</div></div>`));
      }else{
        for(const it of items){
          list.appendChild(el(renderItemRow(it)));
        }
      }
      card.appendChild(list);

      // editor modal
      const editor = el(`
        <div class="card" id="menuEditor" style="display:none; background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.12);">
          <div class="h2" id="edTitle">Edit item</div>
          <div class="small">Save updates affect simulation immediately.</div>
          <div class="hr"></div>

          <label>Name</label>
          <input id="edName" placeholder="e.g., Roast chicken + jus" />

          <label>Category</label>
          <select id="edCat">
            ${MENU_CATEGORIES.map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}
          </select>

          <label>Station</label>
          <select id="edStation">
            ${STATIONS.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}
          </select>

          <div class="row">
            <div style="flex:1">
              <label>Price</label>
              <input id="edPrice" type="number" inputmode="decimal" step="0.5" />
            </div>
            <div style="flex:1">
              <label>Cost</label>
              <input id="edCost" type="number" inputmode="decimal" step="0.5" />
            </div>
          </div>

          <label>Prep complexity (0-100)</label>
          <input id="edPrep" type="range" min="0" max="100" />
          <div class="small">Lower = faster, higher = more complex.</div>

          <label>Popularity (1-5)</label>
          <input id="edPop" type="range" min="1" max="5" />

          <label><input id="edActive" type="checkbox" /> Active (sell this item)</label>

          <div class="row" style="margin-top:10px;">
            <button class="btn" id="edCancel">Cancel</button>
            <button class="btn primary" id="edSave">Save</button>
            <button class="btn danger" id="edDelete">Delete</button>
          </div>
        </div>
      `);
      card.appendChild(editor);

      let editingId = null;

      function openEditor(item){
        editingId = item.id;
        editor.style.display = "block";
        editor.querySelector("#edTitle").textContent = "Edit item";
        editor.querySelector("#edName").value = item.name || "";
        editor.querySelector("#edCat").value = item.category || "mains";
        editor.querySelector("#edStation").value = item.station || "pan";
        editor.querySelector("#edPrice").value = Number(item.price||0);
        editor.querySelector("#edCost").value = Number(item.cost||0);
        editor.querySelector("#edPrep").value = Number(item.prep ?? 50);
        editor.querySelector("#edPop").value = Number(item.popularity ?? 3);
        editor.querySelector("#edActive").checked = (item.active !== false);
      }

      function closeEditor(){
        editor.style.display = "none";
        editingId = null;
      }

      editor.querySelector("#edCancel").onclick = closeEditor;

      editor.querySelector("#edSave").onclick = ()=>{
        const patch = {
          name: editor.querySelector("#edName").value.trim() || "Untitled item",
          category: editor.querySelector("#edCat").value,
          station: editor.querySelector("#edStation").value,
          price: Number(editor.querySelector("#edPrice").value||0),
          cost: Number(editor.querySelector("#edCost").value||0),
          prep: Number(editor.querySelector("#edPrep").value||50),
          popularity: Number(editor.querySelector("#edPop").value||3),
          active: editor.querySelector("#edActive").checked
        };

        setState(s=>{
          const vv = s.venues.find(x=>x.id===v.id);
          if(!vv) return s;
          const it = (vv.menuItems||[]).find(x=>x.id===editingId);
          if(!it) return s;
          Object.assign(it, patch);
          s.logs.push({ week:s.week, type:"menu", msg:`Updated menu item at ${vv.name}: ${it.name}` });
          return s;
        });

        closeEditor();
      };

      editor.querySelector("#edDelete").onclick = ()=>{
        if(!confirm("Delete this item?")) return;
        setState(s=>{
          const vv = s.venues.find(x=>x.id===v.id);
          if(!vv) return s;
          vv.menuItems = (vv.menuItems||[]).filter(x=>x.id!==editingId);
          s.logs.push({ week:s.week, type:"menu", msg:`Deleted menu item at ${vv.name}` });
          return s;
        });
        closeEditor();
      };

      // add button
      card.querySelector("#btnAdd").onclick = ()=>{
        const id = "mi_" + Date.now() + "_" + Math.floor(Math.random()*1e6);
        const newItem = { id, name:"New item", category:"mains", station:"pan", price:20, cost:7, prep:50, popularity:3, active:true, isSpecial:false };
        setState(s=>{
          const vv = s.venues.find(x=>x.id===v.id);
          if(!vv) return s;
          vv.menuItems = vv.menuItems || [];
          vv.menuItems.unshift(newItem);
          s.logs.push({ week:s.week, type:"menu", msg:`Added menu item at ${vv.name}` });
          return s;
        });
        // open editor on next tick by re-rendering
      };

      // click list opens editor
      list.onclick = (e)=>{
        const row = e.target.closest("[data-item]");
        if(!row) return;
        const id = row.getAttribute("data-item");
        const item = (v.menuItems||[]).find(x=>x.id===id);
        if(item) openEditor(item);
      };

      return card;
    }

    function renderItemRow(it){
      const price = money(it.price||0);
      const fc = (it.price>0) ? pct((it.cost||0)/Math.max(1,it.price)) : "—";
      const active = (it.active !== false);
      return `
        <div class="card" data-item="${it.id}" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div class="row">
            <div>
              <div><b>${escapeHtml(it.name||"Untitled")}</b> ${active ? "" : "<span class='badge warn'>inactive</span>"}</div>
              <div class="small">${catName(it.category||"mains")} • ${stationName(it.station||"pan")} • Price ${price} • Food cost ${fc}</div>
              <div class="small">Prep ${Math.round(it.prep ?? 50)}/100 • Popularity ${it.popularity ?? 3}/5</div>
            </div>
            <div class="small" style="opacity:.8;">Edit</div>
          </div>
        </div>
      `;
    }

    function stepReview(){
      const m = computeMenuMetrics(v);

      const card = document.createElement("div");

      card.appendChild(el(`
        <div class="card" style="background:rgba(255,255,255,.03);">
          <div class="h2">Menu impact</div>
          <div class="small">These are the numbers feeding into your weekly simulation.</div>
          <div class="hr"></div>
          <div class="kpis">
            <div class="kpi"><div class="label">Items</div><div class="value">${m.itemCount}</div></div>
            <div class="kpi"><div class="label">Spend/cover</div><div class="value">${money(m.avgSpendPerCover)}</div></div>
            <div class="kpi"><div class="label">Food cost</div><div class="value ${m.foodCostPct<=0.32?'good':(m.foodCostPct<=0.36?'warn':'bad')}">${pct(m.foodCostPct)}</div></div>
            <div class="kpi"><div class="label">Prep load</div><div class="value ${m.prepLoad<=55?'good':(m.prepLoad<=70?'warn':'bad')}">${Math.round(m.prepLoad)}/100</div></div>
          </div>
          <div class="hr"></div>
          <div class="small">Station imbalance: <b class="${m.stationImbalance<=45?'good':(m.stationImbalance<=65?'warn':'bad')}">${Math.round(m.stationImbalance)}/100</b> • Variety: <b>${Math.round(m.varietyScore)}/100</b></div>
        </div>
      `));

      
      // Station load + ticket times
      const loads = stationLoads(v);
      const tt = estimateTicketTimes(v);

      const loadCard = document.createElement("div");
      loadCard.className = "card";
      loadCard.style.background = "rgba(255,255,255,.03)";
      loadCard.appendChild(el(`<div class="h2">Flow & ticket times</div><div class="small">Bottlenecks come from uneven stations and high prep load.</div><div class="hr"></div>`));

      loadCard.appendChild(el(`<div class="small">Estimated ticket time: <b class="${tt.label==="fast"?"good":(tt.label==="okay"?"warn":"bad")}">${tt.avgMinutes.toFixed(0)} min</b> avg • <b>${tt.p95Minutes.toFixed(0)} min</b> p95</div>`));

      if(loads.length){
        loadCard.appendChild(el(`<div class="hr"></div><div class="small"><b>Station load</b></div>`));
        for(const l of loads){
          const pctLabel = (l.pct*100).toFixed(0);
          const bar = el(`
            <div style="margin:10px 0;">
              <div class="row" style="justify-content:space-between;">
                <div class="small">${stationName(l.station)}</div>
                <div class="small">${pctLabel}%</div>
              </div>
              <div class="bar"><div style="width:${pctLabel}%;"></div></div>
            </div>
          `);
          loadCard.appendChild(bar);
        }
      }

      card.appendChild(loadCard);

      // Menu engineering
      const eng = menuEngineering(v.menuItems || []);
      const engCard = document.createElement("div");
      engCard.className = "card";
      engCard.style.background = "rgba(255,255,255,.03)";
      engCard.appendChild(el(`<div class="h2">Menu engineering</div><div class="small">Stars / Plowhorses / Puzzles / Dogs</div><div class="hr"></div>`));

      if(eng.rows.length){
        // quick actions
        engCard.appendChild(el(`
          <div class="row">
            <button class="btn primary" id="btnPriceTweaks">Apply safe price tweaks</button>
            <div class="small" style="opacity:.9;">Adjusts a few <b>plowhorse</b> items (+$0.50 to +$2) to protect margin.</div>
          </div>
          <div class="hr"></div>
        `));

        // list
        for(const r of eng.rows.sort((a,b)=> (b.pop-a.pop) || (b.cm-a.cm)).slice(0, 18)){
          const quadBadge = r.quad==="star" ? "good" : (r.quad==="plowhorse" ? "warn" : (r.quad==="puzzle" ? "" : "bad"));
          const quadName = r.quad==="star" ? "Star" : (r.quad==="plowhorse" ? "Plowhorse" : (r.quad==="puzzle" ? "Puzzle" : "Dog"));
          engCard.appendChild(el(`
            <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
              <div class="row">
                <div>
                  <div><b>${escapeHtml(r.name)}</b> <span class="badge ${quadBadge}">${quadName}</span></div>
                  <div class="small">${catName(r.category)} • ${stationName(r.station)} • Price ${money(r.price)} • Cost ${money(r.cost)} • CM ${money(r.cm)}</div>
                  <div class="small">Popularity ${r.pop.toFixed(1)}/5 • ${escapeHtml(r.suggestion)}</div>
                  <div class="row" style="margin-top:8px; gap:8px; flex-wrap:wrap;">
                    <button class="btn" data-mact="feature" data-item="${r.id}">Feature</button>
                    <button class="btn" data-mact="train" data-item="${r.id}">Staff push</button>
                    <button class="btn" data-mact="simplify" data-item="${r.id}">Simplify</button>
                  </div>
                </div>
              </div>
            </div>
          `));
        }

        engCard.querySelector("#btnPriceTweaks").onclick = ()=>{
          setState(s=>{
            const res = applySafePriceTweaks(s, v.id);
            if(res.changed){
              s.logs.push({ week:s.week, type:"menu", msg:`Price tweaks applied at ${v.name}: ${res.changed} items` });
            }
            return s;
          });
        };

        // Item actions: nudge popularity / prep complexity (simple, believable changes)
        engCard.addEventListener("click", (ev)=>{
          const btn = ev.target.closest("[data-mact]");
          if(!btn) return;
          const act = btn.getAttribute("data-mact");
          const itemId = btn.getAttribute("data-item");

          setState(s=>{
            const vv = s.venues.find(x=>x.id===v.id);
            if(!vv) return s;
            const it = (vv.menuItems||[]).find(x=>x.id===itemId);
            if(!it) return s;

            if(act==="feature"){
              it.popularity = clamp(Number(it.popularity||3) + 1, 1, 5);
              s.logs.push({ week:s.week, type:"menu", msg:`Featured item at ${vv.name}: ${it.name}` });
            }
            if(act==="train"){
              it.popularity = clamp(Number(it.popularity||3) + 1, 1, 5);
              vv.staffStress = clamp((vv.staffStress||30) + 2, 0, 100); // staff push adds slight stress
              s.logs.push({ week:s.week, type:"menu", msg:`Staff push for ${vv.name}: ${it.name}` });
            }
            if(act==="simplify"){
              it.prep = clamp(Number(it.prep ?? 50) - 10, 0, 100);
              // simplifying can reduce cost a touch
              it.cost = Math.max(0, roundTo(Number(it.cost||0) * 0.97, 0.5));
              s.logs.push({ week:s.week, type:"menu", msg:`Simplified item at ${vv.name}: ${it.name}` });
            }
            return s;
          });
        });


      } else {
        engCard.appendChild(el(`<div class="small">No active items yet.</div>`));
      }

      card.appendChild(engCard);
if(m.warnings && m.warnings.length){
        const warn = document.createElement("div");
        warn.className = "card";
        warn.style.background = "rgba(255,255,255,.03)";
        warn.appendChild(el(`<div class="h2">Warnings</div>`));
        for(const w of m.warnings){
          warn.appendChild(el(`<div class="small">• ${escapeHtml(w)}</div>`));
        }
        card.appendChild(warn);
      }

      card.appendChild(el(`
        <div class="card" style="background:rgba(255,255,255,.03);">
          <div class="h2">Next upgrade</div>
          <div class="small">Next stage: add <b>prep stations</b>, <b>ticket times</b>, and a <b>menu engineering</b> view (stars/plowhorses/puzzles/dogs) with suggested price changes.</div>
        </div>
      `));

      return card;
    }

    // handlers: step switch
    wrap.onclick = (e)=>{
      const b = e.target.closest("[data-menustep]");
      if(!b) return;
      const step = Number(b.getAttribute("data-menustep"));
      setState(s=>{
        const vv = s.venues.find(x=>x.id===v.id);
        if(!vv) return s;
        vv.menuStep = step;
        return s;
      });
    };

    render();
    return wrap;
  }>
    `);
  }

  
function manageMarketing(v, state, setState){
  if(!v.promos) v.promos = [];
  const panel = document.createElement("div");

  const active = (v.promos||[]).filter(p=> (p.weeksLeft||0) > 0);

  panel.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Marketing & promos</div>
      <div class="small">Short campaigns that boost demand and regulars. Costs cash, runs for a set number of weeks.</div>
      <div class="hr"></div>
      <div class="small">Cash: <b>${money(state.cash)}</b></div>
    </div>
  `));

  const actCard = document.createElement("div");
  actCard.className = "card";
  actCard.style.background = "rgba(255,255,255,.03)";
  actCard.appendChild(el(`<div class="h2">Active promos</div><div class="hr"></div>`));
  if(!active.length){
    actCard.appendChild(el(`<div class="small">None running.</div>`));
  }else{
    for(const p of active){
      actCard.appendChild(el(`
        <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div class="row" style="justify-content:space-between;">
            <div>
              <div><b>${escapeHtml(p.name)}</b></div>
              <div class="small">${p.weeksLeft} week(s) left • Demand +${Math.round((p.demandBoost||0)*100)}% • Foot traffic +${p.footTraffic||0} • Rep +${p.repBoost||0} • Regulars +${p.regularsBoost||0}</div>
            </div>
          </div>
        </div>
      `));
    }
  }
  panel.appendChild(actCard);

  const store = document.createElement("div");
  store.className = "card";
  store.style.background = "rgba(255,255,255,.03)";
  store.appendChild(el(`<div class="h2">Start a promo</div><div class="small">Pick one. We can add deeper marketing later (calendar, channels, creative).</div><div class="hr"></div>`));

  for(const p of PROMO_TYPES){
    store.appendChild(el(`
      <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
        <div class="row" style="justify-content:space-between; gap:10px;">
          <div>
            <div><b>${escapeHtml(p.name)}</b></div>
            <div class="small">${p.weeks}w • Cost ${money(p.cost)} • Demand +${Math.round((p.demandBoost||0)*100)}% • Foot +${p.footTraffic||0}${p.repBoost?` • Rep +${p.repBoost}`:""}${p.regularsBoost?` • Regulars +${p.regularsBoost}`:""}${p.prestigeRoll?" • Critic risk/reward":""}</div>
          </div>
          <button class="btn primary" data-startpromo="${p.id}">Start</button>
        </div>
      </div>
    `));
  }

  store.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-startpromo]");
    if(!b) return;
    const id = b.getAttribute("data-startpromo");
    setState(s=>{
      addPromo(s, v.id, id);
      return s;
    });
  });

  panel.appendChild(store);

  return panel;
}


function manageCustomers(v, state, setState){
  const panel = document.createElement("div");
  const c = ensureCustomerData(v);

  panel.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Customers</div>
      <div class="small">Inbox complaints + review feed. Use comps carefully — it protects reputation but costs cash.</div>
      <div class="hr"></div>
      <div class="small">Regulars: <b>${Math.round(c.regulars||0)}</b> • Prestige: <b>${Math.round(v.prestige||0)}</b> • Local reputation: <b>${Math.round(v.localReputation||50)}</b></div>
    </div>
  `));

  // Segments
  const segCard = document.createElement("div");
  segCard.className = "card";
  segCard.style.background = "rgba(255,255,255,.03)";
  segCard.appendChild(el(`<div class="h2">Customer mix</div><div class="hr"></div>`));
  const segs = c.segments || {};
  for(const k of Object.keys(segs)){
    const pctLabel = Math.max(0, Math.min(100, Number(segs[k]||0)));
    segCard.appendChild(el(`
      <div style="margin:10px 0;">
        <div class="row" style="justify-content:space-between;">
          <div class="small">${escapeHtml(k)}</div>
          <div class="small">${pctLabel}%</div>
        </div>
        <div class="bar"><div style="width:${pctLabel}%;"></div></div>
      </div>
    `));
  }
  panel.appendChild(segCard);

  // Inbox
  const inbox = document.createElement("div");
  inbox.className = "card";
  inbox.style.background = "rgba(255,255,255,.03)";
  inbox.appendChild(el(`<div class="h2">Inbox</div><div class="small">Resolve messages to protect reputation.</div><div class="hr"></div>`));

  const openMsgs = (c.inbox||[]).filter(m=>!m.resolved).slice(0,10);
  if(!openMsgs.length){
    inbox.appendChild(el(`<div class="small">No open messages.</div>`));
  }else{
    for(const m of openMsgs){
      const badge = m.tone==="angry" ? "bad" : (m.tone==="neutral" ? "warn" : "good");
      inbox.appendChild(el(`
        <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div><span class="badge ${badge}">${escapeHtml(m.tone)}</span> <b>${escapeHtml(m.topic||"message")}</b></div>
          <div class="small">${escapeHtml(m.text||"")}</div>
          <div class="row" style="gap:8px; margin-top:8px; flex-wrap:wrap;">
            <button class="btn" data-cust="apology" data-id="${m.id}">Apology</button>
            <button class="btn primary" data-cust="comp" data-id="${m.id}">Comp (${money(m.compValue||30)})</button>
            <button class="btn danger" data-cust="ignore" data-id="${m.id}">Ignore</button>
          </div>
        </div>
      `));
    }
  }
  inbox.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-cust]");
    if(!b) return;
    const action = b.getAttribute("data-cust");
    const id = b.getAttribute("data-id");
    setState(s=>{
      respondToMessage(s, v.id, id, action);
      return s;
    });
  });
  panel.appendChild(inbox);

  // Reviews
  const rev = document.createElement("div");
  rev.className = "card";
  rev.style.background = "rgba(255,255,255,.03)";
  rev.appendChild(el(`<div class="h2">Recent reviews</div><div class="hr"></div>`));
  const rvs = (c.reviews||[]).slice(0,12);
  if(!rvs.length){
    rev.appendChild(el(`<div class="small">No reviews yet.</div>`));
  }else{
    for(const r of rvs){
      const badge = r.stars>=4 ? "good" : (r.stars===3 ? "warn" : "bad");
      rev.appendChild(el(`
        <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div class="row" style="justify-content:space-between; align-items:flex-start; gap:10px;">
            <div><span class="badge ${badge}">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span></div>
            <div class="small">${escapeHtml((r.platform||"").toUpperCase())}${r.week?` • W${r.week}`:""}</div>
          </div>
          <div class="small" style="margin-top:6px;">${escapeHtml(r.text||"")}</div>
          <div class="row" style="gap:8px; margin-top:8px; flex-wrap:wrap;">
            ${r.replied ? `<span class="badge good">Replied</span>` : `
              <button class="btn" data-rvact="apology" data-rvid="${r.id}">Apology</button>
              <button class="btn primary" data-rvact="invite" data-rvid="${r.id}">Invite back (${money(15)})</button>
              <button class="btn" data-rvact="defensive" data-rvid="${r.id}">Defensive</button>
              <button class="btn danger" data-rvact="ignore" data-rvid="${r.id}">Ignore</button>
            `}
          </div>
        </div>
      `));
    }
  }
  rev.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-rvact]");
    if(!b) return;
    const action = b.getAttribute("data-rvact");
    const id = b.getAttribute("data-rvid");
    setState(s=>{
      respondToReview(s, v.id, id, action);
      return s;
    });
  });

  panel.appendChild(rev);

  return panel;
}



function manageSuppliers(v, state, setState){
  ensureSupplyState(state);

  const panel = document.createElement("div");
  panel.appendChild(el(`
    <div class="card">
      <div class="h2">Suppliers</div>
      <div class="small">Pick suppliers per category, or use HQ central purchasing + contracts. Stockouts cost money and hurt reviews.</div>
      <div class="hr"></div>
      <div class="small">HQ central purchasing: <b>${state.hq && state.hq.centralPurchasing ? "ON" : "OFF"}</b> — manage contracts in <b>HQ</b>.</div>
      <div class="row" style="gap:10px; margin-top:10px;">
        <button class="btn" data-goto-hq="1">Open HQ</button>
      </div>
    </div>
  `));

  const cats = listCategories();
  for(const c of cats){
    const contract = (state.hq && state.hq.centralPurchasing) ? activeContract(state, c.id) : null;
    const locked = !!contract;
    const currentId = locked ? contract.supplierId : (v.suppliers && v.suppliers[c.id]) ? v.suppliers[c.id] : null;

    const options = suppliersFor(c.id).map(s=>`
      <option value="${escapeHtml(s.id)}"${s.id===currentId?" selected":""}>${escapeHtml(s.name)} • price ${Math.round(s.basePrice*100)} • rel ${Math.round(s.reliability*100)}%</option>
    `).join("");

    panel.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="row" style="justify-content:space-between; gap:10px;">
          <div>
            <div><b>${escapeHtml(c.name)}</b> ${locked?'<span class="badge good">HQ contract</span>':""}</div>
            <div class="small">Market index: <b>${((state.supplyIndex && state.supplyIndex[c.id]) ? state.supplyIndex[c.id] : 1.0).toFixed(2)}×</b></div>
          </div>
        </div>
        <div class="hr"></div>
        <label>${locked ? "Supplier (locked by HQ)" : "Supplier"}</label>
        <select data-scat="${escapeHtml(c.id)}"${locked?" disabled":""}>
          ${options}
        </select>
        <div class="small" style="margin-top:8px;">Venue avg supply index: <b>${(v.supplyKpis && v.supplyKpis.avgIndex ? v.supplyKpis.avgIndex : 1.0).toFixed(2)}×</b> • Stockouts (lifetime): <b>${v.supplyKpis? v.supplyKpis.stockouts:0}</b> • Emergency spend: <b>${money(v.supplyKpis? v.supplyKpis.emergencySpend:0)}</b></div>
      </div>
    `));
  }

  panel.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-goto-hq]");
    if(btn){
      setState(s=>{ s.route="hq"; return s; });
      return;
    }
  });

  panel.addEventListener("change", (e)=>{
    const sel = e.target.closest("select[data-scat]");
    if(!sel) return;
    const cat = sel.getAttribute("data-scat");
    const supplierId = sel.value;
    setState(s=>{
      setVenueSupplier(s, v.id, cat, supplierId);
      s.logs.push({ week:s.week, type:"supply", msg:`${v.name}: set ${cat} supplier → ${supplierId}` });
      return s;
    });
  });

  return panel;
}



  function manageInventory(v, state, setState){
    ensureInventoryState(state);
    ensureVenueInventory(v);

    const inv = v.inventory;
    const prof = storageProfile(inv.storageLevel||1);

    const panel = document.createElement("div");

    const cats = listCategories(); // reuse supplier categories
    const rows = cats.map(c=>{
      const b = inv.cats[c.id] || { onHand:0, incoming:0, parTarget:0 };
      const need = Math.max(0, (b.parTarget||0) - ((b.onHand||0) + (b.incoming||0)));
      return {
        id: c.id,
        name: c.name,
        onHand: Math.round(b.onHand||0),
        incoming: Math.round(b.incoming||0),
        par: Math.round(b.parTarget||0),
        need: Math.round(need)
      };
    });

    panel.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="h2">Inventory</div>
        <div class="small">Track stock by category. Low par or delivery delays can cause stockouts + emergency buys. Stocktakes reduce shrink.</div>
        <div class="hr"></div>

        <div class="row" style="gap:10px; flex-wrap:wrap; align-items:center;">
          <div class="kpi"><div class="label">Auto reorder</div><div class="value">${inv.autoReorder ? "ON" : "OFF"}</div></div>
          <button class="btn ${inv.autoReorder?'primary':''}" data-invact="toggleAuto">${inv.autoReorder?"Disable":"Enable"}</button>
          <button class="btn" data-invact="stocktake">Stocktake</button>
          <button class="btn" data-invact="upgradeStorage">Upgrade storage</button>
        </div>

        <div class="hr"></div>

        <div class="row" style="gap:10px; align-items:center;">
          <div class="small"><b>Par (weeks of stock)</b> ${(inv.parWeeks||1.2).toFixed(2)}w</div>
          <input type="range" min="0.6" max="2.2" step="0.05" value="${inv.parWeeks||1.2}" data-invpar style="flex:1;"/>
        </div>

        <div class="row" style="gap:10px; margin-top:8px; flex-wrap:wrap;">
          <div class="small"><b>Storage</b> Level ${inv.storageLevel||1} (${escapeHtml(prof.label)})</div>
          <div class="small">Cap multiplier: ${(prof.capMult||1).toFixed(2)}×</div>
          ${prof.capex && (inv.storageLevel||1)<4 ? `<div class="small">Next upgrade capex: ${money(prof.capex)}</div>` : `<div class="small">Max level reached.</div>`}
        </div>
      </div>
    `));

    panel.appendChild(el(`
      <div class="card" style="margin-top:12px;">
        <div class="h2">Stock by category</div>
        <div class="small">Values are $-based. “Order to par” buys enough to hit your target (subject to storage & cash).</div>
        <div class="hr"></div>

        ${rows.map(r=>`
          <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
            <div class="row" style="justify-content:space-between; gap:10px;">
              <div><b>${escapeHtml(r.name)}</b> <span class="small">(${r.id})</span></div>
              <div class="small">Par: ${money(r.par)}</div>
            </div>
            <div class="row" style="gap:10px; flex-wrap:wrap; margin-top:8px;">
              <div class="kpi"><div class="label">On hand</div><div class="value">${money(r.onHand)}</div></div>
              <div class="kpi"><div class="label">Incoming</div><div class="value">${money(r.incoming)}</div></div>
              <div class="kpi"><div class="label">Need</div><div class="value ${r.need>0?'warn':'good'}">${money(r.need)}</div></div>
            </div>
            <div class="row" style="gap:8px; margin-top:10px; flex-wrap:wrap;">
              <button class="btn ${r.need>0?'primary':''}" data-invact="orderToPar" data-cat="${r.id}" data-need="${r.need}">Order to par</button>
            </div>
          </div>
        `).join("")}
      </div>
    `));

    // handlers
    panel.addEventListener("click", (e)=>{
      const b = e.target.closest("[data-invact]");
      if(!b) return;
      const act = b.getAttribute("data-invact");

      if(act==="toggleAuto"){
        setState(s=>{
          setAutoReorder(s, v.id, !v.inventory.autoReorder);
          return s;
        });
        return;
      }

      if(act==="stocktake"){
        setState(s=>{
          stocktake(s, v.id);
          return s;
        });
        return;
      }

      if(act==="upgradeStorage"){
        setState(s=>{
          upgradeStorage(s, v.id);
          return s;
        });
        return;
      }

      if(act==="orderToPar"){
        const cat = b.getAttribute("data-cat");
        const need = Number(b.getAttribute("data-need")||0);
        setState(s=>{
          // use deterministic rng based on state
          const rng = mulberry32((s.seed + s.week*99991)>>>0);
          placeOrder(s, v, cat, need, rng);
          return s;
        });
        return;
      }
    });

    const par = panel.querySelector("[data-invpar]");
    if(par){
      par.addEventListener("input", (e)=>{
        const val = Number(e.target.value||1.2);
        setState(s=>{
          setParWeeks(s, v.id, val);
          return s;
        });
      });
    }

    return panel;
  }


  function manageFacilities(v, state, setState){
    ensureFacilitiesState(state);
    ensureVenueFacilities(v);

    const f = v.facilities;

    const panel = document.createElement("div");

    const issues = (f.activeIssues||[]).map(x=>{
      const label = x.eqId || "equipment";
      return { id:x.id, label, weeksLeft:x.weeksLeft||1, speedHit:x.speedHit||0, foodHit:x.foodHit||0, compHit:x.complianceHit||0 };
    });

    panel.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="h2">Facilities</div>
        <div class="small">Equipment breakdowns reduce covers + slow service. Maintenance spend reduces breakdown risk and improves condition. Renovations can boost reputation but cause downtime.</div>
        <div class="hr"></div>

        <div class="row" style="gap:10px; flex-wrap:wrap;">
          <div class="kpi"><div class="label">Condition</div><div class="value ${(f.condition>=70?"good":(f.condition>=55?"warn":"bad"))}">${Math.round(f.condition||0)}/100</div></div>
          <div class="kpi"><div class="label">Maintenance</div><div class="value">${(f.maintenanceLevel||1).toFixed(2)}×</div></div>
          <div class="kpi"><div class="label">Downtime</div><div class="value">${Math.round(f.downtimeWeeks||0)}w</div></div>
          <div class="kpi"><div class="label">Open issues</div><div class="value">${issues.length}</div></div>
        </div>

        <div class="hr"></div>

        <div class="row" style="gap:10px; align-items:center;">
          <div class="small"><b>Maintenance level</b></div>
          <input type="range" min="0.60" max="1.50" step="0.05" value="${f.maintenanceLevel||1.0}" data-facmaint style="flex:1;"/>
          <div class="small">${(f.maintenanceLevel||1.0).toFixed(2)}×</div>
        </div>

        ${(f.renovation ? `
          <div class="hr"></div>
          <div class="row" style="justify-content:space-between; gap:10px;">
            <div class="small"><b>Renovation in progress</b>: ${escapeHtml(f.renovation.id)} • ${f.renovation.weeksLeft}w left</div>
            <button class="btn" data-facact="cancelReno">Cancel</button>
          </div>
        ` : `
          <div class="hr"></div>
          <div class="h2">Renovations</div>
          <div class="small">Choose a renovation. Costs cash now. Expect downtime for the duration.</div>
          <div class="row" style="gap:10px; flex-wrap:wrap; margin-top:10px;">
            <button class="btn" data-facact="reno" data-reno="refresh">Cosmetic refresh</button>
            <button class="btn" data-facact="reno" data-reno="kitchen">Kitchen overhaul</button>
            <button class="btn" data-facact="reno" data-reno="full">Full refit</button>
          </div>
        `)}
      </div>
    `));

    panel.appendChild(el(`
      <div class="card" style="margin-top:12px;">
        <div class="h2">Active issues</div>
        ${(issues.length ? issues.map(it=>`
          <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
            <div class="row" style="justify-content:space-between; gap:10px;">
              <div><b>${escapeHtml(it.label)}</b></div>
              <div class="small">${it.weeksLeft}w</div>
            </div>
            <div class="small" style="margin-top:6px;">
              Speed -${it.speedHit}, Food -${it.foodHit}${it.compHit?`, Compliance -${it.compHit}`:""}
            </div>
          </div>
        `).join("") : `<div class="small">No active issues.</div>`)}
      </div>
    `));

    // click handlers
    panel.addEventListener("click", (e)=>{
      const b = e.target.closest("[data-facact]");
      if(!b) return;
      const act = b.getAttribute("data-facact");

      if(act==="reno"){
        const rid = b.getAttribute("data-reno");
        setState(s=>{
          scheduleRenovation(s, v.id, rid);
          return s;
        });
        return;
      }

      if(act==="cancelReno"){
        setState(s=>{
          cancelRenovation(s, v.id);
          return s;
        });
        return;
      }
    });

    const maint = panel.querySelector("[data-facmaint]");
    if(maint){
      maint.addEventListener("input", (e)=>{
        const val = Number(e.target.value||1.0);
        setState(s=>{
          setMaintenanceLevel(s, v.id, val);
          return s;
        });
      });
    }

    return panel;
  }

function manageCompliance(v, state, setState){
  const wrap = document.createElement("div");

  const comp = Math.round(v.compliance ?? 60);
  const clean = Math.round(v.cleanliness ?? 70);
  const risk = (inspectionRisk(state, v) * 100).toFixed(1);
  const closed = (v.closureWeeks ?? 0) > 0;

  wrap.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Compliance</div>
      <div class="small">Compliance score: <b>${comp}</b>/100 • Cleanliness: <b>${clean}</b>/100 • Inspection risk: <b>${risk}%</b>/week</div>
      ${closed ? `<div class="small" style="margin-top:6px;"><b>Closed:</b> ${v.closureWeeks} week(s) remaining.</div>` : ``}
      <div class="hr"></div>
      <div class="small">Use interventions to reduce risk (clean, pest control, training). Brand SOP + training also help from HQ.</div>
    </div>
  `));

  const actions = document.createElement("div");
  actions.className = "card";
  actions.style.background = "rgba(255,255,255,.03)";

  const cards = Object.keys(AUDIT_ACTIONS).map(k=>{
    const a = AUDIT_ACTIONS[k];
    const cap = Number(v.capacity ?? 50);
    const cost = Math.round(a.baseCost * (0.80 + cap/150));
    const eff = [];
    if(a.clean) eff.push(`Cleanliness ${a.clean>0?"+":""}${a.clean}`);
    if(a.comp) eff.push(`Compliance ${a.comp>0?"+":""}${a.comp}`);
    if(a.burnout) eff.push(`Burnout ${a.burnout>0?"+":""}${a.burnout}`);
    return `
      <div class="row" style="justify-content:space-between; gap:10px; margin:10px 0;">
        <div>
          <div><b>${escapeHtml(a.label)}</b></div>
          <div class="small">${eff.join(" • ")}</div>
        </div>
        <button class="btn primary" data-auditact="${k}" data-venue="${escapeHtml(v.id)}">${money(cost)}</button>
      </div>
    `;
  }).join("");

  actions.innerHTML = `
    <div class="h2">Actions</div>
    <div class="small">Venue-level interventions (one-off spend this week).</div>
    <div class="hr"></div>
    ${cards}
  `;
  wrap.appendChild(actions);

  if(v.auditHistory && v.auditHistory.length){
    const rows = v.auditHistory.slice(0,6).map(h=>{
      if(h.type==="inspection"){
        return `<div class="small">Week ${h.week}: Health inspection <b>${h.grade}</b> (score ${h.score}) • Fine $${(h.fine||0).toLocaleString()}${h.closureWeeks?` • Closed ${h.closureWeeks}w`:""}</div>`;
      }
      if(h.type==="mystery"){
        return `<div class="small">Week ${h.week}: Mystery diner ${h.repDelta>=0?"+":""}${h.repDelta} rep (score ${h.score})</div>`;
      }
      return "";
    }).join("");
    wrap.appendChild(el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="h2">Recent audits</div>
        <div class="hr"></div>
        ${rows}
      </div>
    `));
  }

  return wrap;
}



function manageSettings(v){
    const card = el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="h2">Settings</div>
        <div class="small">Light controls for now. We’ll expand to fitout upgrades, supplier contracts, marketing, and compliance.</div>
        <div class="hr"></div>
        <div class="small">Lease: <span class="badge">${v.lease.rentReviewName}</span> <span class="badge">${v.lease.makeGoodName}</span> <span class="badge">${v.lease.approvalsName}</span></div>
        <div class="small">Occupancy: <b>${(v.occupancyPct*100).toFixed(1)}%</b> • Foot traffic: <b>${Math.round(v.footTraffic)}/100</b></div>
      </div>
    `);
    return card;
  }

  function manageStaff(v, state, setState, rerender){
    const panel = document.createElement("div");

    const header = el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="h2">Staff</div>
        <div class="small">Hire GM / Head Chef / FOH Lead. Delegation only works when the role is hired.</div>
        <div class="small">Fixed wages: <b>${money(weeklyWages(v))}/wk</b> • Hiring fee: <b>$500</b> • Severance: <b>~0.5 week wage</b></div>
      </div>
    `);
    panel.appendChild(header);

    // Current staff blocks
    panel.appendChild(renderRoleBlock("General Manager", "gm", v));
    panel.appendChild(renderRoleBlock("Head Chef", "chef", v));
    panel.appendChild(renderRoleBlock("FOH Lead", "foh", v));

    // Delegation buttons
    const delCard = el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="small"><b>Delegation</b></div>
        <div class="small">Ops: ${v.delegation.ops ? "<span class='good'>delegated</span>" : "<span class='warn'>owner-led</span>"} • Menu: ${v.delegation.menu ? "<span class='good'>delegated</span>" : "<span class='warn'>owner-led</span>"} • FOH: ${v.delegation.foh ? "<span class='good'>delegated</span>" : "<span class='warn'>owner-led</span>"}</div>
        <div class="hr"></div>
        <div class="row">
          <button class="btn" data-delegate="ops">${v.delegation.ops ? "Undelegate ops" : "Delegate ops"}</button>
          <button class="btn" data-delegate="menu">${v.delegation.menu ? "Undelegate menu" : "Delegate menu"}</button>
          <button class="btn" data-delegate="foh">${v.delegation.foh ? "Undelegate FOH" : "Delegate FOH"}</button>
        </div>
      </div>
    `);
    panel.appendChild(delCard);

    // Service model staffing (line cooks / prep)
    panel.appendChild(renderStationStaffing(v, state, setState));

    // Staff v2: Rosters + Training + burnout
    panel.appendChild(renderRosterTraining(v, state, setState));
    panel.appendChild(renderStaffIssues(v, state, setState));

    // Candidates market
    const candidates = generateCandidates(state, v);
    const market = el(`<div class="card" style="background:rgba(255,255,255,.03);"><div class="h2">Candidate market</div><div class="small">Refreshes weekly.</div></div>`);
    panel.appendChild(market);

    for(const roleId of ["gm","chef","foh"]){
      const label = roleId==="gm" ? "General Manager" : roleId==="chef" ? "Head Chef" : "FOH Lead";
      panel.appendChild(el(`<div class="small" style="margin-top:10px;"><b>${label}</b></div>`));
      for(const c of candidates.filter(x=>x.roleId===roleId)){
        panel.appendChild(el(renderCandidateCard(c)));
      }
    }

    // Handlers inside panel
    panel.onclick = (e)=>{
      const del = e.target.closest("[data-delegate]");
      if(del){
        const key = del.getAttribute("data-delegate");
        setState(s=>{
          const vv = s.venues.find(x=>x.id===v.id);
          if(!vv) return s;
          vv.staff = vv.staff || { gm:null, chef:null, foh:null };
          vv.delegation = vv.delegation || { ops:false, menu:false, foh:false };

          if(key==="ops" && !vv.staff.gm) return s;
          if(key==="menu" && !vv.staff.chef) return s;
          if(key==="foh" && !vv.staff.foh) return s;

          vv.delegation[key] = !vv.delegation[key];
          s.logs.push({ week:s.week, type:"staff", msg:`Delegation at ${vv.name}: ${key} = ${vv.delegation[key] ? "delegated" : "owner-led"}` });
          return s;
        });
        return;
      }

      const hireBtn = e.target.closest("[data-hire]");
      if(hireBtn){
        const cid = hireBtn.getAttribute("data-hire");
        const cand = candidates.find(x=>x.id===cid);
        if(!cand) return;
        if(state.cash < 500){
          alert("Not enough cash for hiring fee.");
          return;
        }
        setState(s=>{ hireCandidate(s, v.id, cand); return s; });
        return;
      }

      const fireBtn = e.target.closest("[data-fire]");
      if(fireBtn){
        const role = fireBtn.getAttribute("data-fire");
        setState(s=>{ fireRole(s, v.id, role); return s; });
        return;
      }
    };

    return panel;
  }

  function renderRoleBlock(title, roleId, v){
    const hire = v.staff[roleId];
    const delegated = roleId==="gm" ? v.delegation.ops : roleId==="chef" ? v.delegation.menu : v.delegation.foh;

    if(!hire){
      return el(`
        <div class="card" style="background:rgba(255,255,255,.03);">
          <div class="row">
            <div>
              <div><b>${title}</b> • <span class="warn">vacant</span></div>
              <div class="small">No hire yet.</div>
            </div>
          </div>
        </div>
      `);
    }

    const traitNames = (hire.traits||[]).map(t=>t.name).join(", ") || "—";
    const skillsLine = roleId==="gm"
      ? `Ops ${hire.skills.ops} • People ${hire.skills.people} • Standards ${hire.skills.standards}`
      : roleId==="chef"
        ? `Culinary ${hire.skills.culinary} • Consistency ${hire.skills.consistency} • Cost ${hire.skills.cost}`
        : `Service ${hire.skills.service} • Pace ${hire.skills.pace} • Recovery ${hire.skills.recovery}`;

    return el(`
      <div class="card" style="background:rgba(255,255,255,.03);">
        <div class="row">
          <div>
            <div><b>${title}</b> • <span class="${delegated ? "good":"warn"}">${delegated ? "delegated" : "owner-led"}</span></div>
            <div class="small">${hire.name} • ${money(hire.wageWeekly)}/wk</div>
            <div class="small">${skillsLine}</div>
            <div class="small">Traits: ${traitNames}</div>
          </div>
          <button class="btn danger" data-fire="${roleId}">Fire</button>
        </div>
      </div>
    `);
  }

  function renderCandidateCard(c){
    const traitNames = (c.traits||[]).map(t=>t.name).join(", ");
    const skillsLine = c.roleId==="gm"
      ? `Ops ${c.skills.ops} • People ${c.skills.people} • Standards ${c.skills.standards}`
      : c.roleId==="chef"
        ? `Culinary ${c.skills.culinary} • Consistency ${c.skills.consistency} • Cost ${c.skills.cost}`
        : `Service ${c.skills.service} • Pace ${c.skills.pace} • Recovery ${c.skills.recovery}`;

    return `
      <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
        <div class="row">
          <div>
            <div><b>${c.name}</b> • <span class="badge">${c.score}/100</span></div>
            <div class="small">${money(c.wageWeekly)}/wk • ${skillsLine}</div>
            <div class="small">Traits: ${traitNames}</div>
          </div>
          <button class="btn primary" data-hire="${c.id}">Hire</button>
        </div>
      </div>
    `;
  }

  function labelMenuStyle(id){
    const map = {
      a_la_carte: "À la carte",
      tasting: "Tasting menu",
      counter: "Counter / fast casual",
      pub: "Pub service",
      cafe: "Cafe / all-day",
      truck: "Food truck",
      hotel: "Hotel all-day",
      winery: "Winery lunch",
    };
    return map[id] || "À la carte";
  }

  function generateVenueName(rng, typeName, conceptName, idx){
    const nouns = ["Kitchen","Bar","Table","House","Works","Canteen","Company","Hall","Room","Supply"];
    const adj = ["Copper","Harbour","Juniper","Saffron","Iron","Luna","Drift","Ember","Cobalt","Fern"];
    return `${pick(rng, adj)} ${pick(rng, nouns)} #${idx}`;
  }

  // Global handlers for this screen
  wrap.addEventListener("click", (e)=>{
    if(e.target.id === "btnAcquire"){
      openWizard();
      return;
    }

    if(e.target.id === "mgClose"){
      manage.style.display = "none";
      mgVenueId = null;
      return;
    }

    const tabBtn = e.target.closest("[data-mgtab]");
    if(tabBtn && manage.style.display === "block"){
      mgTab = tabBtn.getAttribute("data-mgtab");
      renderManage();
      return;
    }

    const auditBtn = e.target.closest("[data-auditact]");
    if(auditBtn && manage.style.display === "block"){
      const act = auditBtn.getAttribute("data-auditact");
      const venueId = auditBtn.getAttribute("data-venue");
      setState(s=>{
        const v = s.venues.find(x=>x.id===venueId);
        if(!v) return s;
        const a = AUDIT_ACTIONS[act];
        if(!a) return s;
        const cap = Number(v.capacity ?? 50);
        const cost = Math.round(a.baseCost * (0.80 + cap/150));
        if(s.cash < cost){
          s.logs.push({ week: s.week, type:"cash", msg:`Not enough cash for ${a.label}.` });
          return s;
        }
        s.cash -= cost;
        v.cleanliness = clamp(Number(v.cleanliness ?? 70) + (a.clean||0), 0, 100);
        v.compliance = clamp(Number(v.compliance ?? 60) + (a.comp||0), 0, 100);
        if(!v.staffPulse) v.staffPulse = { morale:55, burnout:25 };
        v.staffPulse.burnout = clamp(Number(v.staffPulse.burnout ?? 25) + (a.burnout||0), 0, 100);
        s.logs.push({ week: s.week, type:"audit", msg:`${v.name}: ${a.label} (-$${cost.toLocaleString()}).` });
        return s;
      });
      renderManage();
      return;
    }

    const mg = e.target.closest("[data-manage]");
    if(mg){
      openManage(mg.getAttribute("data-manage"), "overview");
      return;
    }

    const tog = e.target.closest("[data-toggle-owner]");
    if(tog){
      const id = tog.getAttribute("data-toggle-owner");
      setState(s=>{
        const v = s.venues.find(x=>x.id===id);
        if(!v) return s;
        v.ownerRun = !v.ownerRun;
        s.logs.push({ week:s.week, type:"staff", msg:`Owner mode at ${v.name}: ${v.ownerRun ? "hands-on" : "hands-off"}` });
        return s;
      });
      return;
    }
  });

  return wrap;
}

/* -----------------------------
   OPS
------------------------------*/
function screenOps(state, setState){
  const wrap = document.createElement("div");

  wrap.appendChild(el(`
    <div class="card">
      <div class="row">
        <div>
          <div class="h2">Weekly Operations Report</div>
          <div class="small">Run a week. Fixed wages (GM/HC/FOH) sit inside labour.</div>
        </div>
        <button class="btn primary" id="btnRunWeek">Run Week</button>
      </div>
    </div>
  `));
  // Weekly action planner (quick, not overwhelming)
  const planner = document.createElement("div");
  planner.className = "card";
  planner.style.background = "rgba(255,255,255,.03)";
  planner.appendChild(el(`<div class="h2">Weekly action planner</div><div class="small">Pick 1–2 actions. Small tweaks compound over time.</div><div class="hr"></div>`));

  if(!state.venues.length){
    planner.appendChild(el(`<div class="small">No venues yet. Acquire your first location to start operating.</div>`));
  }else{
    for(const v of state.venues){
      const m = computeMenuMetrics(v);
      const tt = estimateTicketTimes(v);
      const recs = [];

      if(m.hasMenu && m.foodCostPct > 0.36) recs.push({ id:"tweak_price", label:"Apply safe price tweaks", desc:"Protect margin on popular items.", cost:0 });
      if(m.hasMenu && (m.stationImbalance > 65 || tt.label==="slow")) recs.push({ id:"hire_station", label:"Add 1 staff to bottleneck station", desc:"Reduces ticket times and complaints.", cost:0 });
      if(tt.label==="slow" && (v.stationStaff?.prep||0)===0) recs.push({ id:"add_prep", label:"Add 1 prep cook", desc:"Lowers prep penalty for complex menus.", cost:0 });
      if((v.promos||[]).length===0) recs.push({ id:"promo_social", label:"Start social campaign", desc:"Boost demand for 3 weeks.", cost:800 });

      const recWrap = document.createElement("div");
      recWrap.className = "card";
      recWrap.style.background = "rgba(255,255,255,.03)";
      recWrap.style.margin = "10px 0";
      recWrap.appendChild(el(`<div><b>${escapeHtml(v.name)}</b> <span class="small">(${escapeHtml(v.cityName||"")})</span></div><div class="small">Ticket time: <b>${tt.avgMinutes.toFixed(0)}m</b> • Food cost: <b>${pct(m.foodCostPct)}</b> • Cash: <b>${money(state.cash)}</b></div>`));

      if(!recs.length){
        recWrap.appendChild(el(`<div class="small">No urgent fires. Consider feature/push a puzzle item or run an event.</div>`));
      }else{
        for(const r of recs.slice(0,3)){
          recWrap.appendChild(el(`
            <div class="row" style="justify-content:space-between; gap:10px; margin-top:8px;">
              <div class="small"><b>${escapeHtml(r.label)}</b> — ${escapeHtml(r.desc)}</div>
              <button class="btn primary" data-op="${r.id}" data-venue="${v.id}">${r.cost?`Do (${money(r.cost)})`:"Do"}</button>
            </div>
          `));
        }
      }

      planner.appendChild(recWrap);
    }
  }

  planner.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-op]");
    if(!b) return;
    const op = b.getAttribute("data-op");
    const vid = b.getAttribute("data-venue");

    setState(s=>{
      const v = s.venues.find(x=>String(x.id)===String(vid));
      if(!v) return s;

      if(op==="tweak_price"){
        // reuse the menu button logic by calling applySafePriceTweaks via a fake click? We’ll just apply here.
        // (applySafePriceTweaks is already imported in this file)
        applySafePriceTweaks(s, v.id);
        return s;
      }
      if(op==="hire_station"){
        // add to dominant station
        const loads = stationLoads(v);
        const dom = loads[0]?.station || "pan";
        if(!v.stationStaff) v.stationStaff = { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };
        v.stationStaff[dom] = (v.stationStaff[dom]||0) + 1;
        s.logs.push({ week:s.week, type:"staff", msg:`Added 1 ${dom} staff at ${v.name}` });
        return s;
      }
      if(op==="add_prep"){
        if(!v.stationStaff) v.stationStaff = { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };
        v.stationStaff.prep = (v.stationStaff.prep||0) + 1;
        s.logs.push({ week:s.week, type:"staff", msg:`Added 1 prep cook at ${v.name}` });
        return s;
      }
      if(op==="promo_social"){
        addPromo(s, v.id, "social");
        return s;
      }
      return s;
    });
  });

  wrap.appendChild(planner);
  // Quest board
  const qCard = document.createElement("div");
  qCard.className = "card";
  qCard.style.background = "rgba(255,255,255,.03)";
  qCard.appendChild(el(`<div class="h2">Quest board</div><div class="small">Optional objectives with real rewards. New quests roll every 2 weeks (up to 3 active).</div><div class="hr"></div>`));

  const qs = state.quests || { active:[], completed:[] };
  if(!qs.active.length){
    qCard.appendChild(el(`<div class="small">No active quests right now. Keep operating — more will appear.</div>`));
  }else{
    for(const q of qs.active){
      qCard.appendChild(el(`
        <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div><b>${escapeHtml(q.name)}</b></div>
          <div class="small">${escapeHtml(q.desc)}</div>
          <div class="small">Reward: <b>${q.reward?.cash?money(q.reward.cash):money(0)}</b>${q.reward?.rep?` • Rep +${q.reward.rep}`:""}${q.reward?.prestige?` • Prestige +${q.reward.prestige}`:""}</div>
        </div>
      `));
    }
  }

  if(qs.completed && qs.completed.length){
    qCard.appendChild(el(`<div class="hr"></div><div class="small"><b>Completed</b> (${qs.completed.length})</div>`));
    for(const q of qs.completed.slice(-3).reverse()){
      qCard.appendChild(el(`<div class="small">✓ ${escapeHtml(q.name)} (week ${q.completedWeek})</div>`));
    }
  }

  wrap.appendChild(qCard);



  const r = state.lastWeekReport;
  if(!r){
    wrap.appendChild(el(`<div class="card"><div class="small">No report yet. Run your first week.</div></div>`));
    return attachOpsHandlers(wrap, setState);
  }

  wrap.appendChild(el(`
    <div class="card">
      <div class="h2">Week ${r.week} • ${r.city || "—"}</div>
      <div class="small">Seasonality factor: ${(r.seasonality*100).toFixed(0)}%</div>
      <div class="hr"></div>
      <div class="kpis">
        <div class="kpi"><div class="label">Sales</div><div class="value">${money(r.sales)}</div></div>
        <div class="kpi"><div class="label">Net</div><div class="value ${r.net>=0?"good":"bad"}">${money(r.net)}</div></div>
        <div class="kpi"><div class="label">Prime cost</div><div class="value ${r.primePct<=0.62?"good":(r.primePct<=0.68?"warn":"bad")}">${pct(r.primePct)}</div></div>
        <div class="kpi"><div class="label">Occupancy</div><div class="value ${r.occPct<=0.10?"good":(r.occPct<=0.12?"warn":"bad")}">${pct(r.occPct)}</div></div>
      </div>
      <div class="hr"></div>
      <div class="small">Wages this week (fixed hires): <b>${money(r.wages || 0)}</b></div>
      <div class="small">Reputation: <b>${Math.round(state.reputation)}/100</b> • Prestige: <b>${Math.round(state.prestige)}/100</b> • Owner dependence: <b>${Math.round(state.ownerDependence)}/100</b></div>
      <div class="small">Regulars change: <b>${r.regularsDelta >=0 ? "+" : ""}${r.regularsDelta}</b></div>
    </div>
  `));


  wrap.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Accounting snapshot</div>
      <div class="small">Profit ≠ cash. Depreciation is non-cash. Loan payments include principal (financing). Tax is accrued.</div>
      <div class="hr"></div>
      <div class="row" style="flex-wrap:wrap; gap:10px;">
        <div class="kpi"><div class="label">Profit (pre-tax)</div><div class="value ${r.profitBeforeTax>=0?"good":"bad"}">${money(r.profitBeforeTax||0)}</div></div>
        <div class="kpi"><div class="label">Tax expense</div><div class="value">${money(r.taxExpense||0)}</div></div>
        <div class="kpi"><div class="label">Profit (after tax)</div><div class="value ${r.profitAfterTax>=0?"good":"bad"}">${money(r.profitAfterTax||0)}</div></div>
        <div class="kpi"><div class="label">Depreciation</div><div class="value">${money(r.depreciation||0)}</div></div>
        <div class="kpi"><div class="label">Interest</div><div class="value">${money(r.interest||0)}</div></div>
        <div class="kpi"><div class="label">Loan payment</div><div class="value">${money(r.loanPayment||0)}</div></div>
        <div class="kpi"><div class="label">Tax accrued</div><div class="value">${money(r.taxAccrued||0)}</div></div>
        <div class="kpi"><div class="label">Net worth</div><div class="value">${money(r.netWorth||0)}</div></div>
      </div>
    </div>
  `));

  wrap.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Inventory snapshot</div>
      <div class="small">Waste includes spoilage + shrink. Stockouts trigger emergency buys + satisfaction penalties.</div>
      <div class="hr"></div>
      <div class="row" style="flex-wrap:wrap; gap:10px;">
        <div class="kpi"><div class="label">Waste</div><div class="value">${money(r.invWaste||0)}</div></div>
        <div class="kpi"><div class="label">Inv stockouts</div><div class="value">${r.invStockouts||0}</div></div>
        <div class="kpi"><div class="label">Inv emergency</div><div class="value">${money(r.invEmergency||0)}</div></div>
        <div class="kpi"><div class="label">On hand</div><div class="value">${money(r.invOnHand||0)}</div></div>
        <div class="kpi"><div class="label">Incoming</div><div class="value">${money(r.invIncoming||0)}</div></div>
      </div>
    </div>
  `));

  wrap.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Facilities snapshot</div>
      <div class="small">Maintenance + utilities are real costs. Breakdowns can force downtime and slow service.</div>
      <div class="hr"></div>
      <div class="row" style="flex-wrap:wrap; gap:10px;">
        <div class="kpi"><div class="label">Maintenance</div><div class="value">${money(r.facMaint||0)}</div></div>
        <div class="kpi"><div class="label">Energy</div><div class="value">${money(r.facEnergy||0)}</div></div>
        <div class="kpi"><div class="label">New issues</div><div class="value">${r.facNewIssues||0}</div></div>
        <div class="kpi"><div class="label">Venues down</div><div class="value">${r.facDownVenues||0}</div></div>
        <div class="kpi"><div class="label">Avg condition</div><div class="value">${(r.facAvgCondition? r.facAvgCondition.toFixed(1):"0.0")}</div></div>
      </div>
    </div>
  `));


  wrap.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Empire review feed</div>
      <div class="small">Latest public reviews across your venues. Reply inside each venue’s Customers tab.</div>
      <div class="hr"></div>
      ${(state.reviewFeed||[]).slice(0,8).map(x=>{
        const badge = x.stars>=4 ? "good" : (x.stars===3 ? "warn" : "bad");
        return `<div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div class="row" style="justify-content:space-between; gap:10px;">
            <div><span class="badge ${badge}">${"★".repeat(x.stars)}${"☆".repeat(5-x.stars)}</span> <b>${escapeHtml(x.venueName)}</b></div>
            <div class="small">${escapeHtml((x.platform||"").toUpperCase())} • W${x.week}</div>
          </div>
          <div class="small" style="margin-top:6px;">${escapeHtml(x.text||"")}</div>
        </div>`;
      }).join("") || `<div class="small">No reviews yet.</div>`}
    </div>
  `));


  const praiseTags = topTags(r.praise, 6);
  const complaintTags = topTags(r.complaints, 6);

  const tagsCard = document.createElement("div");
  tagsCard.className = "card";
  tagsCard.appendChild(el(`<div class="h2">Customer voice</div><div class="small">Fast signal from the week</div><div class="hr"></div>`));
  tagsCard.appendChild(el(`<div class="small">Praise</div>`));
  const pWrap = document.createElement("div");
  for(const [t,n] of praiseTags) pWrap.appendChild(el(`<span class="tag good">${t} ×${n}</span>`));
  tagsCard.appendChild(pWrap);

  tagsCard.appendChild(el(`<div class="hr"></div><div class="small">Complaints</div>`));
  const cWrap = document.createElement("div");
  for(const [t,n] of complaintTags) cWrap.appendChild(el(`<span class="tag bad">${t} ×${n}</span>`));
  tagsCard.appendChild(cWrap);

  wrap.appendChild(tagsCard);

  if(r.featuredReviews && r.featuredReviews.length){
    const revCard = document.createElement("div");
    revCard.className = "card";
    revCard.appendChild(el(`<div class="h2">Featured reviews</div>`));
    for(const rv of r.featuredReviews){
      revCard.appendChild(el(`
        <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div class="row">
            <div><b>${rv.venue}</b> • <span class="${rv.mood==="ecstatic"||rv.mood==="happy"?"good":(rv.mood==="mixed"?"warn":"bad")}">${rv.mood}</span></div>
            <div class="small">Rating ${rv.rating.toFixed(1)}/5.0</div>
          </div>
          <div class="small" style="margin-top:8px;">${escapeHtml(rv.text)}</div>
        </div>
      `));
    }
    wrap.appendChild(revCard);
  }

  return attachOpsHandlers(wrap, setState);
}



/* -----------------------------
   HQ (Suppliers & Contracts)
------------------------------*/
function screenHQ(state, setState){
  ensureSupplyState(state);
  ensureAccounting(state);

  const wrap = document.createElement("div");

  wrap.appendChild(el(`
    <div class="card">
      <div class="h2">HQ</div>
      <div class="small">Central purchasing, supplier contracts, and supply shocks. This is where empires become efficient — or brittle.</div>
      <div class="hr"></div>
      <div class="row" style="justify-content:space-between; gap:10px; align-items:center;">
        <div>
          <div class="small"><b>Central purchasing</b></div>
          <div class="small">When ON, HQ contracts lock suppliers for all venues (per category).</div>
        </div>
        <button class="btn ${state.hq.centralPurchasing?"primary":""}" data-cp="1">${state.hq.centralPurchasing?"On":"Off"}</button>
      </div>
    </div>
  `));

  // Brand portfolio
  ensureBrands(state);
  const brands = listBrands(state);
  const brandRows = brands.map(b=>{
    const count = (state.venues||[]).filter(v=>v.brandId===b.id).length;
    return `
      <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
        <div class="row" style="justify-content:space-between; gap:10px;">
          <div>
            <div><b>${escapeHtml(b.name)}</b> <span class="small">(${count} venues)</span></div>
            <div class="small">Standards: <b>${Math.round(b.standards||50)}</b>/100 • Prestige: <b>${Math.round(b.prestige||0)}</b>/100</div>
          </div>
        </div>
        <div class="row" style="gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn" data-bstd="${escapeHtml(b.id)}" data-d="-5">Standards -</button>
          <button class="btn" data-bstd="${escapeHtml(b.id)}" data-d="5">Standards +</button>
          <button class="btn" data-bpb="sop" data-bid="${escapeHtml(b.id)}" data-d="-5">SOP -</button>
          <button class="btn" data-bpb="sop" data-bid="${escapeHtml(b.id)}" data-d="5">SOP +</button>
          <button class="btn" data-bpb="training" data-bid="${escapeHtml(b.id)}" data-d="-5">Training -</button>
          <button class="btn" data-bpb="training" data-bid="${escapeHtml(b.id)}" data-d="5">Training +</button>
          <button class="btn" data-bpb="cadence" data-bid="${escapeHtml(b.id)}" data-d="-1">Cadence -</button>
          <button class="btn" data-bpb="cadence" data-bid="${escapeHtml(b.id)}" data-d="1">Cadence +</button>
        </div>
        <div class="small" style="margin-top:8px;">Higher standards improves consistency but increases burnout pressure.</div>
      </div>
    `;
  }).join("");

  wrap.appendChild(el(`
    <div class="card">
      <div class="h2">Brand portfolio</div>
      <div class="small">Create brands and set standards. In portfolio mode you attach each venue to a brand during acquisition.</div>
      <div class="hr"></div>

      <div class="row" style="gap:10px; margin-top:10px;">
        <input id="newBrandName" placeholder="New brand name" />
        <button class="btn primary" data-newbrand="1">Create</button>
      </div>

      ${brandRows || '<div class="small" style="margin-top:10px;">No brands yet.</div>'}
    </div>
  `));


  // Supply log
  const log = (state.supplyLog||[]).slice(0, 6).map(x=>`<div class="small">Week ${x.week}: ${escapeHtml(x.msg)}</div>`).join("");
  wrap.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Market</div>
      <div class="small">Recent supply shocks:</div>
      <div class="hr"></div>
      ${log || '<div class="small">No major shocks recently.</div>'}
    </div>
  `));

  // Contracts per category
  for(const c of listCategories()){
    const contract = activeContract(state, c.id);
    const idx = (state.supplyIndex && state.supplyIndex[c.id]) ? state.supplyIndex[c.id] : 1.0;

    const supplierOptions = suppliersFor(c.id).map(s=>{
      return `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} • price ${Math.round(s.basePrice*100)} • rel ${Math.round(s.reliability*100)}%</option>`;
    }).join("");

    const termOptions = `
      <option value="4">4 weeks (flex)</option>
      <option value="12">12 weeks (better)</option>
      <option value="26">26 weeks (best)</option>
    `;

    wrap.appendChild(el(`
      <div class="card">
        <div class="row" style="justify-content:space-between; gap:10px;">
          <div>
            <div class="h2">${escapeHtml(c.name)}</div>
            <div class="small">Market index: <b>${idx.toFixed(2)}×</b></div>
          </div>
          ${contract ? `<span class="badge good">Contract active</span>` : `<span class="badge">No contract</span>`}
        </div>

        <div class="hr"></div>

        ${contract ? `
          <div class="small">Supplier: <b>${escapeHtml(supplierById(contract.supplierId)?.name || contract.supplierId)}</b></div>
          <div class="small">Discount: <b>${Math.round(contract.discount*100)}%</b> • Ends: <b>Week ${contract.startWeek + contract.termWeeks}</b></div>
          <div class="row" style="gap:10px; margin-top:10px;">
            <button class="btn danger" data-break="${escapeHtml(c.id)}">Break contract</button>
          </div>
          <div class="small" style="margin-top:8px;">Breaking triggers a fee (realistic).</div>
        ` : `
          <label>Pick supplier</label>
          <select data-pick="${escapeHtml(c.id)}">
            ${supplierOptions}
          </select>
          <label>Term</label>
          <select data-term="${escapeHtml(c.id)}">
            ${termOptions}
          </select>
          <div class="row" style="gap:10px; margin-top:10px;">
            <button class="btn primary" data-sign="${escapeHtml(c.id)}">Sign contract</button>
          </div>
          <div class="small" style="margin-top:8px;">Discount scales with term + number of venues.</div>
        `}
      </div>
    `));
  }

  
  // Finance & accounting
  const debt = (state.loans||[]).reduce((a,x)=>a+(x.balance||0),0);
  const assets = (state.fixedAssets||[]).reduce((a,x)=>a+(x.book||0),0);
  const taxDue = (state.accounting && state.accounting.taxAccrued) ? state.accounting.taxAccrued : 0;

  wrap.appendChild(el(`
    <div class="card" style="margin-top:12px;">
      <div class="h2">Finance & Accounting</div>
      <div class="small">Realistic cashflow: loans are financing (principal isn’t an expense), depreciation is non-cash, tax is accrued on profit.</div>
      <div class="hr"></div>

      <div class="row" style="flex-wrap:wrap; gap:10px;">
        <div class="kpi"><div class="label">Cash</div><div class="value">${money(state.cash||0)}</div></div>
        <div class="kpi"><div class="label">Net worth</div><div class="value">${money(netWorth(state))}</div></div>
        <div class="kpi"><div class="label">Debt</div><div class="value">${money(debt)}</div></div>
        <div class="kpi"><div class="label">Assets (book)</div><div class="value">${money(assets)}</div></div>
        <div class="kpi"><div class="label">Tax accrued</div><div class="value">${money(taxDue)}</div></div>
      </div>

      <div class="hr"></div>

      <div class="row" style="gap:10px; flex-wrap:wrap;">
        <button class="btn primary" data-loan="bridge" data-amt="50000" data-apr="0.135" data-term="52">Borrow $50k (bridge)</button>
        <button class="btn" data-loan="small" data-amt="150000" data-apr="0.11" data-term="104">Borrow $150k (small)</button>
        <button class="btn" data-loan="growth" data-amt="300000" data-apr="0.095" data-term="156">Borrow $300k (growth)</button>
        <button class="btn" data-paytax="all">Pay tax (all)</button>
      </div>

      <div class="row" style="gap:10px; margin-top:10px; align-items:center;">
        <div class="small"><b>Tax rate</b> ${(Math.round((state.accounting.taxRate||0.25)*100))}%</div>
        <input type="range" min="0.10" max="0.40" step="0.01" value="${state.accounting.taxRate||0.25}" data-taxrate style="flex:1;"/>
      </div>

      ${(state.loans && state.loans.length) ? `
        <div class="hr"></div>
        <div class="h2">Loans</div>
        ${(state.loans.slice(0,6).map(l=>`
          <div class="row" style="justify-content:space-between; gap:10px; margin:8px 0;">
            <div class="small">${escapeHtml(l.lender||"Bank")} • ${(l.apr*100).toFixed(1)}% APR • ${l.weeksLeft}w left</div>
            <div class="small"><b>${money(l.balance)}</b> • pay ${money(l.weeklyPayment)}/wk</div>
          </div>
        `).join(""))}
      ` : `<div class="small" style="margin-top:8px;">No loans. (Good.)</div>`}
    </div>
  `));

  // Tax rate slider
  const taxrate = wrap.querySelector("[data-taxrate]");
  if(taxrate){
    taxrate.addEventListener("input", (e)=>{
      const v = Number(e.target.value||0.25);
      setState(s=>{
        if(!s.accounting) s.accounting = { taxRate:0.25, taxAccrued:0, retained:0 };
        s.accounting.taxRate = v;
        return s;
      });
    });
  }
wrap.addEventListener("click", (e)=>{

    const loanBtn = e.target.closest("[data-loan]");
    if(loanBtn){
      const amt = Number(loanBtn.getAttribute("data-amt")||0);
      const apr = Number(loanBtn.getAttribute("data-apr")||0.12);
      const term = Number(loanBtn.getAttribute("data-term")||52);
      setState(s=>{
        takeLoan(s, amt, apr, term, "Bank");
        return s;
      });
      return;
    }

    const taxBtn = e.target.closest("[data-paytax]");
    if(taxBtn){
      setState(s=>{
        payTax(s, Number(s.accounting?.taxAccrued||0));
        return s;
      });
      return;
    }

    const cp = e.target.closest("[data-cp]");
    if(cp){
      setState(s=>{
        setCentralPurchasing(s, !s.hq.centralPurchasing);
        s.logs.push({ week:s.week, type:"hq", msg:`Central purchasing ${s.hq.centralPurchasing?"ON":"OFF"}.` });
        return s;
      });
      return;
    }

    const sign = e.target.closest("[data-sign]");
    if(sign){
      const cat = sign.getAttribute("data-sign");
      const sel = wrap.querySelector(`select[data-pick="${cat}"]`);
      const term = wrap.querySelector(`select[data-term="${cat}"]`);
      const supplierId = sel ? sel.value : null;
      const termWeeks = term ? Number(term.value) : 12;
      if(!supplierId) return;

      setState(s=>{
        createContract(s, cat, supplierId, termWeeks);
        return s;
      });
      return;
    }

    const br = e.target.closest("[data-break]");
    if(br){
      const cat = br.getAttribute("data-break");
      setState(s=>{
        const res = breakContract(s, cat);
        if(!res.ok){
          s.logs.push({ week:s.week, type:"hq", msg:`Can't break contract (${cat}). ${res.reason==="cash"?"Need "+money(res.fee):"No contract"}.` });
        }
        return s;
      });
      return;
    }
  
    const nb = e.target.closest("[data-newbrand]");
    if(nb){
      const inp = wrap.querySelector("#newBrandName");
      const nm = inp ? inp.value : "";
      setState(s=>{
        createBrand(s, nm || "New Brand");
        if(inp) inp.value = "";
        return s;
      });
      return;
    }

    const std = e.target.closest("[data-bstd]");
    if(std){
      const id = std.getAttribute("data-bstd");
      const d = Number(std.getAttribute("data-d")||0);
      setState(s=>{
        const b = brandById(s, id);
        if(!b) return s;
        setBrandStandards(s, id, Number(b.standards||50) + d);
        return s;
      });
      return;
    }
});

  return wrap;
}
function attachOpsHandlers(wrap, setState){
  wrap.addEventListener("click", (e)=>{
    if(e.target.id === "btnRunWeek"){
      setState(s=>{ runWeek(s); return s; });
    }
  });
  return wrap;
}

/* -----------------------------
   CAPITAL
------------------------------*/
function screenCapital(state, setState){
  const wrap = document.createElement("div");

  if(!state.homeCityId){
    wrap.appendChild(el(`<div class="card"><div class="h2">Capital & Partners</div><div class="small">Pick a home city first.</div></div>`));
    return wrap;
  }

  const city = cityById(state.homeCityId);
  const outsideEq = totalOutsideEquity(state);
  const board = state.boardPressure || 0;
  const saleApproval = requiresSaleApproval(state);

  wrap.appendChild(el(`
    <div class="card">
      <div class="h2">Capital & Partners</div>
      <div class="small">Raise money to expand faster — but outside ownership reduces your exit proceeds.</div>
    </div>
  `));

  wrap.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Ownership & governance</div>
      <div class="kpis">
        <div class="kpi"><div class="label">Your equity</div><div class="value">${Math.round((1-outsideEq)*100)}%</div></div>
        <div class="kpi"><div class="label">Outside equity</div><div class="value">${Math.round(outsideEq*100)}%</div></div>
        <div class="kpi"><div class="label">Board pressure</div><div class="value">${Math.round(board)}/100</div></div>
        <div class="kpi"><div class="label">Sale approval</div><div class="value">${saleApproval ? "Required" : "No"}</div></div>
      </div>
      <div class="hr"></div>
      <div class="small"><b>Dividends policy</b> (how much weekly profit is paid out to partners):</div>
      <div class="row" style="gap:10px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn ${state.dividendsPolicy==="reinvest"?"primary":""}" data-div="reinvest">Reinvest (0%)</button>
        <button class="btn ${state.dividendsPolicy==="balanced"?"primary":""}" data-div="balanced">Balanced (30%)</button>
        <button class="btn ${state.dividendsPolicy==="distribute"?"primary":""}" data-div="distribute">Distribute (55%)</button>
      </div>
      <div class="small" style="margin-top:10px;">Current payout ratio: <b>${Math.round((state.dividendsPayoutRatio||0)*100)}%</b></div>
    </div>
  `));

  const invCard = document.createElement("div");
  invCard.className = "card";
  invCard.style.background = "rgba(255,255,255,.03)";
  invCard.appendChild(el(`<div class="h2">Current partners</div><div class="small">Preferred investors accrue a pref return and get paid first when you distribute.</div><div class="hr"></div>`));

  if(state.investors.length === 0){
    invCard.appendChild(el(`<div class="small">No partners yet.</div>`));
  }else{
    const valuation = estimateSale(state);
    for(const inv of state.investors){
      const s = pressureStatus(state, inv);
      const badge = (s.status==="ok")?"good":(s.status==="warn"?"warn":"bad");
      const statusLine = (s.status==="none") ? "Expectations: none" :
        `Expectations: <span class="badge ${badge}">${escapeHtml(s.status)}</span> • Target ${money(s.target||0)}/wk • Avg ${money(Math.round(s.avg||0))}/wk${(s.weeksLeft!=null?` • ${s.weeksLeft}w left`:"")}`;

      const est = estimateBuyoutCost(state, inv.id, valuation);
      const buyCost = est ? est.cost : null;

      invCard.appendChild(el(`
        <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
          <div class="row" style="justify-content:space-between; gap:10px;">
            <div>
              <div><b>${escapeHtml(inv.name)}</b> <span class="small">(${(inv.equity*100).toFixed(0)}%)</span></div>
              <div class="small">Cash in: ${money(inv.cashIn)} • Paid out: ${money(Math.round(inv.paidOut||0))}${inv.pref ? ` • Pref ${(inv.pref*100).toFixed(0)}% (accrued ${money(Math.round(inv.prefAccrued||0))})` : ""}</div>
              <div class="small">${statusLine}</div>
              <div class="small">Controls: capex>${money(inv.control.capexApprovalOver)} • expansion ${inv.control.expansionApproval?"yes":"no"} • sale approval ${inv.control.saleApproval?"yes":"no"}</div>
            </div>
            <div style="min-width:160px; text-align:right;">
              <button class="btn danger" data-buyout="${inv.id}">Buyout${buyCost?` (${money(Math.round(buyCost))})`:""}</button>
            </div>
          </div>
        </div>
      `));
    }
  }
  wrap.appendChild(invCard);

  const offers = generateInvestorOffers(state, city);
  const offCard = document.createElement("div");
  offCard.className = "card";
  offCard.style.background = "rgba(255,255,255,.03)";
  offCard.appendChild(el(`<div class="h2">Offers</div><div class="small">Offers refresh weekly. You can take multiple deals over time.</div><div class="hr"></div>`));
  for(const o of offers){
    offCard.appendChild(el(`
      <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
        <div class="row" style="justify-content:space-between; gap:10px;">
          <div>
            <div><b>${escapeHtml(o.name)}</b></div>
            <div class="small">+${money(o.cash)} for ${(o.equity*100).toFixed(0)}% equity ${o.pref ? `• Pref ${(o.pref*100).toFixed(0)}%` : ""}</div>
            <div class="small">${escapeHtml(o.notes)}</div>
            <div class="small">Pressure: ${money(o.pressure.minWeeklyProfit)}/wk within ${o.pressure.deadlineWeeks}w • Controls: capex>${money(o.control.capexApprovalOver)} • sale approval ${o.control.saleApproval?"yes":"no"}</div>
          </div>
          <button class="btn primary" data-accept="${o.id}">Accept</button>
        </div>
      </div>
    `));
  }
  wrap.appendChild(offCard);

  const valuation = estimateSale(state);
  wrap.appendChild(el(`
    <div class="card" style="background:rgba(255,255,255,.03);">
      <div class="h2">Valuation snapshot</div>
      <div class="kpis">
        <div class="kpi"><div class="label">Estimated sale price</div><div class="value">${money(valuation.salePrice)}</div></div>
        <div class="kpi"><div class="label">Your proceeds</div><div class="value">${money(valuation.yourProceeds)}</div></div>
        <div class="kpi"><div class="label">Multiple (SDE)</div><div class="value">${valuation.multiple.toFixed(2)}×</div></div>
        <div class="kpi"><div class="label">Owner dependence discount</div><div class="value">${(valuation.ownerDiscount*100).toFixed(0)}%</div></div>
      </div>
      <div class="hr"></div>
      <div class="small">SDE annualised: <b>${money(valuation.sdeAnnual)}</b> • Stability: <b>${valuation.stability.toFixed(0)}/100</b></div>
      <div class="small">Occupancy risk: <b>${valuation.occupancyRisk.toFixed(0)}/100</b> • Outside equity: <b>${(valuation.outsideEquity*100).toFixed(0)}%</b></div>
      <div class="hr"></div>
      <button class="btn danger" data-gosell="1">Go to Sell screen</button>
    </div>
  `));

  wrap.addEventListener("click", (e)=>{
    const divBtn = e.target.closest("[data-div]");
    if(divBtn){
      const pol = divBtn.getAttribute("data-div");
      setState(s=>{ setDividendsPolicy(s, pol); return s; });
      return;
    }

    const buyBtn = e.target.closest("[data-buyout]");
    if(buyBtn){
      const id = buyBtn.getAttribute("data-buyout");
      setState(s=>{
        const valuation = estimateSale(s);
        const res = buyOutInvestor(s, id, valuation);
        if(!res.ok && res.reason==="cash"){
          s.logs.push({ week:s.week, type:"capital", msg:`Buyout cost ${money(Math.round(res.cost))} — not enough cash.` });
        }
        return s;
      });
      return;
    }

    const btn = e.target.closest("[data-accept]");
    if(btn){
      const id = btn.getAttribute("data-accept");
      const offers = generateInvestorOffers(state, city);
      const offer = offers.find(x=>x.id===id);
      if(!offer) return;
      setState(s=>{
        acceptInvestorOffer(s, offer);
        return s;
      });
      return;
    }

    const goSell = e.target.closest("[data-gosell]");
    if(goSell){
      setState(s=>{ s.route="sell"; return s; });
      return;
    }
  });

  return wrap;
}

function screenSell(state, setState){
  const wrap = document.createElement("div");

  wrap.appendChild(el(`
    <div class="card">
      <div class="h2">Sell the Empire</div>
      <div class="small">Exit anytime. Price depends on profit stability, prestige, owner dependence, occupancy risk, and deal complexity.</div>
    </div>
  `));

  if(state.venues.length === 0){
    wrap.appendChild(el(`<div class="card"><div class="small">No venues yet — build something first.</div></div>`));
    return wrap;
  }

  const valuation = estimateSale(state);

  wrap.appendChild(el(`
    <div class="card">
      <div class="h2">Valuation snapshot</div>
      <div class="kpis">
        <div class="kpi"><div class="label">Estimated sale price</div><div class="value">${money(valuation.salePrice)}</div></div>
        <div class="kpi"><div class="label">Your proceeds</div><div class="value">${money(valuation.yourProceeds)}</div></div>
        <div class="kpi"><div class="label">Multiple (SDE)</div><div class="value">${valuation.multiple.toFixed(2)}×</div></div>
        <div class="kpi"><div class="label">Owner dependence discount</div><div class="value">${(valuation.ownerDiscount*100).toFixed(0)}%</div></div>
      </div>
      <div class="hr"></div>
      <div class="small">SDE annualised: <b>${money(valuation.sdeAnnual)}</b> • Stability: <b>${valuation.stability.toFixed(0)}/100</b></div>
      <div class="small">Occupancy risk: <b>${valuation.occupancyRisk.toFixed(0)}/100</b> • Outside equity: <b>${(valuation.outsideEquity*100).toFixed(0)}%</b></div>
      <div class="small">Board pressure: <b>${Math.round(state.boardPressure||0)}/100</b>${requiresSaleApproval(state) ? " • Sale approval required (haircut applied)" : ""}</div>
      <div class="hr"></div>
      <button class="btn danger" id="btnSellNow">Sell empire now</button>
    </div>
  `));

  wrap.addEventListener("click", (e)=>{
    if(e.target.id === "btnSellNow"){
      setState(s=>{
        const v = estimateSale(s);
        s.sold = {
          week: s.week,
          salePrice: v.salePrice,
          yourProceeds: v.yourProceeds,
          breakdown: v
        };
        s.logs.push({ week:s.week, type:"sell", msg:`Sold empire for ${money(v.salePrice)} (you: ${money(v.yourProceeds)})` });
        return s;
      });
    }
  });

  return wrap;
}

function renderSold(state, setState){
  const s = state.sold;
  const b = s.breakdown;

  const card = document.createElement("div");
  card.appendChild(el(`
    <div class="card">
      <div class="h2">Exit complete</div>
      <div class="small">You sold in Week ${s.week}. Final snapshot:</div>
      <div class="hr"></div>
      <div class="kpis">
        <div class="kpi"><div class="label">Sale price</div><div class="value">${money(s.salePrice)}</div></div>
        <div class="kpi"><div class="label">Your proceeds</div><div class="value">${money(s.yourProceeds)}</div></div>
        <div class="kpi"><div class="label">Prestige</div><div class="value">${Math.round(state.prestige)}/100</div></div>
        <div class="kpi"><div class="label">Reputation</div><div class="value">${Math.round(state.reputation)}/100</div></div>
      </div>
      <div class="hr"></div>
      <div class="small">Multiple: <b>${b.multiple.toFixed(2)}×</b> • Owner discount: <b>${(b.ownerDiscount*100).toFixed(0)}%</b> • Outside equity: <b>${(b.outsideEquity*100).toFixed(0)}%</b></div>
      <div class="small">SDE annual: <b>${money(b.sdeAnnual)}</b> • Stability: <b>${b.stability.toFixed(0)}/100</b> • Occupancy risk: <b>${b.occupancyRisk.toFixed(0)}/100</b></div>
      <div class="hr"></div>
      <button class="btn primary" id="btnNewGame">New game</button>
    </div>
  `));

  card.addEventListener("click", (e)=>{
    if(e.target.id === "btnNewGame"){
      setState(s2=>{
        const keepRoute = "world";
        for(const k of Object.keys(s2)) delete s2[k];
        const fresh = window.__RESIM_DEFAULT_STATE__();
        Object.assign(s2, fresh);
        s2.route = keepRoute;
        return s2;
      });
    }
  });

  return card;
}

/* -----------------------------
   SELL math (same as v1.1)
------------------------------*/
function estimateSale(state){
  const hist = state.netHistory.length ? state.netHistory : (state.lastWeekReport ? [state.lastWeekReport.net] : [0]);
  const avgNet = hist.reduce((a,b)=>a+b,0) / Math.max(1, hist.length);

  const addBack = clamp((100 - state.ownerDependence) / 100, 0.05, 0.55);
  const sdeWeekly = Math.max(0, avgNet * (1 + addBack*0.35));
  const sdeAnnual = sdeWeekly * 52;

  const prestigeBonus = clamp((state.prestige - 40)/200, 0, 0.25);
  const repBonus = clamp((state.reputation - 50)/250, -0.08, 0.18);

  const variance = calcVariance(hist);
  const stability = clamp(100 - (Math.sqrt(variance)/Math.max(1, Math.abs(avgNet))) * 80, 5, 95);

  const occAvg = state.venues.reduce((a,v)=>a+(v.occupancyPct ?? 0.09),0) / Math.max(1,state.venues.length);
  const occupancyRisk = clamp((occAvg - 0.07) * 800 + 35, 5, 95);

  const ownerDiscount = clamp(state.ownerDependence/180, 0.05, 0.55);

  let multiple = 2.1 + prestigeBonus*2.0 + repBonus*1.2 + (stability-60)/200 - (occupancyRisk-40)/220;
  multiple = clamp(multiple, 1.2, 3.4);
  multiple = multiple * (1 - ownerDiscount*0.35);

  const hasPref = state.investors.some(i=>i.type==="preferred");
  const complexityHaircut = hasPref ? 0.07 : 0.00;
  const saleApprovalHaircut = requiresSaleApproval(state) ? 0.03 : 0.00;

  let salePrice = sdeAnnual * multiple * (1 - complexityHaircut) * (1 - saleApprovalHaircut);

  const assetFloor = state.venues.reduce((a,v)=>{
    const t = venueType(v.typeId);
    const fit = t.capexBase * (v.fitoutQuality/100) * 0.35;
    return a + fit;
  }, 0) * 0.6;

  salePrice = Math.max(salePrice, assetFloor);

  const outsideEquity = totalOutsideEquity(state);
  const yourProceeds = salePrice * (1 - outsideEquity);

  return {
    sdeAnnual,
    multiple,
    salePrice,
    yourProceeds,
    outsideEquity,
    ownerDiscount,
    stability,
    occupancyRisk,
  };
}

function calcVariance(arr){
  if(arr.length < 2) return 0;
  const mean = arr.reduce((a,b)=>a+b,0) / arr.length;
  let v = 0;
  for(const x of arr) v += Math.pow(x-mean,2);
  return v / (arr.length-1);
}


function renderStationStaffing(v, state, setState){
  if(!v.stationStaff) v.stationStaff = { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };

  const card = document.createElement("div");
  card.className = "card";
  card.style.background = "rgba(255,255,255,.03)";

  card.appendChild(el(`<div class="h2">Service model staffing</div><div class="small">Add station staff to reduce bottlenecks (ticket times) at the cost of wages.</div><div class="hr"></div>`));

  card.appendChild(el(`<div class="small">Current station wages: <b>${money(stationWages(v))}/wk</b></div>`));

  const stations = [
    { id:"prep", name:"Prep cook" },
    { id:"cold", name:"Larder" },
    { id:"pan", name:"Pan" },
    { id:"grill", name:"Grill" },
    { id:"fryer", name:"Fryer" },
    { id:"pastry", name:"Pastry" },
    { id:"bar", name:"Bar" },
    { id:"coffee", name:"Coffee" },
  ];

  for(const s of stations){
    const n = Number(v.stationStaff[s.id]||0);
    const row = el(`
      <div class="row" style="justify-content:space-between; margin:8px 0;">
        <div class="small">${s.name}</div>
        <div class="row" style="gap:8px;">
          <button class="btn" data-ssminus="${s.id}">-</button>
          <div style="min-width:28px; text-align:center;">${n}</div>
          <button class="btn primary" data-ssplus="${s.id}">+</button>
        </div>
      </div>
    `);
    card.appendChild(row);
  }

  card.addEventListener("click", (e)=>{
    const plus = e.target.closest("[data-ssplus]");
    const minus = e.target.closest("[data-ssminus]");
    if(!plus && !minus) return;

    const key = (plus ? plus.getAttribute("data-ssplus") : minus.getAttribute("data-ssminus"));
    const delta = plus ? 1 : -1;

    setState(st=>{
      const vv = st.venues.find(x=>x.id===v.id);
      if(!vv) return st;
      if(!vv.stationStaff) vv.stationStaff = { cold:0, pan:0, grill:0, fryer:0, pastry:0, bar:0, coffee:0, prep:0 };
      vv.stationStaff[key] = Math.max(0, (vv.stationStaff[key]||0) + delta);
      st.logs.push({ week: st.week, type:"staff", msg:`Station staff at ${vv.name}: ${key} = ${vv.stationStaff[key]}` });
      return st;
    });
  });

  return card;
}



function renderRosterTraining(v, state, setState){
  // Ensure v2 fields
  if(v.burnout==null) v.burnout = 12;
  if(v.morale==null) v.morale = 70;
  if(!v.training) v.training = { ops:0, consistency:0, cost:0, pace:0, standards:0 };

  const r = ensureRoster(v);
  const menu = computeMenuMetrics(v);

  // Lightweight demand estimate for UI
  const demand = clamp(Math.round((v.capacity||40) * (0.60 + (v.popularity||50)/200)), 10, 260);
  const rec = recommendedPerShift(v, demand, menu);

  const card = document.createElement("div");
  card.className = "card";
  card.style.background = "rgba(255,255,255,.03)";

  const rosterCost = rosterWeeklyCost(v);

  card.appendChild(el(`
    <div class="h2">Roster & training</div>
    <div class="small">This is the gritty part: open hours, crew levels, burnout, and training. If you roster lean you save cash — but speed, consistency, and reviews take a hit.</div>
    <div class="hr"></div>
    <div class="kpis">
      <div class="kpi"><div class="label">Burnout</div><div class="value">${Math.round(v.burnout)}/100</div></div>
      <div class="kpi"><div class="label">Morale</div><div class="value">${Math.round(v.morale)}/100</div></div>
      <div class="kpi"><div class="label">Roster wages</div><div class="value">${money(rosterCost)}/wk</div></div>
      <div class="kpi"><div class="label">Station wages</div><div class="value">${money(stationWages(v))}/wk</div></div>
    </div>
  `));

  card.appendChild(el(`
    <div class="hr"></div>
    <div class="row" style="justify-content:space-between; gap:10px; align-items:center;">
      <div>
        <div class="small"><b>Roster enabled</b></div>
        <div class="small">Recommended per shift (based on demand): Kitchen <b>${rec.kitchen}</b> • FOH <b>${rec.foh}</b> • Bar <b>${rec.bar}</b></div>
      </div>
      <button class="btn ${r.enabled?"primary":""}" data-rtoggle="1">${r.enabled?"On":"Off"}</button>
    </div>
  `));

  if(r.enabled){
    card.appendChild(el(`
      <div class="hr"></div>
      <div class="small"><b>Open hours</b></div>
      <div class="row" style="justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div class="pill">Days/wk: <b>${r.openDays}</b> <button class="btn" data-rminus="openDays">-</button> <button class="btn" data-rplus="openDays">+</button></div>
        <div class="pill">Shifts/day: <b>${r.shiftsPerDay}</b> <button class="btn" data-rminus="shiftsPerDay">-</button> <button class="btn" data-rplus="shiftsPerDay">+</button></div>
        <div class="pill">Hours/shift: <b>${r.hoursPerShift}</b> <button class="btn" data-rminus="hoursPerShift">-</button> <button class="btn" data-rplus="hoursPerShift">+</button></div>
      </div>

      <div class="hr"></div>
      <div class="small"><b>Crew per shift</b></div>
      <div class="row" style="justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div class="pill">Kitchen: <b>${r.kitchenPerShift}</b> <button class="btn" data-rminus="kitchenPerShift">-</button> <button class="btn" data-rplus="kitchenPerShift">+</button></div>
        <div class="pill">FOH: <b>${r.fohPerShift}</b> <button class="btn" data-rminus="fohPerShift">-</button> <button class="btn" data-rplus="fohPerShift">+</button></div>
        <div class="pill">Bar: <b>${r.barPerShift}</b> <button class="btn" data-rminus="barPerShift">-</button> <button class="btn" data-rplus="barPerShift">+</button></div>
      </div>

      <div class="row" style="gap:10px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn" data-rauto="1">Auto-fit to demand</button>
        <button class="btn" data-rest="1">Roster a wellbeing day</button>
      </div>
      <div class="small" style="margin-top:8px;">Wellbeing day: costs a bit, reduces burnout, but you lose a little momentum that week (small popularity dip).</div>
    `));
  }

  // Training
  const opts = trainingOptions();
  const list = opts.map(o=>{
    const lvl = (v.training && v.training[o.id]) ? v.training[o.id] : 0;
    return `
      <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
        <div class="row" style="justify-content:space-between; gap:10px;">
          <div>
            <div><b>${escapeHtml(o.name)}</b> <span class="small">(lvl ${lvl}/10)</span></div>
            <div class="small">Cost: <b>${money(o.cost)}</b> • Boost: ${o.affects.map(a=>`<span class="badge">${escapeHtml(a)}</span>`).join(" ")}</div>
          </div>
          <button class="btn primary" data-train="${escapeHtml(o.id)}">Train</button>
        </div>
      </div>
    `;
  }).join("");

  card.appendChild(el(`
    <div class="hr"></div>
    <div class="small"><b>Training</b> (permanent small skill boosts + burnout relief)</div>
    ${list}
  `));

  card.addEventListener("click", (e)=>{
    const t = e.target.closest("[data-rtoggle]");
    if(t){
      setState(s=>{
        const vv = s.venues.find(x=>x.id===v.id);
        if(!vv) return s;
        ensureRoster(vv);
        vv.roster.enabled = !vv.roster.enabled;
        s.logs.push({ week:s.week, type:"staff", msg:`Roster at ${vv.name}: ${vv.roster.enabled ? "enabled" : "disabled"}` });
        return s;
      });
      return;
    }

    const auto = e.target.closest("[data-rauto]");
    if(auto){
      setState(s=>{
        const vv = s.venues.find(x=>x.id===v.id);
        if(!vv) return s;
        const rr = ensureRoster(vv);
        const mm = computeMenuMetrics(vv);
        const demand = clamp(Math.round((vv.capacity||40) * (0.60 + (vv.popularity||50)/200)), 10, 260);
        const rrec = recommendedPerShift(vv, demand, mm);
        rr.kitchenPerShift = rrec.kitchen;
        rr.fohPerShift = rrec.foh;
        rr.barPerShift = rrec.bar;
        s.logs.push({ week:s.week, type:"staff", msg:`Auto-rostered ${vv.name} to demand.` });
        return s;
      });
      return;
    }

    const rest = e.target.closest("[data-rest]");
    if(rest){
      setState(s=>{
        const vv = s.venues.find(x=>x.id===v.id);
        if(!vv) return s;
        const cost = 380;
        if(s.cash < cost){
          s.logs.push({ week:s.week, type:"staff", msg:`Not enough cash for wellbeing day (${money(cost)}).` });
          return s;
        }
        s.cash -= cost;
        vv.burnout = clamp((vv.burnout||0) - 8, 0, 100);
        vv.popularity = clamp((vv.popularity||50) - 1, 0, 100);
        s.logs.push({ week:s.week, type:"staff", msg:`Wellbeing day at ${vv.name} (-burnout, -momentum).` });
        return s;
      });
      return;
    }

    const plus = e.target.closest("[data-rplus]");
    const minus = e.target.closest("[data-rminus]");
    if(plus || minus){
      const key = (plus ? plus.getAttribute("data-rplus") : minus.getAttribute("data-rminus"));
      const delta = plus ? 1 : -1;
      setState(s=>{
        const vv = s.venues.find(x=>x.id===v.id);
        if(!vv) return s;
        const rr = ensureRoster(vv);
        rr[key] = Number(rr[key]||0) + delta;
        // clamp
        rr.openDays = clamp(rr.openDays, 2, 7);
        rr.shiftsPerDay = clamp(rr.shiftsPerDay, 1, 2);
        rr.hoursPerShift = clamp(rr.hoursPerShift, 4, 8);
        rr.kitchenPerShift = clamp(rr.kitchenPerShift, 0, 12);
        rr.fohPerShift = clamp(rr.fohPerShift, 0, 14);
        rr.barPerShift = clamp(rr.barPerShift, 0, 10);
        return s;
      });
      return;
    }

    const train = e.target.closest("[data-train]");
    if(train){
      const id = train.getAttribute("data-train");
      const opt = trainingOptions().find(o=>o.id===id);
      if(!opt) return;
      setState(s=>{
        const vv = s.venues.find(x=>x.id===v.id);
        if(!vv) return s;
        if(s.cash < opt.cost){
          s.logs.push({ week:s.week, type:"staff", msg:`Not enough cash for training (${money(opt.cost)}).` });
          return s;
        }
        s.cash -= opt.cost;
        applyTraining(vv, id);
        vv.burnout = clamp((vv.burnout||0) - 3, 0, 100);
        s.logs.push({ week:s.week, type:"staff", msg:`Training: ${opt.name} at ${vv.name}.` });
        return s;
      });
      return;
    }
  });

  return card;
}
f

function renderStaffIssues(v, state, setState){
  ensureStaffEventState(v);

  const card = document.createElement("div");
  card.className = "card";
  card.style.background = "rgba(255,255,255,.03)";

  const open = (v.staffIssues||[]).filter(x=>!x.resolved).slice(0, 6);

  card.appendChild(el(`
    <div class="h2">Staff issues</div>
    <div class="small">Small weekly problems that become big ones if ignored. Resolve to protect morale, burnout, and reviews.</div>
    <div class="hr"></div>
    <div class="small">Open issues: <b>${open.length}</b></div>
  `));

  if(!open.length){
    card.appendChild(el(`<div class="small" style="margin-top:10px;">No open staff issues.</div>`));
    return card;
  }

  for(const it of open){
    const sev = it.type==="resignation" ? "bad" : (it.type==="overtime" ? "warn" : "badge");
    const opts = it.options.map(o=>`
      <button class="btn ${o.id==="approve"||o.id==="retention"||o.id==="addcrew"?"primary":(o.id==="letgo"?"danger":"")}" data-issue="${it.id}" data-act="${o.id}">
        ${escapeHtml(o.label)}${o.cost?` (${money(o.cost)})`:""}
      </button>
    `).join(" ");

    card.appendChild(el(`
      <div class="card" style="margin:10px 0; background:rgba(255,255,255,.03);">
        <div><span class="badge ${sev}">${escapeHtml(it.type)}</span> <b>${escapeHtml(it.title)}</b></div>
        <div class="small">${escapeHtml(it.body)}</div>
        <div class="row" style="gap:8px; flex-wrap:wrap; margin-top:10px;">
          ${opts}
        </div>
      </div>
    `));
  }

  card.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-issue]");
    if(!b) return;
    const issueId = b.getAttribute("data-issue");
    const act = b.getAttribute("data-act");
    setState(s=>{
      resolveStaffIssue(s, v.id, issueId, act);
      return s;
    });
  });

  return card;
}
unction roundTo(x, step){ return Math.round(x/step)*step; }

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function labelMenuStyle(id){
  const map = {
    a_la_carte: "À la carte",
    tasting: "Tasting menu",
    counter: "Counter / fast casual",
    pub: "Pub service",
    cafe: "Cafe / all-day",
    truck: "Food truck",
    hotel: "Hotel all-day",
    winery: "Winery lunch",
  };
  return map[id] || "À la carte";
}

function avgBurnout(state){
  if(!state.venues || !state.venues.length) return 0;
  let n=0, s=0;
  for(const v of state.venues){
    if(v.burnout==null) continue;
    s += Number(v.burnout||0);
    n += 1;
  }
  return n ? s/n : 0;
}
function avgMorale(state){
  if(!state.venues || !state.venues.length) return 0;
  let n=0, s=0;
  for(const v of state.venues){
    if(v.morale==null) continue;
    s += Number(v.morale||0);
    n += 1;
  }
  return n ? s/n : 0;
}
function countOpenStaffIssues(state){
  let c=0;
  for(const v of (state.venues||[])){
    if(!v.staffIssues) continue;
    c += v.staffIssues.filter(x=>!x.resolved).length;
  }
  return c;
}
import { SUPPLY_CATEGORIES, SUPPLIERS } from "./data_suppliers.js";
  function renderStepBrand(){
    ensureBrands(state);

    if(state.brandMode === "chain"){
      wiz.brandId = state.chainBrandId;
      const b = brandById(state, wiz.brandId);
      wizBody.innerHTML = `
        <div class="card">
          <div class="h2">Brand</div>
          <div class="small">Chain mode: all venues belong to one brand.</div>
          <div class="hr"></div>
          <div class="small">Brand: <b>${escapeHtml(b ? b.name : (state.chainBrandName||"My Brand"))}</b></div>
          <div class="small">Tip: adjust standards in <b>HQ</b> later.</div>
        </div>
      `;
      return;
    }

    const brands = listBrands(state);
    const opts = brands.map(b=>`<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)} (std ${Math.round(b.standards||50)})</option>`).join("");
    wizBody.innerHTML = `
      <div class="card">
        <div class="h2">Brand</div>
        <div class="small">Portfolio mode: attach this venue to an existing brand — or create a new one.</div>
        <div class="hr"></div>

        <label>Attach to existing brand</label>
        <select id="wizBrandPick">
          <option value="">— Create new brand —</option>
          ${opts}
        </select>

        <div class="hr"></div>
        <label>New brand name</label>
        <input id="wizNewBrandName" placeholder="e.g., Corner Table" value="${escapeHtml(wiz.newBrandName||"")}" />

        <div class="small" style="margin-top:8px;">You can adjust standards in <b>HQ</b> anytime.</div>
      </div>
    `;

    const pick = wizBody.querySelector("#wizBrandPick");
    const name = wizBody.querySelector("#wizNewBrandName");
    pick.addEventListener("change", ()=>{ wiz.brandId = pick.value || null; renderWizardNav(); });
    name.addEventListener("input", ()=>{ wiz.newBrandName = name.value; renderWizardNav(); });
  }


