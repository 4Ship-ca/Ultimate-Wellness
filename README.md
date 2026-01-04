# 🔥 Ultimate Wellness System

> **A comprehensive, AI-powered wellness tracking system with voice control, camera scanning, and intelligent meal logging.**

![Version](https://img.shields.io/badge/version-1.8-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![PWA](https://img.shields.io/badge/PWA-Ready-green)
![Cost](https://img.shields.io/badge/cost-%240--2%2Fmonth-success)

**Live Demo:** [https://4ship-ca.github.io/Ultimate-Wellness/](https://4ship-ca.github.io/Ultimate-Wellness/)

---

## 🎯 What is This?

Ultimate Wellness is a **free, privacy-focused wellness tracker** that combines:
- 📊 **Complete Health Tracking** (food, exercise, water, sleep, medications, weight)
- 🤖 **AI Wellness Coach** powered by Claude (Anthropic's AI)
- 📸 **Camera Scanning** (barcodes, receipts, pantry inventory, medications)
- 🎤 **Voice Control** (hands-free logging, voice commands)
- 💤 **Smart Features** (nap timer, weekly wins, deferred tasks)
- 💰 **Budget Tracking** (cost per point, spending analysis)
- 📧 **Automated Reports** (weekly email summaries)

**All data stored locally in your browser. No server. No subscription. Completely free.**

---

## ✨ Key Features

### 🍽️ Smart Food Tracking
- **AI Meal Logging** - Say "I had 2 eggs and toast" → Auto-calculates points
- **Quantity Precision** - Understands "1 cup rice", "4 oz chicken", "handful of nuts"
- **Camera Scanning** - Scan barcodes for instant nutrition lookup
- **Receipt Analysis** - Photo your restaurant receipt → Extracts all items
- **Points System** - SmartPoints-compatible tracking
- **Manual Entry** - Quick food logger with favorites

### 💪 Exercise & Activity
- **Quick Log** - Preset activities: Walk, Run, Bike, Swim, Yoga, Weights, Sports, Dance
- **Time Presets** - 15/30/45/60 minute quick buttons
- **Auto-Calculate Points** - 1 point earned per 15 minutes
- **Points Banking** - Unused exercise points roll over for 7 days

### 💧 Water Tracking
- **Visual Progress** - Interactive water drop display (0-8 cups)
- **Daily Goal** - 2000ml / 64oz target
- **One-Click Logging** - Tap drops to fill

### 😴 Sleep Management
- **Bedtime/Wake Tracking** - Log sleep schedule
- **Quality Rating** - 4 levels: Zonked, Good, Restless, Poor
- **💤 Nap Timer** (NEW in v1.8)
  - Quick presets: 15, 30, 45, 60, 90 minutes
  - Custom durations (5-180 min)
  - 3 gentle alarm melodies (Chimes, Birds, Bells)
  - Quality logging: Refreshed, Okay, Groggy, Didn't Sleep
  - Nap history tracking
  - Integrated with daily sleep log

### 🎯 Task Management
- **Three Categories** - Want to Do, Need to Do, Grateful For
- **✅ Complete Tasks** - Mark as done for satisfaction
- **⏸️ Deferred Tasks** (NEW in v1.8)
  - Defer tasks when overwhelmed
  - Review and reactivate later
  - Shows days since deferral
  - One-click deletion
- **🏆 Weekly Wins** (NEW in v1.8)
  - See all completed tasks from last 7 days
  - Breakdown by type
  - Motivational progress display
  - Celebrate your accomplishments!

### 💊 Medication Tracking
- **Camera Scanning** - Photo medication labels → Auto-extract info
- **Time-based Logging** - Morning, Afternoon, Evening
- **Visual Status** - See what's taken, what's pending
- **Daily Reset** - Fresh tracking each day

### ⚖️ Weight Management
- **12-Week Rolling Goals** - Science-based sustainable weight loss
- **Weekly Targets** - Automatic calculation (0.5-2 lbs/week)
- **Progress Tracking** - Visual charts and trends
- **Weigh-in Reminders** - Stay on schedule

### 🤖 AI Wellness Coach
- **Natural Conversation** - Chat with Claude AI
- **Context Aware** - Knows your stats, preferences, current day
- **Recipe Generation** - Get recipes with points, both metric & imperial
- **Meal Planning** - Personalized suggestions based on your points
- **Exercise Guidance** - Workout suggestions with duration & points
- **Motivation** - Encouragement and tips
- **Voice Interaction** - Text-to-speech responses
- **Date Awareness** - AI knows weekday vs weekend for better suggestions

### 📸 Universal Scanner
- **Barcode Scanning** - Food package barcodes → Nutrition info
- **Grocery Receipts** - Extract items and costs
- **Restaurant Receipts** - Parse meals and spending
- **Pantry/Fridge Inventory** - Snapshot or 15s video scan
- **Medication Labels** - Capture dosage and instructions
- **Portrait Mode** - 9:16 camera view (mobile-optimized)
- **Photo Upload** - Choose from gallery
- **Live Camera** - Real-time capture
- **Video Scanning** - 15-second clips for pantry walkthroughs

### 🎤 Voice Control
- **Speech-to-Text** - Hands-free input
- **Voice Commands** - "Take a snapshot", "Take a video", "Go live"
- **AI Voice Responses** - Text-to-speech output
- **Dirty Hands Mode** - Perfect for cooking!

### 💰 Budget Tracking
- **Cost Per Point** - Track spending efficiency
- **Receipt Integration** - Auto-extract costs from photos
- **Store Comparisons** - See which stores are cheapest
- **Weekly Reports** - Email spending summaries

### 📧 Email Integration
- **Weekly Reports** - Automated progress emails
- **EmailJS Powered** - Secure, no backend needed
- **Customizable** - Set your schedule and preferences

### 🔧 Advanced Features
- **PWA Ready** - Install to home screen like a native app
- **Offline Capable** - Works without internet (except AI features)
- **IndexedDB Storage** - Fast, local, encrypted
- **Dark Theme** - Easy on the eyes
- **Responsive Design** - Perfect on phone, tablet, desktop
- **API Test Tool** - Built-in connection diagnostics
- **Data Export** - JSON backup of all your data
- **Import/Restore** - Full data portability

---

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Claude API key (get free $5 credit at [console.anthropic.com](https://console.anthropic.com))
- Cloudflare account (free tier)

### Quick Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/4Ship-ca/Ultimate-Wellness.git
cd Ultimate-Wellness
```

#### 2. Set Up Cloudflare Worker (API Proxy)

**Why?** Keeps your Claude API key secure and private.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it `ultimate-wellness`
4. Click **Deploy**, then **Edit Code**
5. Replace all code with the contents of `cloudflare-worker.js`
6. Click **Save and Deploy**
7. Go to **Settings** → **Variables and Secrets**
8. Add variable:
   - Name: `CLAUDE_API_KEY`
   - Value: Your Claude API key (starts with `sk-ant-api03-`)
   - ✅ Check "Encrypt"
9. Click **Save**
10. Copy your worker URL (e.g., `https://ultimate-wellness.your-username.workers.dev`)

#### 3. Configure the App

Edit `app.js` (line ~4):
```javascript
const USE_PROXY = true;
const PROXY_URL = 'https://ultimate-wellness.YOUR-USERNAME.workers.dev'; // Your worker URL
const CLAUDE_API_KEY = ''; // Leave empty when using proxy
```

#### 4. Deploy to GitHub Pages

1. Push to GitHub:
```bash
git add .
git commit -m "Initial setup"
git push origin main
```

2. Enable GitHub Pages:
   - Go to your repo **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** → **/ (root)**
   - Click **Save**

3. Wait 2-3 minutes, then visit:
   - `https://YOUR-USERNAME.github.io/Ultimate-Wellness/`

#### 5. Test the Connection

1. Open your app
2. Go to **Settings** tab
3. Scroll down to **API Connection Test**
4. Click **🧪 Test API Connection**
5. Should see: **✅ API Connection Successful!**

✅ **You're done! Start tracking!**

---

## 💻 Tech Stack

### Frontend
- **Pure HTML/CSS/JavaScript** - No frameworks, blazing fast
- **IndexedDB** - Client-side database (16 tables)
- **Web APIs** - Camera, Microphone, Vibration, Speech Recognition
- **PWA** - Service workers, installable

### AI & Backend
- **Claude API** (Anthropic) - AI chatbot, meal parsing, recipe generation
- **Cloudflare Workers** - API proxy (serverless, free tier)
- **EmailJS** - Email reports (free tier)
- **Web Audio API** - Alarm sound generation

### Storage (16 IndexedDB Tables)
- `settings` - User preferences
- `foods` - Meal logs
- `exercise` - Activity logs
- `sleep` - Sleep tracking
- `naps` - Nap logs ⭐ NEW
- `water` - Hydration
- `tasks` - Daily tasks (with deferred status) ⭐ UPDATED
- `medications` - Medication info
- `med_logs` - Medication tracking
- `weight_logs` - Weight history
- `photos` - Camera captures
- `pantry` - Inventory
- `recipes` - AI-generated recipes
- `stores` - Shopping tracking
- `points_bank` - Exercise points
- `preferences` - Food preferences

---

## 💰 Cost Breakdown

**Total Monthly Cost: $0 - $2**

| Service | Usage | Cost |
|---------|-------|------|
| GitHub Pages | Hosting | **FREE** |
| Cloudflare Workers | 100k requests/day | **FREE** |
| Claude API | ~1000 messages/month | $0.40 - $2.00 |
| EmailJS | 200 emails/month | **FREE** |
| IndexedDB | Local storage | **FREE** |

**Free Credits:**
- Claude API: **$5 free credit** = 10-20 months FREE
- EmailJS: **200 emails/month forever**

**Estimated AI Usage:**
- 20 meals/week = ~80 API calls/month = **$0.40**
- 10 recipes/week = ~40 API calls/month = **$0.20**
- Chat + misc = ~30 API calls/month = **$0.15**
- **Total: ~$0.75/month**

With $5 free credit → **6-7 months completely free!**

---

## 📱 Mobile Use

### Install as PWA
1. Open app in mobile browser
2. Tap **Share** (iOS) or **Menu** (Android)
3. Select **"Add to Home Screen"**
4. App icon appears on home screen!

### Voice Commands (Hands-Free!)
- "Take a snapshot" → Opens camera (photo)
- "Take a video" → Opens camera (15s video)
- "Go live" → Live pantry scan
- "I had 2 eggs and toast" → Logs meal
- "Log meal" → Opens meal logger

### Camera Features
- Portrait mode (9:16) - Perfect for mobile
- Tap to capture
- Upload from gallery
- Video clips (15s max)
- Auto-analysis

---

## 🎯 How to Use

### Daily Workflow

**Morning:**
1. ✅ Log "Good Morning" sleep
2. 💊 Mark medications taken
3. ⚖️ Weekly weigh-in (if scheduled)

**Throughout Day:**
1. 🍽️ Log meals (voice: "I had X")
2. 💧 Tap water drops as you drink
3. 💪 Log exercise (tap preset or custom)
4. 📸 Scan barcodes before eating
5. 🎯 Complete tasks (mark done or defer)

**Evening:**
1. 😴 Log "Good Night" sleep
2. 🏆 Check "Weekly Wins" for motivation
3. 💤 Set nap timer if needed
4. 📧 Review weekly email report

### Power User Tips

**Voice Control:**
- Hold 🎤 button, speak naturally
- Works offline for commands
- AI responses use text-to-speech

**Batch Logging:**
- Photo entire meal → AI parses all items
- Scan grocery receipt → Logs everything
- Video pantry → Inventories all visible items

**Points Banking:**
- Exercise points roll over 7 days
- Use banked points on weekends
- Max 49 points in bank

**Defer Tasks:**
- Overwhelmed? Defer non-urgent tasks
- Review deferred list weekly
- Reactivate when ready

**Nap Optimization:**
- 15-20 min = Power nap (no grogginess)
- 90 min = Full sleep cycle (deep rest)
- Avoid 30-45 min (sleep inertia zone)
- Track quality to find your sweet spot

---

## 🔒 Privacy & Security

### Your Data is YOURS
- **100% Local** - All data stored in your browser
- **No Cloud** - Nothing sent to our servers (we don't have any!)
- **No Tracking** - No analytics, no cookies, no telemetry
- **No Account** - No signup, no login, no email required

### API Security
- **Cloudflare Worker** - API key never exposed to browser
- **Encrypted Vars** - API key encrypted in Cloudflare
- **CORS Protected** - Only your domain can access worker
- **No Logs** - We don't log API requests

### Data Export
- Export all data as JSON anytime
- Import to restore or migrate
- Full data portability

---

## 🆕 Version History

### v1.8 (Current) - Productivity & Rest
- 🏆 Weekly wins summary
- ⏸️ Deferred tasks system
- 💤 Nap timer with gentle alarms
- 😊 Nap quality tracking
- 📊 Task completion stats

### v1.7.1 - API & UX Fixes
- 🔒 CORS fix for Cloudflare Worker
- 🎤 Voice camera commands
- 🧪 API connection test tool
- 📅 Date awareness for AI

### v1.7 - Camera Improvements
- 📱 Portrait mode camera (9:16)
- 📸 Snapshot vs video modes
- 🎥 15-second video recording
- 🔘 Visible capture controls
- 🎨 Better chat UI layout

### v1.6 - AI Meal Logging
- 🤖 Natural language meal parsing
- ⚖️ Quantity precision
- 🔢 Per-serving calculations
- 📏 Common serving sizes database

### v1.5 - Camera Scanning
- 📸 Universal scanner modal
- 📊 Barcode scanning
- 🧾 Receipt parsing
- 🏪 Pantry inventory

### v1.4 - Email Integration
- 📧 EmailJS integration
- 📊 Weekly reports
- 💰 Spending summaries

### v1.3 - Voice Interaction
- 🎤 Speech-to-text input
- 🔊 Text-to-speech output
- 🗣️ Voice commands

### v1.2 - AI Features
- 🤖 Claude AI chatbot
- 🍳 Recipe generation
- 💬 Natural conversation

### v1.1 - Email & Spending
- 📧 Email reports
- 💰 Cost tracking
- 🏪 Store comparisons

### v1.0 - Initial Release
- 🍽️ Food tracking
- 💪 Exercise logging
- 💧 Water tracking
- 😴 Sleep logging
- ⚖️ Weight management
- 💊 Medication tracking
- 🎯 Task lists

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup
```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/Ultimate-Wellness.git

# Serve locally (Python)
python -m http.server 5500

# Or (Node.js)
npx http-server -p 5500

# Visit http://localhost:5500
```

---

## 📚 File Structure
```
Ultimate-Wellness/
├── index.html              # Main UI (1600+ lines)
├── app.js                  # Application logic (3800+ lines)
├── database.js             # IndexedDB wrapper (500+ lines)
├── cloudflare-worker.js    # API proxy
└── README.md               # This file
```

---

## ❓ FAQ

**Q: Is this really free?**
A: Yes! GitHub Pages, Cloudflare Workers, and EmailJS are all free tier. Claude API gives you $5 free credit (6+ months free), then ~$1-2/month.

**Q: Where is my data stored?**
A: 100% locally in your browser using IndexedDB. Nothing goes to any server (except API calls to Claude for AI features).

**Q: Can I use this offline?**
A: All tracking features work offline. AI features (chat, meal parsing, recipes) require internet.

**Q: How do I backup my data?**
A: Settings → Export All Data → Downloads JSON file. Import it anytime to restore.

**Q: Can I use on multiple devices?**
A: Yes, but data doesn't sync automatically. Export from one device, import to another.

**Q: Is my API key safe?**
A: Yes! It's stored encrypted in Cloudflare Workers and never exposed to your browser.

**Q: Does this work on iPhone/Android?**
A: Yes! Install as PWA for best experience. Works on all modern mobile browsers.

**Q: What happens if I clear my browser?**
A: All data is lost. Always export regularly as backup!

**Q: Can I customize the points system?**
A: Yes, edit the daily points calculation in Settings. Currently follows SmartPoints formula.

---

## 🐛 Known Issues & Limitations

### Current Limitations
- **Browser Storage** - Data lost if browser cache cleared (export regularly!)
- **Single Device** - No cloud sync (by design for privacy)
- **API Costs** - After free credit, ~$1-2/month
- **Internet Required** - For AI features only

### Browser Compatibility
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️ IE 11 (not supported)

---

## 📄 License

MIT License

**TL;DR:** Use freely, modify freely, share freely. Just include the original license.

---

## 🙏 Acknowledgments

### Built On
- **Anthropic Claude** - Amazing AI that powers the coaching
- **Cloudflare** - Free serverless infrastructure
- **EmailJS** - Free email service
- **GitHub** - Free hosting via Pages

### Inspired By
- Weight Watchers/WW SmartPoints system
- MyFitnessPal tracking features
- Headspace wellness approach

---

## 🌟 Star This Repo!

If you find this useful, give it a ⭐️ on GitHub!

It helps others discover this free wellness solution.

---

## 🚀 What's Next?

### Planned Features
- 📊 Charts & graphs
- 🎨 Custom themes
- 🌍 Multi-language support
- 👥 Family/group tracking
- 🔄 Cloud sync (optional)
- 📱 Native mobile apps
- ⌚ Smartwatch integration

### Want to Help?
- Report bugs
- Suggest features
- Submit pull requests
- Spread the word!

---

<div align="center">

**Made with ❤️ and lots of ☕**

**No subscription. No ads. No tracking. Just wellness.**

[⬆ Back to Top](#-ultimate-wellness-system)

</div>
