# Restaurant Tycoon — Changelog (Flatpack)

## v2.8.0 — Walking Animation + Placeable Appliances + Walls/Door
- Added 2-frame “walking” sprites for guests and staff (auto-animates while moving).
- Added placeable kitchen appliances in Build mode: Grill, Fryer, Oven, Coffee.
  - Appliances cost cash and add parallel station capacity (Cook or Bar).
- Added wall tiling + door sprite at entry for a more “building” feel.


## v2.7.0 — More Images (Equipment, Decor Props, Bubbles)
- Added equipment sprites (grill, fryer, oven, coffee, tap, shaker) shown on stations.
- Added decor prop sprites (plant, art, lamp, candle) auto-drawn inside Decor zones.
- Added guest “speech bubble” sprites (wait/complain/thanks) for clearer service feel.


## v2.6.0 — Dish Icons + Visual Orders
- Added dish icon sprites (burger/steak/pasta/salad/dessert/coffee/cocktail/wine).
- Tickets now display a dish icon.
- Guests show the dish icon floating above them while waiting/eating (sprites mode).


## v2.5.0 — More Images (Guests + Staff + Icons)
- Added guest sprites (regular, local, VIP, critic) + staff sprites (server, runner, cleaner, host).
- Added small state icons (wait/alert/ok) displayed near guests.
- Guests and staff now render as sprites when “Use sprites (images)” is enabled, with vector fallback.


## v2.4.1 — Tycoon Art Pack (Images)
- Replaced placeholder sprites with a themed “Classic Tycoon” art pack (wood floor, tables, stations).
- Added customer head sprites for seated guests (when sprites enabled).


## v2.4.0 — Image Assets (Sprites)
- Added optional sprite-based rendering (floor tile, tables, and stations).
- Added Assets loader with graceful fallback to vector graphics if images fail to load.
- Added UI toggle: “Use sprites”.
- Packaged an /assets folder for GitHub Pages.


## v2.3.2 — Graphics Pass (no assets)
- Added subtle procedural floor texture + vignette.
- Improved table depth with soft shadows.
- Added glow cues for busy stations.
- UI polish: subtle card glow and pill blur.


## v2.3.1 — Hotfix (getLayout recursion)
- Fixed a call-stack crash on iOS where getLayout() accidentally called itself.

## v2.3.0 — Zones, Rotation, Station Capacity
- Added Layout Editor UI (tool selector + hints).
- New tools: Rotate Table, Paint Zone (Decor/Blocked), Delete Zone.
- Decor zones boost satisfaction for tables inside them; blocked zones prevent placement.
- New station capacity upgrades (Prep/Cook/Pass/Bar) for more parallel ticket processing.


## v2.2.1 — Layout Editor (Build Mode)
- Added tap-to-place layout editor: move tables, place new 2/4/6-top tables, delete tables, move kitchen block, move door/queue, and reposition PREP/COOK/PASS/BAR stations.
- Added layout tool selector + “Clear” button, plus improved mobile build workflow.

## v2.2.0 — Build / Operate Mode
- Added Build/Operate toggle.
- New Build Mode: open/close tables, upgrade Kitchen/Bar/Decor, and jump buttons to Dining/Kitchen/Door on mobile.
- Build upgrades affect station speed (Kitchen/Bar) and give a small satisfaction bonus (Decor).


## v2.1.6 — Hotfix (L is undefined)
- Fixed a crash in the service loop on iOS where updateSim referenced layout `L` without defining it.

## v2.1.5 — Hotfix (iOS draw crash + mobile view)
- Added Canvas roundRect polyfill to prevent iOS Safari crashes.
- Restored mobile-friendly floorplan by making the canvas scrollable (pan around dining/kitchen/queue).

## v2.1.4 — Hotfix (chooseDish crash)
- chooseDish() now always returns a valid dish even if the available pool is empty (prevents service loop crash).

## v2.1.3 — Hotfix (Regulars crash)
- Made random pick + regular pool creation safe on empty lists (prevents boot crash on Pages).

## v2.1.1 — Hotfix (Service not starting)
- Fixed a JavaScript syntax issue that prevented the game loop/buttons from running on GitHub Pages.


This file lives in the zip so we can track what’s been added over time.

---

## v2.1 — Complaints + Split Bills
- **Complaints panel (live):** service issues generate complaints you can resolve mid-service.
  - Actions: **Apology** (free) or **Comp 15%** (costs margin, helps rating).
  - Triggers: long **food wait**, long **drink wait**, long **wait to pay**.
  - Report tracks **Complaints fixed**; UI pill shows **Fix:** count.
- **Split bills:** larger groups can split (adds payment time).
- **EFTPOS delays:** occasional payment terminal delays (more likely when busy) affect satisfaction/tips.
- **Runner prioritises drinks:** drink tickets are delivered before food tickets when ready.

## v2.0 — Incidents + Tips
- **Incidents system** (probability rises with low cleanliness, low skill, high backlog):
  - **Refire**: remake ticket (adds time + waste cost).
  - **Burn/Rush**: reduces quality.
  - **Comp**: discount applied to bill (hits margin).
- **Tips added at payment:** tip % depends on satisfaction + guest type and is reduced by late/dirty/slow factors.
- **Drink timing effects:** fast drinks improve satisfaction; late drinks reduce satisfaction; drinks after food add a small penalty.
- End-of-day report includes **Incidents** and **Tips**.

## v1.9 — Bar + Bottlenecks
- **Bar/drinks as 2nd ticket** (DR tickets) with BAR station.
- **Station capacity/bottlenecks:**
  - Extra **cooks** increase throughput on PREP/COOK/PASS.
  - Extra **bartenders** increase BAR capacity.
- **Skill system:** Cook/Bar skill improve across days (affected by cleanliness); optional **Training** button boosts skill.
- **86 Board:** shows sold-out items during service.
- Menu upgraded to **Food + Drinks** with stock counts per item.

## v1.8 — Payments + Stockouts
- **Payment stage:** guests now go **EAT → READY_TO_PAY → PAY → LEAVE**.
  - Tables don’t free up until the bill is closed.
- **Dish stockouts / prep limits:** each item has a per-service prep count.
  - When stock hits zero it becomes **86’d**.
  - Sold-out items cause substitutions and can affect satisfaction/issues.
- Menu panel shows **stock remaining**.
- End-of-day report includes **Stockouts (86)**.

## v1.7 — Queue + Host + Overbooking
- **Door queue:** guests arrive and form an actual line.
- **Host seating logic:** host seats guests instead of instant seating.
- **Bookings first:** booking parties are prioritised; tables can be **held** for upcoming bookings.
- **Overbooking penalties:** waits increase; bookings may walk out; VIP/Critic walkouts hurt rating more.

## v1.6 — Pacing + Regulars
- **Table pacing:** ability to hold tables for better flow (and handle rushes).
- **Regulars system:** returning guests with preferences/loyalty and stronger review impact over time.

## v1.5 — Bookings + Staff
- **Bookings/reservations:** booking list influences arrivals and seating pressure.
- **Hiring staff:** expanded staffing options and daily wages impact cash flow.

## v1.4 — FOH + Customer Types
- **Customer types:** Regular / Family / VIP / Critic (different patience, budgets, review weight).
- **FOH logic improvements:** seating/flow rules tightened for more realistic service feel.

## v1.3 — Reviews + Feedback
- **Customers actually order & leave reviews** based on service factors and experience.
- Basic review tagging and rating change hooks.

## v1.2 — Service Orders (Foundation)
- “Service” now generates **orders/tickets** instead of just time passing (foundation for kitchen loop).

## v1.1 — Menu + Pricing (Foundation)
- Menu pricing controls and basic margin/food cost calculations introduced.

---

## Notes / To-do ideas (next logical upgrades)
- Allergies & special requests (birthday, gluten-free, no onion).
- “Send-back / remake” decisions driven by guest complaints (player choice).
- Kitchen incidents expanded (equipment breakdown, staff no-show, power trip).
- Drinks-first FOH behaviour (server prompts drinks immediately after seating).
- Table move / re-seat logic (wrong table size, missed bookings).
