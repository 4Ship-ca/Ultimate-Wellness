# 🔥 Ultimate Wellness System v1.0

**Your complete health & wellness command center** - Food tracking, exercise logging, sleep monitoring, medication management, and more. All in one beautiful, privacy-focused app.

![Version](https://img.shields.io/badge/version-1.0.0-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-stable-green)

## 🌟 Features

### 📊 Smart Points Tracking
- **Dynamic daily points** calculated from your age, weight, height, gender, and activity level
- **Automatic recalculation** every 4 weeks as you lose weight
- **Points banking** - unused points roll over for up to 7 days (use for cheat meals!)
- **Exercise points** deducted from food points
- **Guardrails**: 22-28 points/day based on best practices

### 🏋️ Exercise Logging
- **6 pre-configured activities**: Chores, Vacuum, Laundry, Elliptical, Walk, Yard Work
- **Time-based logging**: 15, 30, 45, 60 minute buttons
- **Points calculation**: 1 point per 15 minutes (moderate exercise)
- **Running totals**: See "30 + 15 + 45 = 90 min" breakdowns
- **Reset buttons**: Undo misclicks per activity

### 💧 Water Tracking
- **8 drops = 2000ml** (standard 8 cups/day goal)
- **Persistent bottom bar** - always visible, never in the way
- **Food water tracking** - automatically detects hydrating foods
  - Smoothies, soup, fruits, vegetables, milk, coffee, etc.
  - 40+ hydrating foods in database
  - Shows: "Drinks: 1500ml (6/8) + Food: 250ml"
- **Daily reset** at midnight

### 🍎 Food Tracking
- **Barcode scanning** with OpenFoodFacts API integration
- **AI photo analysis** via Claude Vision API
- **SmartPoints formula**: (Calories × 0.0305) + (Sat Fat × 0.275) + (Sugar × 0.12) − (Protein × 0.098)
- **Water content detection** - prompts to add water from hydrating foods
- **NO-GO foods** tracking
- **Like/Dislike** preferences
- **Kid-approved** meal flagging

### 😴 Sleep Tracker
- **Good Night** / **Good Morning** buttons
- **Quality ratings**:
  - 😴 Zonked (Can't remember!)
  - 😊 Good (Felt great)
  - 😐 Restless (Tossed & turned)
  - 😞 Poor (Barely slept)
- **7-day history** with emoji indicators

### 💊 Medication Management
- **Scan medication labels** via OCR
- **Morning / Afternoon / Evening** tracking
- **Visual taken indicators** (green buttons)
- **Reset buttons** for each medication

### ✅ Daily Tasks
- **Want to Do** - Personal goals
- **Need to Do** - Must-complete tasks
- **I'm Grateful For** - Gratitude journal
- Done / Defer buttons for each

### ⚖️ Weight Tracking
- **12-week rolling goal window**
  - Goal always 12 weeks away
  - Weekly goal = (current - goal) / 12
  - Creates natural tapering curve as you approach goal
- **Weekly weigh-ins** (Sundays recommended)
- **Progress bar** visualization
- **Automatic points adjustment** based on weight changes

### 🗄️ Robust Data Storage
- **IndexedDB** - Multi-year capacity
- **15 separate tables**:
  - Settings, Foods, Exercise, Sleep, Medications, Med Logs
  - Water, Tasks, Photos, Pantry, Preferences
  - Weight Logs, Recipes, Stores, Points Bank
- **Photo storage** (base64/blob) - all non-medication photos saved
- **Export/Import** full database as JSON backup

### 🎨 Beautiful Dark Theme
- **Orange/red gradients** (no blues - sleep-friendly!)
- **High contrast** for daytime readability
- **Responsive design** - mobile-first
- **Progressive Web App** - install on home screen

## 🚀 Quick Start

### 1. Deploy to GitHub Pages

```bash
# Clone or download these files
git clone https://github.com/YOUR-USERNAME/ultimate-wellness.git
cd ultimate-wellness

# Deploy
git init
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/YOUR-USERNAME/ultimate-wellness.git
git push -u origin main

# Enable GitHub Pages in repo settings
```

Your app will be live at: `https://YOUR-USERNAME.github.io/ultimate-wellness/`

### 2. Initial Setup

1. **Open the app** in your browser
2. **Complete setup form**:
   - Name, birthday, gender
   - Current weight & goal weight
   - Height, activity level
3. **Start tracking!**

### 3. Daily Use

**Morning:**
- Tap "Good Morning" → Rate sleep
- Mark medications as "Morning"
- Add daily tasks

**Throughout Day:**
- Scan food barcodes → Auto-log points
- Click water drops as you drink
- Log exercise → Get points back!
- Mark medications

**Evening:**
- Tap "Good Night" before bed
- Check if you hit your points goal
- Review what went well

## 🛠️ Tech Stack

- **Frontend**: Pure HTML5 + CSS3 + Vanilla JavaScript (no frameworks!)
- **Database**: IndexedDB (browser-based, 50MB-10GB capacity)
- **APIs**: 
  - Claude Vision API (image analysis)
  - OpenFoodFacts API (barcode lookup)
- **Hosting**: GitHub Pages (free static hosting)
- **PWA**: Installable on iOS/Android

## 📁 File Structure

```
ultimate-wellness/
├── index.html          Main app (HTML structure, UI, styling)
├── database.js         IndexedDB layer (all data operations)
├── app.js             Application logic (calculations, UI updates)
├── DEPLOYMENT.md      Detailed deployment guide
└── README.md          This file
```

**Total size**: ~500KB (compact!)

## 🔐 Security & Privacy

- ✅ **100% local** - data never leaves your device
- ✅ **No tracking** - no analytics, no cookies, no telemetry
- ✅ **No login required** - you ARE the user
- ✅ **Private by default** - isolated to your browser
- ⚠️ **Device-level security** - lock your phone/computer
- ⚠️ **No cloud sync** - use export/import to move data

See [DEPLOYMENT.md](DEPLOYMENT.md) for multi-user options.

## 💡 The Weight Loss Logic

### "Why 12 weeks?"

The app uses a **12-week rolling goal window**:
- Goal weight is always 12 weeks away
- Weekly goal = (current weight - goal weight) / 12

**Example:**
- Current: 180 lbs
- Goal: 160 lbs
- Delta: 20 lbs
- Weekly goal: 20 / 12 = **1.67 lbs/week**

As you lose weight:
- Current: 170 lbs (after 6 weeks)
- Goal: still 160 lbs
- Delta: now 10 lbs
- Weekly goal: 10 / 12 = **0.83 lbs/week**

**Result**: Natural tapering curve!
- Fast weight loss early
- Slower, sustainable loss near goal
- Prevents yo-yo dieting
- Smooth transition to maintenance

### Points Adjustment

**Every 4 weeks**:
- Age increases → Points decrease
- Weight decreases → Points decrease
- Activity increases → Points increase

**Guardrails**:
- Minimum: 22 pts/day
- Maximum: 28 pts/day
- Prevents unhealthy restriction

## 📱 Mobile App (PWA)

Install as a native app:

**iPhone:**
1. Safari → Share → Add to Home Screen

**Android:**
1. Chrome → Menu → Add to Home Screen

Benefits:
- Works offline
- Full-screen mode
- App icon on home screen
- Faster loading

## 🎨 Customization

### Change Exercises

Edit `app.js`:
```javascript
const EXERCISES = ['Chores', 'Vacuum', 'Laundry', 'Elliptical', 'Walk', 'Yard Work'];

// Add your own:
const EXERCISES = ['Gym', 'Run', 'Bike', 'Swim', 'Yoga', 'Hike'];
```

### Change Water Goal

Edit `app.js`:
```javascript
// Find this line:
totalDiv.textContent = `${totalMl}ml / 2000ml (${filled}/8 cups)`;

// Change to 2500ml (10 cups):
totalDiv.textContent = `${totalMl}ml / 2500ml (${filled}/10 cups)`;
```

### Change Points Range

Edit `app.js`:
```javascript
// Find:
points = Math.max(22, Math.min(28, points));

// Change to 20-30:
points = Math.max(20, Math.min(30, points));
```

## 📊 Data You Track

### Daily Logs:
- ✅ Food intake with points
- ✅ Water consumption (drops + food)
- ✅ Exercise activities with minutes
- ✅ Sleep quality ratings
- ✅ Medication adherence
- ✅ Daily tasks (want/need/grateful)

### Long-Term Data:
- ✅ Weight history with trends
- ✅ Photo library (food, receipts, pantry)
- ✅ Food preferences (likes/dislikes)
- ✅ Pantry inventory snapshots
- ✅ Grocery receipts with costs
- ✅ Recipe history
- ✅ Store visit patterns

### Calculated Insights:
- Daily net points (food - exercise)
- Points bank balance
- Weekly weight loss goal
- Progress to goal weight
- Water intake totals
- Exercise points earned
- Medication adherence rate

## 🔄 Backup & Export

### Automatic Backup
Settings → Export All Data
- Downloads complete JSON file
- Includes all tables
- Includes all photos (base64)
- Restore anytime via Import

### What Gets Backed Up:
- ✅ All food logs (every meal you've logged)
- ✅ All exercise sessions
- ✅ All sleep entries
- ✅ All medications & adherence logs
- ✅ All water tracking
- ✅ All tasks
- ✅ All photos (food, receipts, pantry)
- ✅ All pantry items
- ✅ All preferences
- ✅ All weight logs
- ✅ All recipes
- ✅ All store visits
- ✅ Points bank history
- ✅ User settings

**File size**: Varies (typically 5-50MB depending on photos)

## 🐛 Known Limitations

- ❌ No cloud sync (export/import only)
- ❌ No multi-device auto-sync
- ❌ No real-time collaboration
- ❌ No social features
- ❌ Single user per browser (see [DEPLOYMENT.md](DEPLOYMENT.md) for multi-user)
- ⚠️ Barcode scanning requires camera permission
- ⚠️ Photos stored in browser (check storage quota if issues)

## 🗺️ Roadmap

### Planned Features:
- [ ] Recipe builder with points calculation
- [ ] Meal planning calendar
- [ ] Grocery list generator
- [ ] Progress photos timeline
- [ ] Analytics dashboard with charts
- [ ] Goal celebrations & achievements
- [ ] Social sharing (optional)
- [ ] Sync via Firebase (optional backend)

### Contributions Welcome!
- Fork the repo
- Create feature branch
- Submit pull request
- Discuss in issues

## 📄 License

MIT License - Free for personal and commercial use

## 🙏 Acknowledgments

- **Weight Watchers** - SmartPoints formula inspiration
- **Anthropic** - Claude Vision API for image analysis
- **OpenFoodFacts** - Open product database
- **You** - For using and improving this app!

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR-USERNAME/ultimate-wellness/issues)
- **Documentation**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Updates**: Watch this repo for new releases

---

**Built with ❤️ for anyone who wants to take control of their health journey.**

**Start tracking today!** → [Deploy Now](#-quick-start)

---

## ⭐ Star This Repo!

If you find this useful, give it a star! It helps others discover the project.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repo
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 Changelog

### v1.0.0 (2026-01-03)
- ✨ Initial release
- ✅ Complete points tracking system
- ✅ Dynamic points calculation with 4-week recalc
- ✅ 12-week rolling weight goal window
- ✅ Exercise, sleep, water, medication tracking
- ✅ Food water detection (40+ foods)
- ✅ IndexedDB with 15 tables
- ✅ Photo storage (all non-med photos)
- ✅ Export/import system
- ✅ Dark orange/red theme
- ✅ PWA support

---

**Happy tracking! 🎉**
