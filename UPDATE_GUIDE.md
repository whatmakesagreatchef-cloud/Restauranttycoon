# 🔄 Update Guide - Restaurant Empire Simulator

## Quick Update Process

### For Module Updates (Most Common)

#### 1. Identify What to Update
```
Need to change:
- Game balance? → Edit data_*.js files
- Game logic? → Edit system_*.js files  
- UI/screens? → Edit ui_screens.js
- Visual styles? → Edit styles.css
```

#### 2. Edit Locally
- Make your changes in the appropriate file(s)
- Test locally (see Local Testing below)

#### 3. Commit to GitHub
```bash
git add [file-name].js
git commit -m "Update: [brief description]"
git push origin main
```

#### 4. Deploy
- GitHub Pages rebuilds automatically
- Wait 30-60 seconds
- Refresh your game
- Player saves are preserved! 🎉

---

## 📦 Update Patterns

### Pattern 1: Balance Tweaks
**Use Case**: Adjust prices, wages, difficulty

**Files**: `data_*.js`

**Example**: Lower starting costs
```javascript
// data_properties.js
export const PROPERTIES = [
  {
    id: "downtown-1",
    name: "Downtown Bistro",
    purchasePrice: 150000,  // Changed from 200000
    // ...
  }
];
```

**Deploy**:
```bash
git add data_properties.js
git commit -m "Balance: Reduced starting venue costs"
git push
```

### Pattern 2: New Features
**Use Case**: Add new game mechanics

**Files**: `data_*.js` (config) + `system_*.js` (logic) + `ui_screens.js` (UI)

**Example**: Add delivery system
1. Add config: `data_delivery.js`
2. Add logic: `system_delivery.js`
3. Update UI: Add screen in `ui_screens.js`
4. Import in `main.js` if needed

**Deploy**:
```bash
git add data_delivery.js system_delivery.js ui_screens.js
git commit -m "Feature: Delivery system"
git push
```

### Pattern 3: Bug Fixes
**Use Case**: Fix broken functionality

**Files**: Specific module with bug

**Example**: Fix calculation error
```javascript
// system_accounting.js
function calculateRevenue(venue) {
  // Fixed: was multiplying by 7 instead of 1
  return venue.weeklyCovers * venue.avgSpend * 1;  
}
```

**Deploy**:
```bash
git add system_accounting.js
git commit -m "Fix: Weekly revenue calculation"
git push
```

### Pattern 4: Visual Updates
**Use Case**: Improve appearance, add animations

**Files**: `styles.css`

**Example**: Better button styling
```css
.btn--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}
```

**Deploy**:
```bash
git add styles.css
git commit -m "UI: Improved button styling"
git push
```

---

## 🧪 Local Testing

### Setup Once
```bash
# Install http-server (or use Python/PHP)
npm install -g http-server

# Or use Python
python -m http.server 8080

# Or use PHP  
php -S localhost:8080
```

### Test Your Changes
```bash
# Navigate to project folder
cd /path/to/restaurant-sim-v3

# Start server
http-server -p 8080

# Open browser
open http://localhost:8080
```

### Testing Checklist
- [ ] Game loads without errors (check console)
- [ ] Saves/loads work correctly
- [ ] Mobile responsive (resize browser)
- [ ] No broken images/assets
- [ ] Performance is smooth (no lag)
- [ ] Feature works as expected

---

## 🎯 Version Control Best Practices

### Commit Message Format
```
Type: Brief description

[Optional] Longer explanation if needed
```

**Types**:
- `Feature:` New functionality
- `Fix:` Bug fixes
- `Balance:` Game balance adjustments
- `UI:` Visual/interface changes
- `Docs:` Documentation updates
- `Refactor:` Code cleanup (no behavior change)

**Examples**:
```bash
git commit -m "Feature: Add loyalty program system"
git commit -m "Fix: Staff wages calculating incorrectly"
git commit -m "Balance: Reduce menu item costs by 15%"
git commit -m "UI: Mobile-friendly customer complaints panel"
```

### Branching Strategy (Optional)
For larger updates, use branches:

```bash
# Create feature branch
git checkout -b feature/delivery-system

# Make changes...
git add .
git commit -m "Feature: Delivery system"

# Test on GitHub Pages (push branch)
git push origin feature/delivery-system

# Merge when ready
git checkout main
git merge feature/delivery-system
git push origin main
```

---

## 📋 Update Checklist

### Before Pushing
- [ ] Test changes locally
- [ ] Check browser console for errors
- [ ] Verify mobile responsive
- [ ] Check no files are missing
- [ ] Update version number if major change
- [ ] Update CHANGELOG.md

### After Pushing
- [ ] Wait 60 seconds for Pages rebuild
- [ ] Clear cache and test live site
- [ ] Check mobile devices
- [ ] Verify saves still work
- [ ] Monitor for issues

---

## 🔢 Version Numbering

### Format: `MAJOR.MINOR.PATCH`

- **MAJOR** (3.x.x): Breaking changes, major rewrites
- **MINOR** (x.1.x): New features, no breaking changes
- **PATCH** (x.x.1): Bug fixes, balance tweaks

**Examples**:
- `3.0.0` → `3.0.1`: Bug fix (patch)
- `3.0.1` → `3.1.0`: Added delivery system (minor)
- `3.1.0` → `4.0.0`: Complete UI overhaul (major)

### Update Version
```javascript
// index.html
<div id="version-info" data-version="3.1.0" data-build="2025-01-15"></div>
```

```markdown
// README.md
**Current Version**: 3.1.0
```

```javascript
// main.js
console.log('🚀 Restaurant Empire Simulator v3.1.0 initializing...');
```

---

## 🚨 Emergency Rollback

### If Update Breaks Game

#### Option 1: Revert Last Commit
```bash
git revert HEAD
git push origin main
```

#### Option 2: Reset to Previous Commit
```bash
# Find good commit
git log --oneline

# Reset (replace [hash] with commit hash)
git reset --hard [hash]
git push origin main --force
```

#### Option 3: Restore Specific File
```bash
# Restore from last commit
git checkout HEAD -- [filename]
git commit -m "Restore: [filename]"
git push
```

---

## 📦 Module Update Patterns

### Adding New System Module

**1. Create Module File**
```javascript
// system_newfeature.js
/**
 * New Feature System
 * Manages [feature description]
 */

export function initNewFeature(state) {
  // Initialization logic
}

export function updateNewFeature(state, delta) {
  // Update logic
}

export function getNewFeatureData(state) {
  // Getter logic
}
```

**2. Create Data File (if needed)**
```javascript
// data_newfeature.js
export const NEW_FEATURE_CONFIG = {
  enabled: true,
  settings: {
    // Configuration
  }
};
```

**3. Integrate in State**
```javascript
// state.js
export const defaultState = () => ({
  // ... existing state
  newFeature: {
    active: false,
    data: []
  }
});
```

**4. Add UI (if needed)**
```javascript
// ui_screens.js
function renderNewFeature(state, setState) {
  return `
    <div class="screen">
      <h1>New Feature</h1>
      <!-- UI markup -->
    </div>
  `;
}
```

**5. Deploy**
```bash
git add system_newfeature.js data_newfeature.js state.js ui_screens.js
git commit -m "Feature: New feature system"
git push
```

---

## 🎓 Update Examples

### Example 1: Add New Venue Type

**File**: `data_properties.js`
```javascript
{
  id: "food-truck-1",
  name: "Street Food Truck",
  type: "truck",  // New type!
  purchasePrice: 50000,
  capacity: 20,
  // ... rest of config
}
```

**File**: `system_property_market.js`
```javascript
// Add logic for truck-specific behavior
if (venue.type === 'truck') {
  // Mobile-specific logic
}
```

### Example 2: New Customer Type

**File**: `data_world.js`
```javascript
export const CUSTOMER_TYPES = {
  // ... existing types
  foodie: {
    name: "Foodie",
    patience: 0.7,
    budget: 1.3,
    reviewWeight: 1.5
  }
};
```

**File**: `system_customers.js`
```javascript
function generateCustomer() {
  const types = ['regular', 'family', 'vip', 'critic', 'foodie'];
  // ... selection logic
}
```

### Example 3: Balance Adjustment

**File**: `data_staff.js`
```javascript
export const STAFF_ROLES = {
  chef: {
    baseWage: 800,  // Reduced from 1000
    // ...
  }
};
```

---

## 📝 Update Log Template

Keep a log of your updates:

```markdown
## [Date] - v3.X.X

### Added
- New delivery system
- Food truck venue type

### Changed  
- Reduced chef wages by 20%
- Improved mobile UI

### Fixed
- Revenue calculation bug
- Customer complaint rendering

### Removed
- Deprecated old staff system
```

---

## 🎯 Testing Updates

### Automated Tests (Future)
```javascript
// test_update.js
function testRevenueCalculation() {
  const venue = { weeklyCovers: 100, avgSpend: 50 };
  const revenue = calculateRevenue(venue);
  console.assert(revenue === 5000, 'Revenue calculation failed');
}
```

### Manual Test Script
1. Load game in fresh browser
2. Start new game
3. Acquire first venue
4. Simulate 4 weeks
5. Check all major features
6. Verify mobile responsive
7. Test save/load
8. Check performance

---

## 💡 Pro Tips

1. **Test in Private/Incognito**: Fresh localStorage
2. **Use Browser DevTools**: Network tab for load times
3. **Mobile Device Testing**: Use real devices when possible
4. **Version Everything**: Tag releases in git
5. **Keep Backups**: Download full repo occasionally
6. **Document Changes**: Update CHANGELOG.md
7. **Small Commits**: Easier to track and revert

---

## 🆘 Common Issues

### Issue: Changes Not Showing
**Solution**: 
1. Clear browser cache (Ctrl+Shift+R)
2. Wait 60 seconds for Pages
3. Check file actually uploaded to GitHub

### Issue: Module Not Loading
**Solution**:
1. Check import paths in `main.js`
2. Verify file extension is `.js`
3. Check for syntax errors in console

### Issue: Save Corrupted
**Solution**:
1. Old saves may break with state structure changes
2. Add migration code in `state.js`
3. Or: Reset localStorage and start fresh

---

**Happy Updating! 🚀**

Need help? Check the README.md or ARCHITECTURE.md
