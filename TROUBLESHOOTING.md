# 🔧 TROUBLESHOOTING - "Loading Forever" Issue

## ⚠️ The Problem

If you see "Loading..." forever, this is caused by **ES6 modules not loading from file:// protocol**.

## ✅ The Solution

You MUST run the game through a web server. Choose ONE option below:

---

## Option 1: Python Web Server (Easiest!)

### If you have Python 3:
```bash
# Navigate to the folder with your files
cd /path/to/extracted/files

# Start server
python3 -m http.server 8080

# Open browser to:
http://localhost:8080
```

### If you have Python 2:
```bash
cd /path/to/extracted/files
python -m SimpleHTTPServer 8080

# Open browser to:
http://localhost:8080
```

---

## Option 2: Node.js http-server

```bash
# Install once (globally)
npm install -g http-server

# Navigate to folder
cd /path/to/extracted/files

# Start server
http-server -p 8080

# Open browser to:
http://localhost:8080
```

---

## Option 3: PHP Built-in Server

```bash
cd /path/to/extracted/files
php -S localhost:8080

# Open browser to:
http://localhost:8080
```

---

## Option 4: VS Code Live Server Extension

1. Install "Live Server" extension in VS Code
2. Open folder in VS Code
3. Right-click `index.html`
4. Select "Open with Live Server"
5. Browser opens automatically!

---

## Option 5: Deploy to GitHub Pages (BEST FOR SHARING!)

This is the recommended approach:

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Name: `restaurant-empire-sim`
3. Public repository
4. DON'T initialize with README
5. Click "Create repository"

### Step 2: Upload Files
**Via Web Interface** (easiest):
1. On your repo page, click "uploading an existing file"
2. Drag ALL extracted files into the upload area
3. Scroll down, commit message: "Initial commit"
4. Click "Commit changes"

**Via Command Line**:
```bash
cd /path/to/extracted/files
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/restaurant-empire-sim.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to repository Settings
2. Click "Pages" in sidebar
3. Source: **Deploy from a branch**
4. Branch: **main**
5. Folder: **/ (root)**
6. Click "Save"

### Step 4: Wait & Visit
- Wait 1-2 minutes for build
- Visit: `https://USERNAME.github.io/restaurant-empire-sim`
- **Game will load immediately!**

---

## Why This Happens

**Technical Explanation:**

ES6 modules (the `import`/`export` statements in JavaScript) have a security restriction called **CORS** (Cross-Origin Resource Sharing).

When you open `index.html` directly in a browser:
- URL is `file:///C:/path/to/index.html`
- Browser blocks module loading for security
- Game stays on "Loading..." forever

When you use a web server:
- URL is `http://localhost:8080/index.html`
- Browser allows module loading
- Game loads instantly! ✅

---

## Quick Test

Want to verify it will work?

1. Start any web server (Python is easiest)
2. Open `http://localhost:8080/TEST_LOCAL.html`
3. You should see green ✓ checkmarks
4. If you see errors, note the error message

---

## Common Mistakes

### ❌ WRONG: Double-clicking index.html
- Opens as `file:///...`
- Modules won't load
- Shows "Loading..." forever

### ✅ RIGHT: Using a web server
- Opens as `http://localhost:8080/...`
- Modules load correctly
- Game starts immediately

---

## Verification Checklist

Before asking for help, verify:

- [ ] Files are extracted (not still in ZIP)
- [ ] All files are in ONE folder (no subfolders)
- [ ] You're using a web server (not file://)
- [ ] You opened `http://localhost:8080` (not `file://...`)
- [ ] Browser console shows no errors (F12 → Console tab)

---

## Browser Console (F12) Errors

If you see errors in console:

### "Failed to load module"
→ You're using `file://` protocol
→ Use a web server instead

### "Cannot find module './xxx.js'"
→ Missing file or wrong path
→ Verify all files extracted correctly

### "Unexpected token"
→ Syntax error in JavaScript
→ File may be corrupted, re-extract ZIP

---

## Still Not Working?

### Check Browser Console
1. Open game page
2. Press F12 (or right-click → Inspect)
3. Go to "Console" tab
4. Look for RED error messages
5. Share the error message for help

### Check Network Tab
1. F12 → Network tab
2. Refresh page
3. Look for failed requests (red)
4. Check if any .js files show 404

### Try Different Browser
- Chrome (recommended)
- Firefox
- Edge
- Safari (Mac)

---

## GitHub Pages Specific Issues

### "404 - File not found"
→ Files not in repository root
→ Make sure no folders, all files in root

### Still shows old version
→ Clear browser cache: Ctrl+Shift+R (Win) or Cmd+Shift+R (Mac)
→ Or use incognito/private mode

### Build fails
→ Check Settings → Pages shows "Your site is published"
→ Wait full 2 minutes for first build

---

## Summary

**The fix is simple:**

```bash
# Navigate to extracted files
cd /path/to/files

# Start Python server
python3 -m http.server 8080

# Open browser
http://localhost:8080
```

**That's it!** Game will load instantly.

Or deploy to GitHub Pages for permanent hosting.

---

## Need More Help?

1. Check browser console for errors
2. Verify web server is running
3. Try the TEST_LOCAL.html file
4. Make sure URL starts with `http://` not `file://`

**The game works perfectly - it just needs a web server!**

---

**Version**: 2.x
**Updated**: January 14, 2025
**Issue**: ES6 Module CORS Restriction
**Solution**: Use Web Server ✅
