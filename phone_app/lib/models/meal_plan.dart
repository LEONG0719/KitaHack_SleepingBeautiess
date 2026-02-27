class Meal {
  final String name;
  final String description;
  final List<String> ingredients;
  final int caloriesMin;
  final int caloriesMax;
  final double cost;

  Meal({
    required this.name,
    required this.description,
    required this.ingredients,
    required this.caloriesMin,
    required this.caloriesMax,
    required this.cost,
  });

  // 🔥 NEW: Unpacks data from Gemini AI
  factory Meal.fromJson(Map<String, dynamic> json) {
    return Meal(
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      ingredients: (json['ingredients'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      caloriesMin: json['caloriesMin'] ?? 0,
      caloriesMax: json['caloriesMax'] ?? 0,
      cost: (json['cost'] ?? 0.0).toDouble(), // .toDouble() prevents int/double type errors
    );
  }

  // Packs data to save to Firebase
  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'ingredients': ingredients,
      'caloriesMin': caloriesMin,
      'caloriesMax': caloriesMax,
      'cost': cost,
    };
  }
}

class MealPlan {
  final Meal breakfast;
  final Meal lunch;
  final Meal dinner;
  final double totalCost;

  MealPlan({
    required this.breakfast,
    required this.lunch,
    required this.dinner,
    required this.totalCost,
  });

  // 🔥 NEW: Unpacks data from Gemini AI
  factory MealPlan.fromJson(Map<String, dynamic> json) {
    return MealPlan(
      breakfast: Meal.fromJson(json['breakfast'] ?? {}),
      lunch: Meal.fromJson(json['lunch'] ?? {}),
      dinner: Meal.fromJson(json['dinner'] ?? {}),
      totalCost: (json['totalCost'] ?? 0.0).toDouble(),
    );
  }

  // Packs data to save to Firebase
  Map<String, dynamic> toJson() {
    return {
      'breakfast': breakfast.toJson(),
      'lunch': lunch.toJson(),
      'dinner': dinner.toJson(),
      'totalCost': totalCost,
    };
  }
}