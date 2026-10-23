// ================================================================
//  FIREBASE CONFIGURATION — Thread Bangle Platform
// ================================================================
//
//  HOW TO SET UP (5 minutes):
//  1. Go to https://console.firebase.google.com
//  2. Click "Add project" → name it (e.g., "manya-bangles") → Continue
//  3. Disable Google Analytics (optional) → Create project
//  4. Click the </> (Web) icon → Register app → copy config below
//  5. In Firebase Console sidebar:
//       Authentication → Get Started → Email/Password → Enable
//       Firestore Database → Create database → Start in test mode
//       Storage → Get Started → Start in test mode
//  6. Create your admin account:
//       Authentication → Users → Add user → enter email + password
//  7. Replace all YOUR_* values below with your real config values
//
// ================================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBoSvsFhkRBk5m6V2_X6SF7zxijr4q7WUo",
  authDomain: "e-commerce-thread-bangle.firebaseapp.com",
  projectId: "e-commerce-thread-bangle",
  storageBucket: "e-commerce-thread-bangle.firebasestorage.app",
  messagingSenderId: "907999244502",
  appId: "1:907999244502:web:f709b773d40263c1685977",
  measurementId: "G-D39M7QT47W"
};
// ── Business Settings ────────────────────────────────────────────
// WhatsApp number WITH country code, no spaces/dashes/+
// India example: 919876543210  (91 = country code, then 10-digit number)
const WHATSAPP_NUMBER = "919876543210";
// Your brand name (appears in UI + WhatsApp messages)
const BUSINESS_NAME = "Manya Bangles";
// ── Firebase Initialization ──────────────────────────────────────
let db, storage, auth;
let FIREBASE_READY = false;
let DEMO_MODE = false;
(function initFirebase() {
  const isPlaceholder = FIREBASE_CONFIG.apiKey.includes("YOUR_");
  if (isPlaceholder) {
    console.warn(
      "%c⚠️  DEMO MODE ACTIVE\n" +
      "Firebase is not configured. The app is running with static demo data.\n" +
      "Open js/firebase-config.js and replace YOUR_* values to enable live database.",
      "color: #C9A84C; font-weight: bold; font-size: 13px;"
    );
    DEMO_MODE = true;
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db      = firebase.firestore();
    storage = firebase.storage();
    auth    = firebase.auth();
    FIREBASE_READY = true;
    console.log("%c✅ Firebase connected!", "color: #10B981; font-weight: bold;");
  } catch (err) {
    console.error("Firebase init failed:", err);
    DEMO_MODE = true;
  }
})();
// ── Demo / Seed Data (used when Firebase is not configured) ──────
const DEMO_INVENTORY = {
  sizes: [
    { id: "s1", title: "Size 2.2", subtitle: "Extra Small · 56mm", price: 0, inStock: true,  emoji: "🟠", gradient: "linear-gradient(135deg,#FFDEE9,#B5FFFC)" },
    { id: "s2", title: "Size 2.4", subtitle: "Small · 61mm",       price: 0, inStock: true,  emoji: "🔵", gradient: "linear-gradient(135deg,#FFC3A0,#FFAFBD)" },
    { id: "s3", title: "Size 2.6", subtitle: "Medium · 66mm",      price: 0, inStock: true,  emoji: "🟣", gradient: "linear-gradient(135deg,#C2E9FB,#A1C4FD)" },
    { id: "s4", title: "Size 2.8", subtitle: "Large · 71mm",       price: 0, inStock: true,  emoji: "🟢", gradient: "linear-gradient(135deg,#D4FC79,#96E6A1)" },
  ],
  designs: [
    { id: "d1", title: "Solid Color",  subtitle: "Classic single-thread wrap", basePrice: 149, inStock: true,  emoji: "🎨", gradient: "linear-gradient(135deg,#C4526B,#C4526B)" },
    { id: "d2", title: "Dual Tone",    subtitle: "Two contrasting threads",     basePrice: 179, inStock: true,  emoji: "✨", gradient: "linear-gradient(135deg,#C4526B 50%,#C9A84C 50%)" },
    { id: "d3", title: "Criss Cross",  subtitle: "Woven crossing pattern",      basePrice: 199, inStock: true,  emoji: "❌", gradient: "repeating-linear-gradient(45deg,#1A6B6E 0,#1A6B6E 4px,#C9A84C 4px,#C9A84C 8px)" },
    { id: "d4", title: "Floral Wrap",  subtitle: "Delicate floral motif",       basePrice: 219, inStock: true,  emoji: "🌸", gradient: "radial-gradient(circle at 30% 30%,#F9B8C5,#C4526B)" },
    { id: "d5", title: "Zigzag",       subtitle: "Bold geometric zigzag",       basePrice: 199, inStock: false, emoji: "⚡", gradient: "repeating-linear-gradient(90deg,#C4526B 0,#C4526B 6px,#FFF8F0 6px,#FFF8F0 12px)" },
  ],
  beads: [
    { id: "b1", title: "Kundan Stones",  subtitle: "Traditional Indian gems",   addonPrice: 60, inStock: true,  emoji: "💎", gradient: "radial-gradient(circle,#FFD700,#C9A84C)" },
    { id: "b2", title: "Pearl Chain",    subtitle: "Lustrous freshwater pearls", addonPrice: 40, inStock: true,  emoji: "🤍", gradient: "radial-gradient(circle,#fff,#ddd)" },
    { id: "b3", title: "Zircon Lines",   subtitle: "Sparkling crystal zircons", addonPrice: 50, inStock: true,  emoji: "🔮", gradient: "radial-gradient(circle,#B5FFFC,#89CFF0)" },
    { id: "b4", title: "Mirror Chips",   subtitle: "Shisha mirror embellishment",addonPrice: 35, inStock: true,  emoji: "🪞", gradient: "linear-gradient(135deg,#e0e0e0,#fff,#bbb,#fff)" },
    { id: "b5", title: "Golden Beads",   subtitle: "22k gold-plated mini beads",addonPrice: 70, inStock: true,  emoji: "🥇", gradient: "linear-gradient(135deg,#FFD700,#B8860B)" },
    { id: "b6", title: "Crystal Drops",  subtitle: "Swarovski-style crystals",  addonPrice: 80, inStock: false, emoji: "💠", gradient: "radial-gradient(circle,#E0BBFF,#957DAD)" },
  ]
};
const DEMO_PRICING = { basePrice: 149, currency: "₹" };