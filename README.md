# NutriBalance AI 🥗🤖

**KitaHack 2026 Submission** | **Team: SleepingBeauties**

*NutriBalance AI* is a smart, budget-conscious meal planning and gamified health companion designed specifically to help university students build sustainable, healthy eating habits without breaking the bank.

## 🎯 1. Problem Statement & SDG Alignment

**The Problem:** 
University students and young professionals often struggle to maintain a balanced diet due to tight finances, busy schedules, and limited cooking experience. This results in heavy reliance on fast food, skipped meals, and ultimately long-term impacts on both physical health and academic performance.

**SDG Alignment (SDG 3: Good Health and Well-Being):** 
This project directly aligns with SDG 3. By making personalized, nutritionist-grade meal planning accessible and affordable, we are actively promoting healthier lifestyles. The app integrates AI to solve the complex constraints of a student's budget, dietary rules, and cooking capabilities, demonstrating a scalable technological intervention for public health.

---

## 💻 2. Repository Structure

This repository contains two complete versions of NutriBalance AI, ensuring an accessible experience across all devices.

### 📱 `phone_app/` (Flutter Mobile App)
A fully native cross-platform mobile application utilizing Google's Flutter framework. It offers a premium mobile experience complete with gamification features, NutriBuddy chat, and "Wok Hei" interactive health tracking.

### 🌐 `KitaHack/` (Next.js Web App)
A highly responsive, SEO-optimized web application built with Next.js and React. It provides a seamless desktop and mobile-web experience, allowing users to generate meal plans and analyze food receipts via their browser.

---

## 🧠 3. AI Integration & Google Technologies

We heavily integrated Google's ecosystem to build a scalable and intelligent application.

### Why Google AI (Gemini)?
We utilized the **Gemini 2.5 Flash API** via Google AI Studio for its blazing speed, nuanced context understanding, and ability to return perfectly structured JSON data. 
- **Benefit to Project:** Gemini acts as the core engine. It powers our dynamic **Interactive Questionnaire**, generating highly personalized daily or weekly meal plans that adhere strictly to user-defined RM (Ringgit Malaysia) budgets. It also powers **NutriBuddy**, our in-app AI companion that chats with users in natural "Manglish", and our **NutriNudges**, delivering context-aware push notifications (e.g., tailored advice during Ramadan or Festive periods).

### Technical Architecture & Google Stack
- **Frontend / Platform:** Built with **Flutter** (Mobile) and **Next.js** (Web), utilizing the multi-platform capabilities of modern web and mobile tech.
- **Backend / Database:** **Firebase Firestore** is used for real-time state management, saving user gamification stats (NutriCoins, Streaks), profile data, and "Seasonal Modes".
- **Authentication:** **Firebase Auth** handles secure user logins across both the web and mobile platforms.
- **Location Services:** **Google Maps API** powers the "Nearby Restaurants" feature, helping students find affordable eating options around campus natively embedded in the Flutter app.

---

## 🔄 4. User Feedback & Iteration

During our prototype phase, we gathered feedback from real university students. Here are three key insights and how we iterated:

1. **Feedback:** *"Generic meal plans don't work for me because my budget changes every week."*
   - **Iteration:** We built a dynamic input system where Gemini instantly recalculates meal ingredients and portions to fit *exactly* within the daily/weekly RM budget slider provided by the user.
2. **Feedback:** *"Diet apps feel like a chore to use."*
   - **Iteration:** We gamified the experience! We introduced **NutriCoins**, a "Wok Hei" experience level, Streaks, and an interactive AI "NutriBuddy" companion that visually tracks your "Vitality" HP based on your diet adherence.
3. **Feedback:** *"Push notifications are usually annoying and out of touch with local culture."*
   - **Iteration:** We developed **Pillar 4: Cultural Context & NutriNudges**. Users can select modes like "Bazaar Survival Mode" (Ramadan). Gemini uses this context to generate highly specific, empathetic push notifications (e.g., reminding them about Suhoor hydration in Manglish) rather than generic alerts.

---

## 📈 5. Success Metrics & Scalability

**Measurable Goals & Analytics:**
- **User Engagement:** Tracked via Daily Active Users (DAU) maintaining a >3 day "Streak" and interactions with the NutriBuddy AI.
- **Financial Impact:** Measuring the average "Estimated Cost RM" delta between users' generated plans vs. standard eating-out costs.

**Scalability Roadmap:**
Our architecture is inherently designed to scale:
- **Firebase** allows our database to scale effortlessly from hundred to thousands of users without backend rewrites.
- **Gemini AI** means we don't rely on a static database of recipes; the AI dynamically generates infinite combinations, allowing us to seamlessly expand to new countries, dietary restrictions, and currencies with zero active database maintenance.

---

## 🛠️ 6. Technical Implementation & Challenges

**Major Technical Challenge Resolved:**
- **Challenge:** Guaranteeing that the Gemini AI always returned perfectly parseable data for our Flutter/Next.js UI, as LLMs occasionally hallucinate markdown or conversational text alongside JSON.
- **Resolution:** We engineered strict Prompt Rules asking for pure JSON without markdown tags, and implemented robust regex cleaning (`replaceAll('```json', '')`) combined with null-safe data models. If parsing fails, the UI gracefully falls back to a default "Balanced State" object to prevent app crashes.

---

## 🚀 7. Setup & Run Instructions

### Prerequisites
- A **Gemini API Key** (from Google AI Studio)
- A **Google Maps API Key** (for Flutter Location Services)
- Node.js (`v18+` for Web)
- Flutter SDK (`^3.19.0+` for Mobile)

### ▶️ Running the Flutter App (`phone_app`)
1. Navigate to the mobile directory:
   ```bash
   cd phone_app
   ```
2. Install dependencies:
   ```bash
   flutter pub get
   ```
3. Set up your environment variables by creating a `.env` file in the root of `phone_app/`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
   ```
4. Run the app:
   ```bash
   flutter run
   ```

### ▶️ Running the Next.js Web App (`KitaHack`)
1. Navigate to the web directory:
   ```bash
   cd KitaHack
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env.local` file in the root of `KitaHack/`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
   # Add Firebase Auth properties as needed
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000`.
