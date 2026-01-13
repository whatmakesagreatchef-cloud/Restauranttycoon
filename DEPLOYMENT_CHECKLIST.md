# 🚀 Deployment Checklist - Restaurant Empire Simulator v3.0.0

## Pre-Deployment Checklist

### ✅ File Verification
- [ ] All `.js` files present (check count: should be ~35 files)
- [ ] All `.png` files present (check count: should be ~58 images)
- [ ] `index.html` present
- [ ] `styles.css` present
- [ ] `README.md` present
- [ ] `CHANGELOG.md` present
- [ ] All files are in ROOT directory (no folders!)

### ✅ Code Verification
- [ ] No console errors in browser console (F12)
- [ ] Game loads and displays correctly
- [ ] Can navigate between all tabs
- [ ] Can save and load game state
- [ ] Mobile responsive (test with DevTools)

## GitHub Pages Deployment Steps

### Step 1: Create Repository
```bash
# Option A: Create new repo on GitHub website
1. Go to github.com
2. Click "+" → "New repository"
3. Name: restaurant-empire-sim
4. Public or Private (your choice)
5. DON'T initialize with README
6. Click "Create repository"

# Option B: Use GitHub CLI
gh repo create restaurant-empire-sim --public
```

### Step 2: Upload Files
```bash
# Navigate to your local folder
cd /path/to/restaurant-sim-v3

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Restaurant Empire Simulator v3.0.0"

# Link to remote repository (replace USERNAME)
git remote add origin https://github.com/USERNAME/restaurant-empire-sim.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
```
1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" in left sidebar
4. Under "Build and deployment":
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
5. Click "Save"
6. Wait 1-2 minutes for deployment
```

### Step 4: Verify Deployment
```
1. GitHub will show your site URL: https://USERNAME.github.io/restaurant-empire-sim
2. Click the URL or visit it in a new tab
3. Game should load within 5-10 seconds
4. Test all major features
```

## Troubleshooting

### Issue: Black Screen / Game Won't Load

#### Check 1: Files Location
```bash
# Files MUST be in root, not in folders
# ✅ Correct:
/index.html
/main.js
/state.js

# ❌ Wrong:
/src/index.html
/js/main.js
/lib/state.js
```

#### Check 2: GitHub Pages Settings
```
Settings → Pages
- Branch: main ✅
- Folder: / (root) ✅
- NOT: /docs ❌
```

#### Check 3: File Names (Case Sensitive!)
```bash
# File names must match EXACTLY
main.js ✅
Main.js ❌
MAIN.js ❌
```

#### Check 4: Browser Console
```
1. Open game page
2. Press F12 (or right-click → Inspect)
3. Go to "Console" tab
4. Look for RED errors
5. Common errors:
   - "Failed to load module" = wrong file path
   - "Unexpected token" = syntax error in JS
   - "404 Not Found" = missing file
```

#### Check 5: Hard Refresh
```
# Clear browser cache
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R

# Or use Incognito/Private mode
```

### Issue: Game Loads but Features Don't Work

#### Check 1: localStorage
```javascript
// Open browser console
localStorage.clear()
location.reload()
```

#### Check 2: Module Imports
```javascript
// Check main.js has correct imports
import { loadState } from "./state.js";  // ✅ Correct
import { loadState } from "state.js";    // ❌ Missing ./
```

### Issue: Mobile Not Working

#### Check 1: Viewport Meta Tag
```html
<!-- index.html should have: -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
```

#### Check 2: Touch Events
```javascript
// UI should use 'click' events, not 'hover'
button.addEventListener('click', ...); // ✅
button.addEventListener('hover', ...); // ❌
```

## Performance Optimization

### After Deployment

#### 1. Enable Caching
```html
<!-- Add to index.html <head> -->
<meta http-equiv="Cache-Control" content="public, max-age=31536000">
```

#### 2. Compress Images
```bash
# Use tools like TinyPNG or ImageOptim
# Target: <50KB per image
```

#### 3. Minify CSS (Optional)
```bash
# Use online tools or:
npx clean-css-cli styles.css -o styles.min.css
# Then update index.html to use styles.min.css
```

## Post-Deployment Testing

### Mobile Testing
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test landscape and portrait
- [ ] Test with slow 3G connection

### Desktop Testing
- [ ] Test on Chrome
- [ ] Test on Firefox  
- [ ] Test on Safari
- [ ] Test on Edge

### Functionality Testing
- [ ] New game starts correctly
- [ ] Can acquire first venue
- [ ] Weekly simulation works
- [ ] Save/load persists
- [ ] All tabs accessible
- [ ] All buttons work
- [ ] No console errors

## Updating After Deployment

### Quick Updates (Single File)
```bash
# Edit file locally
nano system_menu.js

# Commit and push
git add system_menu.js
git commit -m "Update: Improved menu pricing"
git push

# Wait 30 seconds, then refresh game
```

### Major Updates (Multiple Files)
```bash
# Edit files locally
# Test locally first!

# Commit all changes
git add .
git commit -m "Feature: Delivery system v1.0"
git push

# Wait 60 seconds for rebuild
```

## Backup Strategy

### Export Game State
```javascript
// Run in browser console
copy(localStorage.getItem('resim_state'))
// Paste to text file and save
```

### Backup Repository
```bash
# Download entire repo as ZIP
1. Go to GitHub repo
2. Click "Code" button
3. Click "Download ZIP"
4. Save to safe location
```

## Monitoring

### Check Site Status
```bash
# Visit: https://USERNAME.github.io/restaurant-empire-sim

# Check GitHub Actions tab for build logs
```

### Analytics (Optional)
```html
<!-- Add to index.html before </body> -->
<!-- Google Analytics, Plausible, etc. -->
```

## Success Criteria

✅ Game loads in <5 seconds
✅ No console errors
✅ Mobile responsive
✅ Save/load works
✅ All features functional
✅ Site accessible 24/7
✅ Updates deploy automatically

## Support Resources

- GitHub Pages Docs: https://docs.github.com/pages
- Repository Issues: Use GitHub Issues tab
- Browser DevTools: F12 for debugging

---

## Quick Reference

### Deploy Command (One-liner)
```bash
cd restaurant-sim-v3 && git init && git add . && git commit -m "Initial commit" && git remote add origin https://github.com/USERNAME/REPO.git && git push -u origin main
```

### Update Command (One-liner)
```bash
git add . && git commit -m "Update" && git push
```

### Reset LocalStorage (One-liner)
```javascript
localStorage.clear(); location.reload();
```

---

**Version**: 3.0.0
**Date**: January 14, 2025
**Status**: Ready for Deployment ✅

Good luck! 🚀
