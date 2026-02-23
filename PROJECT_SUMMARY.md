# NutriBalance AI — Complete Feature Summary

> **KitaHack 2026 Preliminary Round | SDG 3: Good Health & Well-Being**
>
> An AI-powered personalized meal planning platform designed for Malaysian students and young professionals. Built entirely on Google's technology stack.

---

## 🏗️ Architecture Overview

### Dual-Layer AI Architecture
| Layer | Role | Technology |
|-------|------|------------|
| **Layer 1 — Rule Engine** | Calculates BMR/TDEE, enforces budget caps (RM 10), and applies dietary rules (halal, allergies, macro targets) | Programmatic (TypeScript) |
| **Layer 2 — Generative AI** | Generates culturally localized Malaysian meal plans, analyzes food images, and creates personalized nudges | Google Gemini 2.5 Flash |

### Technology Stack
| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 13 (App Router), React 18, TypeScript, Tailwind CSS |
| **AI/ML** | Google Gemini 2.5 Flash (Text + Multimodal Vision) via `@google/generative-ai` |
| **Backend Services** | Firebase Authentication (Google Sign-In, Email/Password) |
| **Database** | Firebase Firestore (real-time, user-scoped) |
| **Maps & Location** | Google Maps JavaScript API, Google Maps Places API |
| **UI Components** | Radix UI Primitives, Lucide React Icons, shadcn/ui |
| **Deployment** | Netlify (`@netlify/plugin-nextjs`) |

---

## 📱 The Four Pillars

---

### Pillar 1: Personalized Intelligence (The Planning Hub)

**SDG 3 Impact:** Directly addresses Target 3.4 — affordable access to nutritious food, reducing diet-related NCDs.

#### 1.1 Smart Meal Planning (`/plan` → `/result`)
- **Multi-step onboarding form** with stepper UI collecting:
  - Age group (teen/adult) & activity level
  - Dietary preferences: Halal, Vegetarian, Vegan, No Pork, No Beef
  - Common allergies (Peanuts, Shellfish, Dairy, Eggs, Soy, Gluten) + custom allergies
  - Favorite cuisines: Malay, Chinese, Indian, Western
  - Meal prep speed: Quick / Normal / Elaborate
  - Budget per meal (RM slider)
  - Health goals: Maintain weight / Energy boost / Muscle gain / Balanced
- **AI generates a complete daily meal plan** (Breakfast, Lunch, Dinner) with:
  - Specific Malaysian dish names (e.g., "Nasi Goreng Kampung", "Kam Heong Fried Rice")
  - Per-meal macros: Calories (range), Protein, Carbs, Fats, Fiber
  - Estimated cost in RM and prep time in minutes
  - Cuisine tag and a "Why This Meal" explanation
  - Full ingredient list
- **Meal Swap with AI Variety Engine** — Users can swap any individual meal; the AI uses **randomized prompting strategies** to avoid repetitive suggestions:
  1. "Hidden gem" or uncommon dishes
  2. Classic favorites but different from staples
  3. Different texture or cooking style
  4. Regional Malaysian specialties (Penang, Ipoh, Johor, Sarawak, Sabah)
- **Shopping List Generator** — Aggregates all ingredients across meals into a consolidated list
- **Save to Firestore** — Plans are persisted under the user's UID

#### 1.2 Saved Plans Management (`/saved`)
- View all previously saved meal plans (sorted newest first)
- Each card shows: date, all 3 meal names, total cost, calorie range
- Click to reload a plan into the result view
- Delete individual plans

#### Files Involved
| File | Purpose |
|------|---------|
| `lib/gemini.ts` | Dual-layer AI: `buildConstraints()` (L1) + `buildPrompt()` / `buildSwapPrompt()` (L2) |
| `lib/types.ts` | `UserPreferences`, `Meal`, `MealPlan`, `SavedPlan` |
| `lib/firestore.ts` | CRUD: `saveMealPlanToFirestore`, `getSavedPlansFromFirestore`, `deleteMealPlanFromFirestore` |
| `app/plan/page.tsx` | Multi-step preference form |
| `app/loading/page.tsx` | Animated loading screen during AI generation |
| `app/result/page.tsx` | Plan display, swap, save, shopping list |
| `app/saved/page.tsx` | Saved plans gallery |
| `app/api/generate-plan/route.ts` | POST → calls `generateMealPlanWithAI()` |
| `app/api/swap-meal/route.ts` | POST → calls `swapMealWithAI()` |

---

### Pillar 2: Multimodal Assessment (The Vision Scanner)

**Technical Innovation:** AI for vision-based nutrition analysis, not just text generation.

#### 2.1 "Suku-Suku Separuh" Vision Scanner (`/scanner`)
- **Upload or take a photo** of any meal (supports camera capture on mobile)
- **Gemini 2.5 Flash (Multimodal)** analyzes the image against the Malaysian Ministry of Health's "Suku-Suku Separuh" (Quarter-Quarter-Half) healthy plate guidelines:
  - **Ideal ratio:** 25% Carbs · 25% Protein · 50% Fiber/Vegetables
- **AI performs:**
  1. **Food Identification** — Detects specific Malaysian dishes (Nasi Lemak, Roti Canai, Ulam, etc.)
  2. **Volume Segmentation** — Estimates plate percentage for Carbs, Protein, Fiber, Other
  3. **Rule Comparison** — Compares against the 25:25:50 ideal
  4. **Scoring** — Assigns a `suku_score` (1–10) based on deviation
  5. **Feedback** — Culturally relevant tip (e.g., "Add more Ulam next time!")
- **Edge case handling:**
  - Non-food images → Error message
  - Mixed dishes (e.g., Fried Rice) → Estimates internal ratios
  - Fast food → Flagged as "treat meal"
- **Visual results display:**
  - Score card with color-coded progress bar
  - Breakdown bars (Carbs/Protein/Fiber vs. ideal percentages)
  - Feedback card with actionable tip
- **Gamification integration:** Awards NutriCoins based on score (10 for ≥8, 5 for ≥5, 1 for any scan)
- **Rate limiting:** Max 3 rewarded scans per day to prevent farming

#### Files Involved
| File | Purpose |
|------|---------|
| `app/scanner/page.tsx` | Camera/file upload, result display, coin integration |
| `app/api/analyze-meal/route.ts` | POST → Gemini multimodal analysis with structured JSON prompt |

---

### Pillar 3: Behavioral Gamification (The Engagement Hub)

**Success Metrics:** Drives daily active use and habit formation through rewards and competition.

#### 3.1 NutriCoin Economy
- **Virtual currency** earned through healthy actions:
  - **+5 coins** — Logging a meal under budget
  - **+10 coins** — Vision Scanner score ≥ 8
  - **+5 coins** — Vision Scanner score ≥ 5
  - **+1 coin** — Any scan
  - **+15 coins** — Using "Pantry Hero" (leftover cooking)
  - **+3 coins** — Saving a plan
- **Server-side Firestore transactions** prevent client-side manipulation

#### 3.2 Competitive Tier System
Inspired by competitive gaming demographics:

| Tier | Min Coins |
|------|-----------|
| 🔘 Iron | 0 |
| 🟤 Bronze | 100 |
| ⚪ Silver | 300 |
| 🟡 Gold | 600 |
| 🔵 Platinum | 1,000 |
| 🟣 Diamond | 1,500 |
| 🔴 Ascendant | 2,500 |
| 🩷 Immortal | 3,500 |
| 🌟 Radiant | 5,000 |

- Tier badge displayed on profile and leaderboard entries
- Visual tier progress bar

#### 3.3 Interactive Health Avatar
- **3 dynamic states** based on a 3-day rolling health average:
  - ⚡ **Optimal** — Vibrant (streak ≥ 3 days + average Suku score ≥ 7)
  - 💙 **Neutral** — Standard (default)
  - 😑 **Sluggish** — Tired (score < 4 or no streak)

#### 3.4 Campus Leaderboard (`/leaderboard`)
- **Profile card** showing: avatar, tier badge, NutriCoins, streak, weekly average Suku score, weekly money saved
- **Campus selector** with Malaysian universities (APU, UM, Taylor's, UKM, UPM, Sunway, Monash, HELP, UCSI, etc.)
- **Two leaderboard modes:**
  - 🏆 **Health Champions** — Ranked by weekly average Suku-Suku score
  - 💰 **Top Savers** — Ranked by weekly RM saved
- Top 3 get gold/silver/bronze medal icons
- Filter by "All Campuses" or specific campus

#### Firestore User Schema
```json
{
  "users/{uid}": {
    "display_name": "string",
    "email": "string",
    "campus": "string",
    "current_tier": "Iron | Bronze | ... | Radiant",
    "gamification_stats": {
      "nutricoin_balance": 0,
      "current_health_streak_days": 0,
      "avatar_state": "optimal | neutral | sluggish",
      "weekly_money_saved_rm": 0,
      "weekly_suku_avg_score": 0,
      "weekly_suku_scan_count": 0,
      "total_scans": 0,
      "daily_scan_count": 0,
      "last_scan_date": ""
    },
    "last_updated": "timestamp"
  }
}
```

#### Files Involved
| File | Purpose |
|------|---------|
| `lib/gamification.ts` | Full engine: tier calculation, NutriCoin transactions, avatar state, rate limiting, leaderboard queries |
| `app/leaderboard/page.tsx` | Profile card, campus leaderboard, metric toggle |

---

### Pillar 4: Cultural & Proactive UX (The Contextual Hub)

**Scalability & Ethics:** Respects local traditions and proactively supports users during high-risk eating periods.

#### 4.1 "Bazaar Survival" Mode (Contextual State Management)
- **Global context toggle** in the Navbar with 3 modes:
  - ☀️ **Normal** — Standard meal planning
  - 🌙 **Ramadan** — Injects strict fasting rules into AI prompts:
    - Only 2 meals: Suhoor (pre-dawn) + Iftar (sunset)
    - Suhoor: slow-release energy (oats, whole grains), hydration, high protein
    - Iftar: dates first, prioritize hydration, avoid excessive sugar/fried food
    - Affordable Bazaar Ramadan options (kuih, bubur lambuk)
    - Calorie split: 40% Suhoor, 60% Iftar
    - Hydration reminders in meal explanations
  - 🎉 **Festive** — Balanced indulgence for Hari Raya, CNY, Deepavali, Christmas:
    - One indulgence meal (rendang, lemang) with lighter balancing meals
    - Portion control tips
    - Budget relaxed by +RM 2
- **Persisted in localStorage** across sessions

#### 4.2 NutriNudges Engine (Proactive AI Alerts)
- **API endpoint** (`/api/send-nudge`) generates personalized push notification content via Gemini 2.5 Flash
- **Context-aware:** Uses user's NutriCoin balance, Suku score, time of day, and nearby area
- **Culturally relevant**: References Malaysian food (Tandoori Chicken vs Fried Chicken, Nasi Campur, etc.)
- **Budget-conscious**: Mentions RM savings when applicable
- **Fallback**: If AI fails, serves a static motivational nudge
- **Rate limiting**: Maximum 2 nudges per day

#### Files Involved
| File | Purpose |
|------|---------|
| `lib/CulturalContext.tsx` | React context for seasonal mode + AI prompt rules |
| `app/api/send-nudge/route.ts` | POST → Gemini generates notification payloads |
| `components/Navbar.tsx` | Bazaar Mode toggle (Normal / Ramadan / Festive) |

---

## 🔒 Authentication & Security

| Feature | Implementation |
|---------|---------------|
| **Sign-In Methods** | Google Sign-In + Email/Password (Firebase Auth) |
| **Protected Routes** | `ProtectedRoute` component wraps all authenticated pages |
| **User-Scoped Data** | All Firestore data keyed by `user.uid` |
| **Server-Side AI** | Gemini API key is server-only (no `NEXT_PUBLIC_` prefix) |
| **Rate Limiting** | Daily scan limits + NutriCoin transaction guards |

#### Files Involved
| File | Purpose |
|------|---------|
| `lib/AuthContext.tsx` | Auth provider with Google/Email sign-in, logout, auth state listener |
| `lib/firebase.ts` | Firebase app initialization |
| `components/ProtectedRoute.tsx` | Redirect to `/login` if not authenticated |
| `app/login/page.tsx` | Login/Register with toggle, Google OAuth, error handling |

---

## 🗺️ Nearby Restaurants (`/nearby`)

- **Google Maps JavaScript API** with singleton loader pattern
- **Browser geolocation** (fallback to Kuala Lumpur if denied)
- **Places API text search** within 3 km radius
- **Quick search chips**: Nasi Lemak, Roti Canai, Char Kuey Teow, Mamak, Nasi Kandar, Chinese Restaurant, Vegetarian
- **Interactive map** with numbered markers and info windows (name, rating, address, open/closed, price level)
- **Scrollable sidebar** listing all found restaurants with click-to-focus
- **External links** to view on Google Maps

#### Files Involved
| File | Purpose |
|------|---------|
| `lib/googleMaps.ts` | Singleton Google Maps script loader |
| `app/nearby/page.tsx` | Map, search, markers, restaurant list |

---

## 📁 Complete File Structure

```
project/
├── app/
│   ├── api/
│   │   ├── analyze-meal/route.ts    ← Pillar 2: Vision Scanner API
│   │   ├── generate-plan/route.ts   ← Pillar 1: Meal Plan API
│   │   ├── send-nudge/route.ts      ← Pillar 4: NutriNudge API
│   │   └── swap-meal/route.ts       ← Pillar 1: Meal Swap API
│   ├── leaderboard/page.tsx         ← Pillar 3: Gamification
│   ├── loading/page.tsx             ← AI generation loading screen
│   ├── login/page.tsx               ← Authentication
│   ├── nearby/page.tsx              ← Nearby Restaurants (Maps)
│   ├── plan/page.tsx                ← Pillar 1: Preference Form
│   ├── result/page.tsx              ← Pillar 1: Plan Display
│   ├── saved/page.tsx               ← Pillar 1: Saved Plans
│   ├── scanner/page.tsx             ← Pillar 2: Vision Scanner
│   ├── layout.tsx                   ← Root layout (Auth + Cultural providers)
│   ├── page.tsx                     ← Landing page
│   └── globals.css                  ← Global styles
├── components/
│   ├── MealCard.tsx                 ← Meal display card
│   ├── Navbar.tsx                   ← Global nav + Bazaar toggle
│   ├── ProtectedRoute.tsx           ← Auth guard
│   ├── Stepper.tsx                  ← Multi-step form indicator
│   ├── Toast.tsx                    ← Notification toast
│   └── ui/                          ← shadcn/ui primitives (47 files)
├── lib/
│   ├── AuthContext.tsx              ← Firebase Auth provider
│   ├── CulturalContext.tsx          ← Pillar 4: Bazaar Mode context
│   ├── firebase.ts                  ← Firebase initialization
│   ├── firestore.ts                 ← Firestore CRUD operations
│   ├── gamification.ts              ← Pillar 3: Full gamification engine
│   ├── gemini.ts                    ← Pillar 1: Dual-layer AI system
│   ├── googleMaps.ts                ← Maps singleton loader
│   ├── types.ts                     ← TypeScript interfaces
│   └── utils.ts                     ← Utility functions
└── .env                             ← API keys (Firebase, Gemini, Maps)
```

---

## 🌍 SDG 3 Alignment Summary

| Target | How NutriBalance Addresses It |
|--------|-------------------------------|
| **3.4** — Reduce NCDs | Affordable access to balanced, nutritious meals for budget-constrained students |
| **3.d** — Health education | "Suku-Suku Separuh" scanner teaches proper portion ratios visually |
| **3.4** — Prevention | NutriNudges proactively guide healthier food choices in real-time |
| **3.4** — Cultural health | Bazaar Mode ensures healthy eating is maintained during cultural festivals |

---

## 🔑 Google Technologies Used

1. **Google Gemini 2.5 Flash** — Text generation (meal plans, swaps) + Multimodal vision (plate analysis) + Nudge content
2. **Firebase Authentication** — Google Sign-In + Email/Password
3. **Firebase Firestore** — Real-time NoSQL database for user profiles, meal plans, gamification stats
4. **Google Maps JavaScript API** — Interactive map display
5. **Google Maps Places API** — Restaurant search and details

---

*Last Updated: February 23, 2026*
