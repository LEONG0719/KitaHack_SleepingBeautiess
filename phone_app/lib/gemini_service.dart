import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'models/meal_plan.dart';
import 'dart:typed_data';

class GeminiService {
  // --- Pillar 4: Seasonal Rules for Cultural Context ---
  static String _getSeasonalRules(String mode) {
    switch (mode) {
      case 'ramadan':
        return '''
RAMADAN MODE ACTIVE — STRICT RULES:
- This user is fasting during Ramadan.
- You MUST still return the standard 3-key JSON structure (breakfast, lunch, dinner), but adapt the content:
  * "breakfast" = Suhoor (pre-dawn meal). Prioritize slow-release energy (oats, whole grains), hydration (watermelon, coconut water), and high protein.
  * "lunch" = Fasting period. Set name to "Fasting Period 🤲", set all numeric values (caloriesMin, caloriesMax, cost) to 0, set description to "During Ramadan, Muslims fast from dawn to sunset. Stay hydrated during non-fasting hours.", and ingredients to an empty array [].
  * "dinner" = Iftar (breaking fast at sunset). Prioritize dates (kurma), hydration first, then balanced nutrients. Avoid excessive sugar and fried food.
- Suggest affordable Bazaar Ramadan options where applicable (kuih, bubur lambuk, etc.).
- Calorie distribution: ~40% Suhoor, ~60% Iftar.
- Include hydration reminders in "description" fields.
''';
      case 'festive':
        return '''
FESTIVE SEASON MODE ACTIVE:
- The user is navigating a festive period (Hari Raya, Chinese New Year, Deepavali, or Christmas).
- Acknowledge festive foods but suggest balanced portions.
- Include ONE indulgence meal (e.g., rendang, lemang, kuih) and balance the other meals with lighter options.
- Add tips in "description" about portion control during festivities.
- Budget can be slightly relaxed (+RM 2) for festive dishes.
''';
      default:
        return '';
    }
  }
  static Future<MealPlan> generateMealPlan(Map<String, dynamic> userPreferences) async {
    // 1. SAFELY INITIALIZE THE KEY HERE
    final apiKey = dotenv.env['GEMINI_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      throw Exception('GEMINI_API_KEY is missing from the .env file. Please check your file.');
    }

    // 2. INITIALIZE THE MODEL
    final model = GenerativeModel(
      model: 'gemini-2.5-flash',
      apiKey: apiKey,
    );

    // 3. CREATE THE PROMPT
    final prompt = '''
      You are an expert nutritionist. Create a 1-day meal plan based on these preferences:
      Budget: RM ${userPreferences['budget']} total for the day.
      Cuisines: ${userPreferences['cuisines']}
      Rules: ${userPreferences['rules']}
      Allergies: ${userPreferences['allergies']}
      
      Respond ONLY in this exact JSON format, with no markdown tags or extra text:
      {
        "totalCost": 25.0,
        "breakfast": {
          "name": "Nasi Lemak",
          "description": "A classic Malaysian breakfast...",
          "cost": 5.0,
          "caloriesMin": 400,
          "caloriesMax": 500,
          "ingredients": ["Rice", "Coconut Milk", "Anchovies"]
        },
        "lunch": {
          "name": "Chicken Rice",
          "description": "Hainanese style...",
          "cost": 10.0,
          "caloriesMin": 500,
          "caloriesMax": 650,
          "ingredients": ["Chicken", "Rice", "Cucumber"]
        },
        "dinner": {
          "name": "Mamak Mee Goreng",
          "description": "Spicy fried noodles...",
          "cost": 10.0,
          "caloriesMin": 600,
          "caloriesMax": 800,
          "ingredients": ["Noodles", "Egg", "Vegetables"]
        }
      }
    ''';

    // 4. APPEND SEASONAL RULES (Pillar 4: Cultural Context)
    final seasonalMode = userPreferences['seasonalMode'] ?? 'normal';
    final seasonalRules = _getSeasonalRules(seasonalMode);
    final fullPrompt = seasonalRules.isEmpty ? prompt : '$prompt\n\n$seasonalRules';

    // 5. GENERATE AND PARSE
    final response = await model.generateContent([Content.text(fullPrompt)]);
    final String responseText = response.text ?? "{}";
    
    // Clean up any weird formatting the AI might add
    final cleanJson = responseText.replaceAll('```json', '').replaceAll('```', '').trim();
    
    final Map<String, dynamic> jsonMap = json.decode(cleanJson);
    
    // Convert the JSON into your MealPlan model
    return MealPlan.fromJson(jsonMap);
  }

  // You can also paste your swapMeal function below this...
  static Future<Meal> swapMeal(String mealType, Meal currentMeal, Map<String, dynamic> userPreferences) async {
    // 1. Safely initialize the key
    final apiKey = dotenv.env['GEMINI_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      throw Exception('GEMINI_API_KEY is missing from the .env file.');
    }

    final model = GenerativeModel(
      model: 'gemini-2.5-flash',
      apiKey: apiKey,
    );

    // 2. Create a prompt specifically for swapping ONE meal
    final prompt = '''
      You are an expert nutritionist. The user wants to swap their $mealType.
      Their current $mealType is: ${currentMeal.name}.
      Please provide a completely DIFFERENT meal for $mealType that still fits their preferences.

      User Preferences:
      Budget: RM ${userPreferences['budget']} per meal
      Cuisines: ${userPreferences['cuisines']}
      Rules: ${userPreferences['rules']}
      Allergies: ${userPreferences['allergies']}
      
      Respond ONLY in this exact JSON format, with no markdown tags or extra text:
      {
        "name": "New Meal Name",
        "description": "A great alternative because...",
        "cost": 8.0,
        "caloriesMin": 400,
        "caloriesMax": 600,
        "ingredients": ["Ingredient 1", "Ingredient 2", "Ingredient 3"]
      }
    ''';

    // 3. Generate and parse the response
    final response = await model.generateContent([Content.text(prompt)]);
    final String responseText = response.text ?? "{}";
    
    // Clean up any weird formatting
    final cleanJson = responseText.replaceAll('```json', '').replaceAll('```', '').trim();
    final Map<String, dynamic> jsonMap = json.decode(cleanJson);
    
    // Return a single Meal object
    return Meal.fromJson(jsonMap);
  }
  static Future<String> chatWithBuddy({
    required String message,
    required List<Content> history, 
    required Map<String, dynamic> buddyContext,
  }) async {
    final apiKey = dotenv.env['GEMINI_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      throw Exception('GEMINI_API_KEY is missing');
    }

    // 1. Extract context variables (From React buddyContext)
    final name = buddyContext['name'] ?? 'NutriBuddy';
    final mood = buddyContext['mood'] ?? 'happy';
    final vitality = buddyContext['vitality'] ?? 80;

    // 2. Define the System Instruction (The Manglish Persona)
    final systemPrompt = '''
      You are $name, a cute kawaii cat NutriBuddy for Malaysian students. 
      Speak in English + Manglish (lah, leh, jom, aiyo). Keep replies 1-2 sentences max.
      Current State: Mood is $mood, Vitality is $vitality/100.
      You are food-obsessed. Mention Malaysian dishes like Nasi Lemak or Teh Tarik.
      Be playful and always end with a cat emoji! 🐱
    ''';

    // 3. Initialize Model
    final model = GenerativeModel(
      model: 'gemini-2.5-flash', 
      apiKey: apiKey,
      systemInstruction: Content.system(systemPrompt),
      generationConfig: GenerationConfig(
        maxOutputTokens: 200,
        temperature: 0.8,
      ),
    );

    // 4. SANITIZE HISTORY (Fixing the SDK crash)
    // Ensure history strictly alternates User -> Model -> User
    final List<Content> validHistory = [];
    for (var msg in history) {
      if (msg.parts.whereType<TextPart>().any((p) => p.text.isNotEmpty)) {
        validHistory.add(msg);
      }
    }

    try {
      final chat = model.startChat(history: validHistory);
      final response = await chat.sendMessage(Content.text(message));
      return response.text ?? "Meow? Say something first lah! 🐱";
    } catch (e) {
      print('Buddy Chat Error: $e');
      return "Aiyo, my brain buffering leh... try again later! 😿";
    }
  }

  // --- 📸 SUKU-SUKU SEPARUH SCANNER LOGIC ---
  static Future<Map<String, dynamic>> analyzeMealImage(Uint8List imageBytes) async {
    final apiKey = dotenv.env['GEMINI_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      throw Exception('GEMINI_API_KEY is missing');
    }

    // We use gemini-1.5-flash or gemini-2.0-flash as they both support Vision
    final model = GenerativeModel(
      model: 'gemini-2.5-flash', 
      apiKey: apiKey,
    );

    final prompt = '''
      You are an expert Malaysian nutritionist. Analyze this meal image against the 
      Malaysian Healthy Plate "Suku-Suku Separuh" guidelines (25% Carbs, 25% Protein, 50% Fiber/Veggies).
      
      Score it from 1 to 10 based on how closely it matches the ideal ratio.
      Calculate the estimated percentage of carbs, protein, fiber, and others on the plate.
      
      Respond ONLY with valid JSON in this exact structure, nothing else:
      {
          "detected_dish_name": "Name of the dish",
          "breakdown": {
              "carbs_percentage": 25,
              "protein_percentage": 25,
              "fiber_percentage": 50,
              "other_percentage": 0
          },
          "suku_score": 10,
          "feedback": {
              "title": "Short encouraging title",
              "message": "Detailed feedback on what to add or reduce...",
              "tone": "encouraging"
          },
          "nutricoin_reward": 10
      }
    ''';

    try {
      final response = await model.generateContent([
        Content.multi([
          TextPart(prompt),
          DataPart('image/jpeg', imageBytes), // Attach the image!
        ])
      ]);

      final String responseText = response.text ?? "{}";
      final cleanJson = responseText.replaceAll('```json', '').replaceAll('```', '').trim();
      return json.decode(cleanJson);
      
    } catch (e) {
      print('Scanner Error: $e');
      throw Exception('Failed to analyze image. Please try again.');
    }
  }
  // --- 📅 WEEKLY PLAN GENERATOR ---
  static Future<Map<String, dynamic>> generateWeeklyPlan(Map<String, dynamic> prefs) async {
    final apiKey = dotenv.env['GEMINI_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) throw Exception('GEMINI_API_KEY is missing');

    final model = GenerativeModel(
      model: 'gemini-2.5-flash', 
      apiKey: apiKey,
      generationConfig: GenerationConfig(
        responseMimeType: 'application/json', // Forces perfect JSON
        temperature: 0.7,
      ),
    );

    final prompt = '''
      You are an expert Malaysian nutritionist. Create a 7-day hybrid meal plan (Monday to Sunday) based on these preferences:
      Age: ${prefs['ageGroup']}, Activity: ${prefs['activityLevel']}, Goal: ${prefs['goal']}
      Budget per meal: RM ${prefs['budget']}
      Cooking Preference: ${prefs['cookingPreference']} (Follow this strictly to set source as 'cook' or 'buy')
      Dietary Rules: ${prefs['rules'].join(', ')}
      Allergies: ${prefs['allergies'].join(', ')}
      Favorite Cuisines: ${prefs['cuisines'].join(', ')}
      
      Respond ONLY with valid JSON exactly matching this structure:
      {
        "weekly_summary": {
          "total_estimated_cost_rm": 150.0,
          "total_meals_cooked": 10,
          "total_meals_bought": 11,
          "primary_goal_focus": "Balanced Nutrition"
        },
        "weekly_plan": [
          {
            "day": "Monday",
            "meals": [
              {
                "meal_type": "Breakfast",
                "dish_name": "Nasi Lemak",
                "source": "buy",
                "estimated_cost_rm": 5.0,
                "prep_time_minutes": 5,
                "calories": 400,
                "protein_g": 12,
                "carbs_g": 45,
                "fat_g": 15,
                "ingredients": ["Rice", "Coconut Milk", "Sambal", "Egg"]
              }
            ]
          }
        ],
        "smart_grocery_list": [
          {
            "category": "Produce",
            "items": [
              {"name": "Spinach", "amount": "2 bunches", "estimated_cost_rm": 4.0}
            ]
          }
        ]
      }
    ''';

    try {
      final response = await model.generateContent([Content.text(prompt)]);
      final String responseText = response.text ?? "{}";
      return json.decode(responseText);
    } catch (e) {
      print('Weekly Gen Error: $e');
      throw Exception('Failed to generate weekly plan. Please try again.');
    }
  }

  // --- Pillar 4: NutriNudge Generator (uses Gemini directly, no backend needed) ---
  static Future<String> generateNutriNudge({
    required String displayName,
    required int nutriCoins,
    required String timeOfDay,
    required String seasonalMode,
  }) async {
    final apiKey = dotenv.env['GEMINI_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      throw Exception('GEMINI_API_KEY is missing from the .env file. Please check your file.');
    }
    final model = GenerativeModel(
      model: 'gemini-2.5-flash',
      apiKey: apiKey,
    );

    String seasonalContext = '';
    if (seasonalMode == 'ramadan') {
      seasonalContext = 'The user is currently observing Ramadan (fasting from dawn to sunset). Tailor hydration and meal timing advice accordingly.';
    } else if (seasonalMode == 'festive') {
      seasonalContext = 'The user is in a festive season (Hari Raya/CNY/Deepavali). Acknowledge celebrations but gently remind about balanced eating.';
    }

    final prompt = '''
You are NutriNudge, a friendly Malaysian health companion. Generate a short, personalized proactive health nudge for this user.

Context:
- User name: $displayName
- Time of day: $timeOfDay
- NutriCoin balance: $nutriCoins
- Seasonal mode: $seasonalMode
${seasonalContext.isNotEmpty ? '- Seasonal note: $seasonalContext' : ''}

Rules:
- Keep it under 3 sentences.
- Use casual Malaysian English (Manglish) tone — friendly, supportive, a bit fun.
- Include a relevant food/health tip based on the time of day.
- If it's lunchtime suggest affordable Malaysian options. If it's evening suggest lighter meals.
- Add one emoji at the end.
- Do NOT use JSON. Just respond with plain text.
''';

    try {
      final response = await model.generateContent([Content.text(prompt)]);
      return response.text ?? 'Hey $displayName! Remember to drink water and eat your veggies today! 🥬';
    } catch (e) {
      return 'Hey $displayName! Time for a healthy snack. Your body will thank you! 💪';
    }
  }
}