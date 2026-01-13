# 🍽️ Restaurant Empire Simulator v3.0.0

A comprehensive, modular restaurant empire management game with story-driven gameplay, realistic business simulation, and mobile-first design.

## 🎮 Game Features

### Core Gameplay
- **Story Mode**: Narrative-driven progression system with chapters and milestones
- **Strategic Management**: Realistic business simulation with detailed financials
- **Multiple Venues**: Build and manage a portfolio or chain of restaurants
- **Live Service**: Real-time service simulation with visual feedback
- **Staff Management**: Hire, train, and manage your team with morale and burnout systems
- **Supply Chain**: Dynamic supplier relationships with contracts and market volatility
- **Customer Experience**: Detailed customer simulation with complaints, reviews, and loyalty

### Advanced Systems
- **Financial Management**: P&L statements, loans, depreciation, and tax
- **Inventory System**: Par levels, auto-ordering, spoilage, and stockouts
- **Facilities**: Maintenance, breakdowns, energy costs, and renovations
- **Marketing**: Promos, events, influencers, and critic reviews
- **Brands**: Build chain brands or manage a diverse portfolio
- **Investors**: Raise capital, manage relationships, and handle governance

## 📦 Installation (GitHub Pages)

### Quick Deploy
1. Create a new repository on GitHub
2. Upload ALL files from this package (keep them in root, no folders)
3. Go to Settings → Pages
4. Select: Deploy from branch → main → / (root)
5. Save and wait 1-2 minutes
6. Visit your site at: `https://[username].github.io/[repo-name]`

### File Structure (Flat Pack)
```
/
├── index.html              # Main HTML entry point
├── main.js                 # Application controller
├── styles.css              # All styles (mobile-first)
│
├── state.js                # State management
├── rng.js                  # Random number utilities
│
├── ui_screens.js           # All UI screens/routes
├── ui_components.js        # Reusable UI components
│
├── data_*.js              # Game data/configuration
│   ├── data_accounting.js
│   ├── data_audits.js
│   ├── data_facilities.js
│   ├── data_inventory.js
│   ├── data_menu.js
│   ├── data_properties.js
│   ├── data_reviews.js
│   ├── data_staff.js
│   ├── data_suppliers.js
│   ├── data_venues.js
│   └── data_world.js
│
├── system_*.js            # Game logic modules
│   ├── system_accounting.js
│   ├── system_audits.js
│   ├── system_brands.js
│   ├── system_customers.js
│   ├── system_facilities.js
│   ├── system_inventory.js
│   ├── system_investors.js
│   ├── system_menu.js
│   ├── system_promos.js
│   ├── system_property_market.js
│   ├── system_quests.js
│   ├── system_reviews.js
│   ├── system_sim.js
│   ├── system_staff.js
│   ├── system_staff_events.js
│   └── system_suppliers.js
│
├── *.png                  # Game assets (sprites)
│
├── README.md              # This file
├── CHANGELOG.md           # Version history
├── ARCHITECTURE.md        # Technical documentation
├── MODDING_GUIDE.md      # Guide for extending the game
└── UPDATE_GUIDE.md       # How to update the game
```

## 🏗️ Architecture

### Modular Design Philosophy
The game is built with a highly modular architecture:

1. **Data Layer** (`data_*.js`): Configuration and static data
2. **System Layer** (`system_*.js`): Business logic and game rules
3. **State Layer** (`state.js`): Centralized state management
4. **UI Layer** (`ui_*.js`): Presentation and user interaction
5. **Utils Layer** (`rng.js`): Shared utilities

### Module Communication
```
User Input → UI Layer → State Manager → System Logic → State Update → UI Render
```

### Adding New Features
1. Add data to appropriate `data_*.js` file
2. Add logic to appropriate `system_*.js` file
3. Add UI in `ui_screens.js`
4. Update state schema if needed in `state.js`
5. Test and deploy (just commit and push!)

## 🎯 Design Principles

### 1. Mobile-First
- Touch-optimized controls
- Responsive layout
- Performance optimized
- No hover-dependent features

### 2. Story-Driven
- Narrative progression system
- Character-driven events
- Milestone celebrations
- Unlock-based progression

### 3. User-Friendly
- Comprehensive tutorials
- Contextual help
- Clear feedback
- Forgiving gameplay

### 4. Realistic Simulation
- Based on real restaurant economics
- Authentic business challenges
- Dynamic market conditions
- Meaningful decisions

## 🔧 Development

### Local Testing
1. Install a local web server:
   ```bash
   npm install -g http-server
   ```
2. Run server:
   ```bash
   http-server -p 8080
   ```
3. Open: `http://localhost:8080`

### Browser Console
Access debug tools in browser console:
```javascript
// View current state
__RESIM_DEBUG__.getState()

// Manually save
__RESIM_DEBUG__.saveState()

// Reset game (careful!)
__RESIM_DEBUG__.resetState()
```

### Module Hot-Swapping
Because of the flat structure, you can update individual modules:
1. Edit any `.js` file
2. Commit and push to GitHub
3. Wait ~30 seconds for Pages to rebuild
4. Refresh the game (Ctrl+R)
5. State persists across updates!

## 📱 Mobile Support

### Tested Platforms
- ✅ iOS Safari (iPhone/iPad)
- ✅ Chrome Android
- ✅ Chrome Desktop
- ✅ Firefox Desktop
- ✅ Safari Desktop

### PWA Features
The game can be installed as a Progressive Web App:
1. Open in browser
2. Choose "Add to Home Screen"
3. Launch like a native app

## 🎨 Customization

### Theming
Edit `styles.css` CSS variables:
```css
:root {
  --color-primary: #3498db;
  --color-success: #2ecc71;
  --color-warning: #f39c12;
  --color-danger: #e74c3c;
}
```

### Game Balance
Edit values in `data_*.js` files:
- Starting money: `data_world.js`
- Venue costs: `data_properties.js`
- Staff wages: `data_staff.js`
- Item prices: `data_menu.js`

### Adding Content
- New venues: `data_properties.js`
- New menu items: `data_menu.js`
- New staff roles: `data_staff.js`
- New suppliers: `data_suppliers.js`

## 🐛 Troubleshooting

### Black Screen on GitHub Pages
1. Check Settings → Pages is enabled
2. Verify all files are in root (not in folders)
3. Wait 1-2 minutes after push
4. Clear browser cache (Ctrl+Shift+R)
5. Check browser console for errors

### Game Won't Load
1. Open browser console (F12)
2. Look for red errors
3. Verify all `.js` files are present
4. Check file names (case-sensitive!)

### State Issues
1. Clear localStorage: `localStorage.clear()`
2. Reload page
3. Start new game

### Performance Issues
1. Close other tabs
2. Clear browser cache
3. Disable browser extensions
4. Use Chrome/Firefox (best performance)

## 📊 Save System

### How It Works
- Auto-saves every 30 seconds
- Saves on route change
- Saves before window close
- Stored in browser localStorage

### Backup Your Save
```javascript
// Export save
copy(localStorage.getItem('resim_state'))

// Import save (paste JSON string)
localStorage.setItem('resim_state', '[paste here]')
location.reload()
```

## 🚀 Roadmap

### v3.1 (Q1 2025)
- [ ] Mobile service mode enhancements
- [ ] Advanced staff scheduling
- [ ] More story chapters
- [ ] Achievement system

### v3.2 (Q2 2025)
- [ ] Multiplayer leaderboards
- [ ] Community challenges
- [ ] Seasonal events
- [ ] Recipe creation system

### v3.3 (Q2 2025)
- [ ] Franchise system
- [ ] International expansion
- [ ] Celebrity partnerships
- [ ] TV show integration

## 📜 License

© 2025 Restaurant Empire Simulator
Free to play, modify, and share.
Commercial use requires permission.

## 🤝 Contributing

Want to add features or fix bugs?
1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📞 Support

- Issues: GitHub Issues
- Discussions: GitHub Discussions
- Email: support@restaurant-empire.game

---

**Current Version**: 3.0.0
**Release Date**: January 14, 2025
**Build**: Modular Edition

Made with ❤️ for restaurant sim fans
