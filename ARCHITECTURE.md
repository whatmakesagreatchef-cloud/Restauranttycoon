# 🏗️ Architecture Documentation - Restaurant Empire Simulator v3.0.0

## System Overview

Restaurant Empire Simulator is a modular, story-driven business simulation game built with vanilla JavaScript and modern web technologies. The architecture emphasizes modularity, maintainability, and ease of updates.

## Technology Stack

### Core Technologies
- **HTML5**: Semantic markup, meta tags for PWA support
- **CSS3**: Modern styling with CSS variables, flexbox, grid
- **JavaScript ES6+**: Modules, async/await, modern syntax
- **LocalStorage API**: Client-side persistence

### No Dependencies
- Zero npm packages required
- No build step needed
- No bundler required
- Works directly in browser

## Architecture Layers

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (UI Screens, Components, Rendering)    │
├─────────────────────────────────────────┤
│         Application Layer               │
│    (State Management, Controllers)      │
├─────────────────────────────────────────┤
│         Business Logic Layer            │
│   (Game Systems, Calculations, Rules)   │
├─────────────────────────────────────────┤
│         Data Layer                      │
│  (Configuration, Static Data, Assets)   │
└─────────────────────────────────────────┘
```

## Module Structure

### 1. Entry Point
**File**: `index.html`
- Minimal HTML structure
- Meta tags for mobile/PWA
- Script imports
- Loading splash screen

**File**: `main.js`
- Application initialization
- State management setup
- Event listener registration
- Error handling
- Debug utilities

### 2. State Management
**File**: `state.js`
- Centralized state container
- Default state factory
- Load/save to localStorage
- State schema definition
- Migration logic (future)

**State Structure**:
```javascript
{
  // Meta
  version: "3.0.0",
  createdAt: timestamp,
  lastSaved: timestamp,
  
  // Navigation
  route: "story|world|venues|ops|hq|capital",
  
  // Core Game State
  week: 0,
  cash: 500000,
  
  // Venues (array)
  venues: [
    {
      id: string,
      name: string,
      location: string,
      type: string,
      reputation: number,
      staff: {...},
      menu: {...},
      inventory: {...},
      // ... more venue data
    }
  ],
  
  // Narrative State
  narrative: {
    chapter: number,
    unlockedChapters: array,
    completedEvents: array,
    playerChoices: object,
    achievements: array
  },
  
  // Empire-wide state
  investors: array,
  loans: array,
  brands: array,
  suppliers: object,
  
  // History
  weeklyReports: array,
  notifications: array
}
```

### 3. Data Layer (data_*.js)
Pure configuration and static data. No logic, only exports.

**Purpose**: Define game constants, templates, and base data

**Files**:
- `data_world.js` - World settings, customer types, starting conditions
- `data_properties.js` - Available venues for purchase
- `data_menu.js` - Menu item templates
- `data_staff.js` - Staff roles, wages, attributes
- `data_suppliers.js` - Supplier profiles, categories
- `data_facilities.js` - Equipment, renovations, maintenance
- `data_inventory.js` - Inventory categories, storage
- `data_venues.js` - Venue type definitions
- `data_reviews.js` - Review platforms, templates
- `data_accounting.js` - Financial constants
- `data_audits.js` - Compliance rules

**Example**:
```javascript
// data_menu.js
export const MENU_ITEMS = [
  {
    id: "burger",
    name: "Gourmet Burger",
    category: "mains",
    baseCost: 8,
    basePrice: 24,
    prepTime: 15,
    station: "grill"
  },
  // ... more items
];
```

### 4. System Layer (system_*.js)
Business logic and game rules. Pure functions when possible.

**Purpose**: Implement game mechanics and calculations

**Files**:
- `system_sim.js` - Weekly simulation engine (master orchestrator)
- `system_narrative.js` - Story progression, events, achievements
- `system_customers.js` - Customer generation, satisfaction, reviews
- `system_menu.js` - Menu engineering, pricing optimization
- `system_staff.js` - Hiring, training, morale, burnout
- `system_staff_events.js` - Staff issues and decisions
- `system_inventory.js` - Stock management, ordering, spoilage
- `system_suppliers.js` - Supplier relationships, contracts
- `system_facilities.js` - Maintenance, breakdowns, renovations
- `system_accounting.js` - P&L, depreciation, tax
- `system_investors.js` - Fundraising, governance, dividends
- `system_brands.js` - Brand management for chains/portfolios
- `system_property_market.js` - Venue acquisition, sales
- `system_promos.js` - Marketing campaigns
- `system_quests.js` - Optional objectives and rewards
- `system_reviews.js` - Review platforms, responses, viral events
- `system_audits.js` - Compliance, inspections

**Design Pattern**:
```javascript
// System modules export pure functions
export function calculateRevenue(venue, week) {
  const covers = venue.weeklyCovers || 0;
  const avgSpend = venue.avgSpend || 50;
  return covers * avgSpend;
}

export function updateVenue(venue, state) {
  // Apply game rules
  venue.revenue = calculateRevenue(venue, state.week);
  // Return modified venue
  return venue;
}
```

### 5. UI Layer (ui_*.js)

**File**: `ui_screens.js`
- Master render function
- Route-based screen rendering
- All main game screens
- ~3500 lines (large but manageable)

**File**: `ui_components.js`
- Reusable UI components
- Toast notifications
- Modals, dialogs
- Format utilities (currency, dates, etc.)

**Rendering Pattern**:
```javascript
// ui_screens.js
export function render(state, setState) {
  const app = document.getElementById('app');
  
  let html = '';
  
  switch(state.route) {
    case 'story':
      html = renderStoryScreen(state, setState);
      break;
    case 'venues':
      html = renderVenuesScreen(state, setState);
      break;
    // ... other screens
  }
  
  app.innerHTML = html;
  attachEventListeners(state, setState);
}
```

### 6. Utilities
**File**: `rng.js`
- Random number generation
- Seeded RNG for reproducibility
- Helper functions (pick, range, weighted choice)

**File**: `ui_components.js`
- Format functions
- Component builders
- Toast system

## Data Flow

### User Interaction Flow
```
User clicks button
  ↓
Event listener fires
  ↓
setState() called with mutator function
  ↓
State updated
  ↓
State saved to localStorage
  ↓
refresh() called
  ↓
render() called with new state
  ↓
UI updates
```

### Weekly Simulation Flow
```
User clicks "Next Week"
  ↓
system_sim.runWeek(state)
  ↓
┌─────────────────────────────┐
│ For each venue:             │
│  - Generate customers       │
│  - Process orders           │
│  - Calculate revenue        │
│  - Apply costs              │
│  - Update reputation        │
│  - Generate events          │
│  - Handle staff issues      │
│  - Process inventory        │
│  - Run facilities           │
└─────────────────────────────┘
  ↓
Update narrative/achievements
  ↓
Generate weekly report
  ↓
Return updated state
  ↓
Render results
```

## Design Principles

### 1. Modularity
- **Single Responsibility**: Each module has one clear purpose
- **Loose Coupling**: Modules don't directly depend on each other
- **High Cohesion**: Related functionality grouped together

### 2. Data Immutability
```javascript
// ✅ Good: Return new object
function updateVenue(venue) {
  return { ...venue, updated: true };
}

// ❌ Bad: Mutate input
function updateVenue(venue) {
  venue.updated = true;
  return venue;
}
```

### 3. Pure Functions (Where Possible)
```javascript
// ✅ Pure: Same input = same output, no side effects
function calculateProfit(revenue, costs) {
  return revenue - costs;
}

// ❌ Impure: Depends on external state
function calculateProfit() {
  return window.revenue - window.costs;
}
```

### 4. Progressive Enhancement
- Core game works without JavaScript (well, minimal HTML)
- Features gracefully degrade
- Mobile-first, desktop-enhanced

## State Management Philosophy

### Centralized State
- Single source of truth
- Predictable updates
- Easy to debug

### State Update Pattern
```javascript
// All state changes go through setState()
setState(state => {
  // Make changes to state
  state.cash += 1000;
  state.week += 1;
  
  // Return modified state (or return nothing)
  return state;
});
```

### Persistence
- Auto-save every 30 seconds
- Save on route change
- Save before window close
- Manual save: `saveState()`

## Performance Considerations

### Rendering Optimization
- Only re-render on state changes
- Minimal DOM manipulation
- Use CSS for animations (not JS)
- Lazy load assets

### State Size Management
```javascript
// Keep state lean
// ✅ Good: Reference by ID
{
  activeVenueId: "venue-1",
  venues: [{ id: "venue-1", ... }]
}

// ❌ Bad: Duplicate data
{
  activeVenue: { id: "venue-1", ... },
  venues: [{ id: "venue-1", ... }]
}
```

### Memory Management
- Clear old data periodically
- Limit history arrays (e.g., last 52 weeks only)
- Compress notifications

## Error Handling

### Global Error Handler
```javascript
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  showToast('An error occurred', 'error');
});
```

### Try-Catch in Critical Paths
```javascript
function setState(mutator) {
  try {
    state = mutator(state) || state;
    saveState(state);
    refresh();
  } catch (error) {
    console.error('setState error:', error);
    showToast('Failed to update', 'error');
  }
}
```

## Testing Strategy

### Manual Testing
1. Load game in fresh browser
2. Start new game
3. Test each major feature
4. Verify save/load
5. Test mobile responsive

### Browser Console Testing
```javascript
// Access debug utilities
__RESIM_DEBUG__.getState()
__RESIM_DEBUG__.setState(s => { s.cash = 1000000; return s; })
__RESIM_DEBUG__.saveState()
__RESIM_DEBUG__.resetState()
```

### Automated Testing (Future)
```javascript
// test_suite.js (not yet implemented)
function testRevenueCalculation() {
  const result = calculateRevenue({ covers: 100, avgSpend: 50 });
  assert(result === 5000, "Revenue calculation failed");
}
```

## Security Considerations

### Client-Side Only
- No server = no server vulnerabilities
- No database = no SQL injection
- No authentication = no password leaks

### XSS Protection
```javascript
// Sanitize user input (if any)
function sanitize(html) {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}
```

### LocalStorage Limits
- 5-10MB storage limit
- Clear old data if approaching limit
- Warn user if storage full

## Mobile Optimization

### Touch-Friendly
- Minimum 44x44px touch targets
- No hover-dependent features
- Swipe gestures where appropriate

### Performance
- Minimize reflows
- Use transform/opacity for animations
- Optimize images (<50KB each)

### Responsive Design
```css
/* Mobile-first approach */
.card {
  width: 100%;
}

/* Desktop enhancement */
@media (min-width: 768px) {
  .card {
    width: 50%;
  }
}
```

## Deployment Architecture

```
Developer Machine
  ↓
  (git push)
  ↓
GitHub Repository (main branch)
  ↓
  (GitHub Pages automatic build)
  ↓
CDN (GitHub's global CDN)
  ↓
User's Browser
```

### Build Process
1. Push to GitHub
2. GitHub detects change
3. Builds static site (~30 seconds)
4. Deploys to CDN
5. Cache invalidation
6. Site updated globally

## Future Enhancements

### v3.1 Roadmap
- [ ] Service worker for offline play
- [ ] IndexedDB for larger saves
- [ ] WebGL for advanced graphics
- [ ] Web Audio API for sound effects
- [ ] WebSocket for multiplayer (maybe)

### Scalability
- Current architecture supports ~10 venues comfortably
- Can scale to 50+ venues with optimization
- Consider worker threads for heavy simulation

## Debugging Guide

### Common Issues

**Issue**: Module not loading
```javascript
// Check import path
import { x } from "./module.js"; // ✅
import { x } from "module.js";   // ❌ missing ./
```

**Issue**: State not persisting
```javascript
// Check localStorage
localStorage.getItem('resim_state')
// If null, state isn't saving
```

**Issue**: Render not updating
```javascript
// Check setState calls
setState(s => {
  s.something = newValue;
  return s; // ✅ Must return!
});
```

### Debug Tools
```javascript
// View state
__RESIM_DEBUG__.getState()

// Monitor state changes
const oldSetState = setState;
setState = function(mutator) {
  console.log('State before:', getState());
  oldSetState(mutator);
  console.log('State after:', getState());
};
```

## Code Style Guide

### Naming Conventions
```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_VENUES = 10;

// Functions: camelCase
function calculateRevenue() {}

// Classes: PascalCase (rare)
class VenueManager {}

// Files: lowercase_snake
// data_menu.js
// system_sim.js
```

### Comments
```javascript
// Single-line comments for brief explanations

/**
 * Multi-line comments for complex functions
 * @param {Object} state - Game state
 * @returns {Object} Updated state
 */
function complexFunction(state) {}
```

## Maintenance

### Regular Tasks
- Update version numbers
- Update CHANGELOG.md
- Test on multiple browsers
- Check performance metrics
- Review error logs (browser console)

### Emergency Fixes
1. Identify issue
2. Fix locally
3. Test thoroughly
4. Push to GitHub
5. Verify deployment

---

## Quick Reference

### Module Responsibilities

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| main.js | App controller | initApp(), setState(), refresh() |
| state.js | State management | loadState(), saveState(), defaultState() |
| ui_screens.js | Rendering | render(), renderXScreen() |
| ui_components.js | UI utilities | showToast(), formatCurrency() |
| system_sim.js | Simulation | runWeek(), updateVenue() |
| system_narrative.js | Story | updateNarrative(), getAvailableEvents() |
| rng.js | Random numbers | RNG.random(), RNG.pick() |

### File Count
- Total: ~95 files
- JavaScript: ~35 modules
- Images: ~58 sprites
- Documentation: 5 markdown files
- Core: 3 files (index.html, main.js, styles.css)

---

**Last Updated**: January 14, 2025
**Version**: 3.0.0
**Maintainer**: Development Team
