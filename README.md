<div align="center">

<img src="phone_app/assets/logo.png" width="200" alt="NutriBalance AI Logo" />

# NutriBalance AI 🥗🤖

**KitaHack 2026 Submission** | **Team: SleepingBeauties**

![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![Next JS](https://img.shields.io/badge/Next-white?style=for-the-badge&logo=next.js&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Google AI Studio](https://img.shields.io/badge/Google_AI_Studio-EA4335?style=for-the-badge&logo=google&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Google Maps API](https://img.shields.io/badge/Google_Maps_API-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white)

</div>

---

## 🚀 Quick Links & Demo

For immediate testing and review, please use the links below:

- 🌐 **Live Website Demo:** [Insert Live Website Link Here]
- 📱 **Download Android APK:** [Insert APK Download Link Here]
- 🎥 **5-Minute Pitching Video:** [Insert YouTube Link Here]

---

## 💻 Local Developer Setup

For judges or developers wishing to compile the application from source, please follow these steps:

### ▶️ 1. Running the Flutter App (`phone_app`)

1. **Prerequisites**
   Ensure you have the following installed:
   - **Flutter SDK** (v3.19.0 or higher)
   - **Android Studio** or **VS Code** (with the Flutter extension installed)

2. **Clone the Repository**
   ```bash
   git clone [Insert your repository link here]
   cd KitaHack_SleepingBeautiess/phone_app
   ```

3. **Environment Variables**
   Create a new file named `.env` in the root of the `phone_app` directory and populate it with your keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
   ```

4. **Install Dependencies**
   Fetch all required Flutter packages:
   ```bash
   flutter pub get
   ```

5. **Run the App**
   Launch an emulator or connect a physical device, then run:
   ```bash
   flutter run
   ```

### ▶️ 2. Running the Next.js Web App (`KitaHack`)

1. **Prerequisites**
   Ensure you have the following installed:
   - **Node.js** (v18 or higher)

2. **Navigate to the Web Directory**
   Assuming you have already cloned the repository from the steps above:
   ```bash
   cd ../KitaHack
   ```

3. **Environment Variables**
   Create a new file named `.env.local` in the root of the `KitaHack` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key_here
   # Add additional Firebase config variables if necessary
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

## Table of Contents

### Category A: Impact
- [Problem Statement & SDG Alignment](#problem-statement--sdg-alignment)
- [User Feedback & Iteration](#user-feedback--iteration)
- [Success Metrics & Scalability](#success-metrics--scalability)
- [AI Integration](#ai-integration)
- [Technology Innovation](#technology-innovation)

### Category B: Technology
- [Technical Architecture & Google Technologies](#technical-architecture--google-technologies)
- [Technical Implementation & Challenges](#technical-implementation--challenges)
- [Completeness and Demonstration](#completeness-and-demonstration)

---

## Category A: Impact

### Problem Statement & SDG Alignment

> **Problem Statement:** Malaysian university students and young professionals often struggle to maintain a balanced diet due to tight finances, busy schedules, and limited cooking experience. This results in an unhealthy "hybrid lifestyle" — heavily relying on cheap, ultra-processed fast food or skipping meals entirely, leading to long-term impacts on both physical health and academic performance.

> **SDG Choice & Justification:** **SDG 3: Good Health and Well-Being**. By providing realistic, affordable access to nutritious food, we actively reduce the dietary barriers that lead to Non-Communicable Diseases (NCDs) caused by reliance on cheap, processed foods.

* **Solution Approach:** NutriBalance AI solves this using a "Four Pillars" approach:
  1. **Dual-Layer AI Hybrid Planning:** Dynamically generates meals that strictly fit a user's RM (Ringgit Malaysia) budget for both dorm cooking and eating out.
  2. **Multimodal Vision Verifier:** Prevents fake logging by requiring users to snap a photo of their plate for AI verification before earning rewards.
  3. **Gamification:** Rewards verified healthy eating with NutriCoins and an evolving interactive avatar (Wok Hei).
  4. **Cultural Context Engine:** Proactively adapts meal paths for local Malaysian events, like restructuring plans for Suhoor and Iftar during Ramadan.

### User Feedback & Iteration

* **Testing Insights:** 
  1. *Dynamic Budgets:* Generic meal templates fail because a student's budget fluctuates wildly week by week.
  2. *Fake Logging:* Traditional diet apps feel like a chore, and users easily "cheat" by just clicking "completed" without actually eating the meal.
  3. *Cultural Ignorance:* Standard AI planners ignore local fasting periods, making templates useless during events like Ramadan.

* **Iterations Made:** 
  1. Built the **Dual-Layer AI Engine** (Pillar 1) to instantly recalculate ingredients and portions to accurately fit the user's current RM budget slider.
  2. Built **Scan-to-Complete** (Pillar 2). Users *must* upload a plate photo, which Gemini Vision evaluates against the Malaysian "Suku-Suku Separuh" plate ratio to verify completion and award gamified coins.
  3. Deployed the **Cultural Context Engine** (Pillar 4). Users can toggle "Bazaar Survival Mode," instantly overhauling Gemini's logic to generate tailored Suhoor and Iftar recommendations safely within the app.

### Success Metrics & Scalability

* **Measurable Goals:** 
  - **Verified Completed Meals:** Tracked through the Vision Scanner (ensuring logged meals were actually consumed).
  - **User Engagement:** Daily Active Users (DAU) maintaining a >3-day app streak and interacting with the NutriBuddy chat companion.
  - **Financial Impact:** The average "RM Saved" delta between our AI-generated budget plans versus standard eating-out costs.

* **Scalability Roadmap:** 
  - **Database:** Firebase allows our state management to scale effortlessly from hundreds to thousands of users without backend bottlenecks.
  - **Global Context:** The Cultural Context Engine (Gemini prompting) can easily be extended globally to support Diwali, Thanksgiving, or strict dietary profiles (Vegan/Keto) simply by injecting new context rules, requiring zero database rewrites.
  - **Local Expansion:** Expanding the Google Maps integration to map every university campus in Southeast Asia.

### AI Integration

* **AI Utilization:** AI is the core engine spanning the entire application. It acts as a financial planner (generating RM-restricted grocery lists), a nutritionist (providing Suku-Suku scores from photos), a localized companion (chatting in Manglish via NutriBuddy), and an event scheduler (adapting for Ramadan).
* **Technology Choice:** We selected **Gemini 2.5 Flash** (via Google AI Studio) for its blazing speed, native Multimodal (vision) capabilities, and deep contextual grasp of "Manglish" (Malaysian English). Crucially, Gemini 2.5 Flash reliably returns perfectly structured JSON data, allowing seamless parsing into our UI components.

### Technology Innovation

* **Creativity:** We revolutionized the standard "diet tracker" by gamifying it. We introduced "NutriCoins" and an evolving avatar ("Wok Hei") whose health literally depends on the user logging verified meals. By taking the friction out of logging via AI image scanning, it turns diet tracking from a chore into a highly engaging game.
* **Real-World Application:** Instead of generating abstract AI recipes with ingredients students can't find, we utilize the Google Maps API alongside Gemini to suggest physical, real-world affordable food locations (like nearby 'Economy Rice' stalls) directly around their specific university campus.

---

## Category B: Technology

### Technical Architecture & Google Technologies

* **System Architecture:** 
  - **Frontend:** A cross-platform ecosystem utilizing natively compiled **Flutter** for the mobile app and **Next.js/React** for the SEO-optimized web application.
  - **Backend Layer:** Firebase acts as the central Nervous System handling User Auth, state management, and real-time gamification syncs.
  - **AI Layer:** Dedicated API routes directly communicate with the Gemini REST API to process text and multimodal vision inputs without relying on legacy recipe databases.

* **Google Tech Justification:** 
  - **Gemini 2.5 Flash API:** For unstructured data processing, vision analysis, and contextual text generation at low latency.
  - **Firebase (Auth & Firestore):** Essential for secure, rapid user onboarding and real-time NoSQL state syncing across our web and mobile counterparts.
  - **Google Maps Places API:** Crucial for translating AI meal "suggestions" into actual, navigable locations near the student.

### Technical Implementation & Challenges

* **Implementation Status:** Fully implemented. Both the Flutter Mobile app (`phone_app`) and Next.js Web app (`KitaHack`) have fully operational authentication, Gemini meal generation, gamification states, and Google Maps integrations successfully communicating.
* **Major Technical Challenge:** Guaranteeing that Gemini always returned perfectly parseable data (JSON) directly into our Flutter/Next.js UI. LLMs natively hallucinate markdown (e.g., \`\`\`json) or conversational filler that crashes mobile UI parsers.
  - **Resolution:** We engineered strict Prompt Engineering rules forbidding markdown tags and implemented robust regex cleaners (`replaceAll('```json', '')`) combined with Dart/TypeScript null-safe class models. If a parsing anomaly occurs, the code gracefully falls back to a default "Balanced State" object, ensuring the app never crashes for the user. Furthermore, analyzing complex mixed-Malaysian dishes via Vision AI required heavy prompt tuning to ensure accurate Suku-Suku scoring.

### Completeness and Demonstration

* **Prototype Status:** This is a fully functional, production-ready coded prototype utilizing a live Flutter codebase and a live Next.js codebase (Not low-code/no-code).
* **Demo Video / GitHub:** 
  - **GitHub Repository:** [Insert GitHub Link]
  - **Pitching Video:** [Insert YouTube Link]
