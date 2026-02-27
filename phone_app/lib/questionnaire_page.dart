import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/services.dart';

import 'gemini_service.dart';
import 'weekly_result_page.dart';
import 'result_page.dart';
import 'models/meal_plan.dart';
import 'app_drawer.dart'; // 🔥 IMPORTING YOUR NEW DRAWER!

class QuestionnairePage extends StatefulWidget {
  const QuestionnairePage({super.key});

  @override
  State<QuestionnairePage> createState() => _QuestionnairePageState();
}

class _QuestionnairePageState extends State<QuestionnairePage> {
  final Color primaryGreen = const Color(0xFF00966C);

  // --- NEW FORM STATE ---
  String planType = 'daily'; // 'daily' or 'weekly'
  String cookingPreference = 'cook_dinner_only';

  // --- EXISTING FORM STATE ---
  String ageGroup = 'Adult (18+)';
  String activityLevel = 'Moderate (3-5 days/week)';
  
  Map<String, bool> dietaryRules = {
    'Halal Only': false, 'Vegetarian': false, 
    'Vegan': false, 'No Pork': false, 'No Beef': false
  };

  Map<String, bool> allergies = {
    'Peanuts': false, 'Shellfish': false, 'Dairy': false,
    'Eggs': false, 'Soy': false, 'Gluten': false
  };
  final TextEditingController otherAllergiesController = TextEditingController();

  List<String> selectedCuisines = [];
  String mealSpeed = 'Normal 15-25 min';
  double budgetPerMeal = 15.0;
  String goal = 'Balanced Nutrition';

  @override
  void dispose() {
    otherAllergiesController.dispose();
    super.dispose();
  }

  Future<void> _handleGeneratePlan() async {
    // 🔥 GET THE LATEST SEASONAL MODE FROM THE DRAWER/FIREBASE
    String currentSeasonalMode = 'normal';
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      final doc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      if (doc.exists) {
        currentSeasonalMode = (doc.data() as Map<String, dynamic>)['seasonalMode'] ?? 'normal';
      }
    }

    final userData = {
      'planType': planType,
      'cookingPreference': planType == 'weekly' ? cookingPreference : null,
      'ageGroup': ageGroup,
      'activityLevel': activityLevel,
      'budget': budgetPerMeal,
      'goal': goal,
      'mealSpeed': mealSpeed,
      'cuisines': selectedCuisines.isEmpty ? ['Any'] : selectedCuisines,
      'rules': dietaryRules.entries.where((e) => e.value).map((e) => e.key).toList(),
      'allergies': allergies.entries.where((e) => e.value).map((e) => e.key).toList(),
      'otherAllergies': otherAllergiesController.text,
      'seasonalMode': currentSeasonalMode, // Passed exactly as your teammate wanted!
    };

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const _LoadingDialog(),
    );

    try {
      if (planType == 'daily') {
        MealPlan plan = await GeminiService.generateMealPlan(userData);

        if (mounted) {
          Navigator.pop(context); 
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ResultPage(
                plan: plan,
                userPreferences: userData,
              ),
            ),
          );
        }
      } else {
        final weeklyPlanData = await GeminiService.generateWeeklyPlan(userData);

        if (mounted) {
          Navigator.pop(context); 
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => WeeklyResultPage(planData: weeklyPlanData),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); 
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error generating plan: $e'), 
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  // Intercepts accidental swipes and asks to close the app
  void _handleAppExit() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Exit App?', style: TextStyle(fontWeight: FontWeight.bold)),
          content: const Text('Are you sure you want to close NutriBalance AI?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Stay', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: () {
                SystemNavigator.pop(); 
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryGreen,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              child: const Text('Exit'),
            ),
          ],
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, 
      onPopInvoked: (bool didPop) {
        if (didPop) return;
        _handleAppExit(); 
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        
        // 🔥 PLUGS IN YOUR NEW GLOBAL DRAWER HERE
        drawer: const AppDrawer(activePage: 'Home'),

        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: const IconThemeData(color: Colors.black), // Turns the hamburger icon black
          title: Row(
            children: [
              Icon(Icons.restaurant_menu, color: primaryGreen),
              const SizedBox(width: 8),
              RichText(
                text: TextSpan(
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                  children: [
                    const TextSpan(text: 'NutriBalance '),
                    TextSpan(text: 'AI', style: TextStyle(color: primaryGreen)),
                  ],
                ),
              ),
            ],
          ),
        ),

        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Tell Us About You', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Help us create the perfect meal plan for your needs.', style: TextStyle(color: Colors.grey, fontSize: 16)),
              const SizedBox(height: 32),

              _buildSectionTitle('Plan Type'),
              Column(
                children: [
                  _buildPlanTypeCard('daily', Icons.calendar_today, 'Daily Plan', 'Generate a single day meal plan'),
                  const SizedBox(width: 12),
                  _buildPlanTypeCard('weekly', Icons.date_range, 'Weekly Plan', '7-day hybrid plan with smart grocery list'),
                ],
              ),
              const SizedBox(height: 32),

              if (planType == 'weekly') ...[
                _buildSectionTitle('Cooking Preference'),
                const Text('Choose which meals you want to cook vs. buy from outside', style: TextStyle(color: Colors.grey, fontSize: 14)),
                const SizedBox(height: 12),
                _buildCookingRadio('Cook Dinner Only', 'Buy Breakfast & Lunch, Cook Dinner', 'cook_dinner_only'),
                _buildCookingRadio('Cook Breakfast & Dinner', 'Buy Lunch only', 'cook_breakfast_dinner'),
                _buildCookingRadio('Cook All Meals', 'Home Chef mode for every meal', 'cook_all'),
                _buildCookingRadio('Buy All Meals', 'City Survivor — eat out for everything', 'buy_all'),
                const SizedBox(height: 32),
              ],

              _buildSectionTitle('Basic Information'),
              const Text('Age Group', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              _buildOutlinedRadio('Teen (13-17)', ageGroup, (val) => setState(() => ageGroup = val!)),
              _buildOutlinedRadio('Adult (18+)', ageGroup, (val) => setState(() => ageGroup = val!)),
              
              const SizedBox(height: 16),
              const Text('Activity Level', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: activityLevel,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                ),
                items: ['Sedentary', 'Lightly Active', 'Moderate (3-5 days/week)', 'Very Active']
                    .map((label) => DropdownMenuItem(value: label, child: Text(label))).toList(),
                onChanged: (val) => setState(() => activityLevel = val!),
              ),
              const SizedBox(height: 32),

              _buildSectionTitle('Dietary Rules'),
              Wrap(
                spacing: 12, runSpacing: 12,
                children: dietaryRules.keys.map((key) => _buildOutlinedCheckbox(key, dietaryRules)).toList(),
              ),
              const SizedBox(height: 24),

              const Text('Allergies (Select all that apply)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12, runSpacing: 12,
                children: allergies.keys.map((key) => _buildOutlinedCheckbox(key, allergies)).toList(),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: otherAllergiesController,
                decoration: InputDecoration(
                  hintText: 'Other allergies (comma separated)',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
              const SizedBox(height: 32),

              _buildSectionTitle('Food Preferences'),
              const Text('Favorite Cuisines (Select your favorites)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12, runSpacing: 12,
                children: ['Malay', 'Chinese', 'Indian', 'Western'].map((cuisine) {
                  final isSelected = selectedCuisines.contains(cuisine);
                  return InkWell(
                    onTap: () {
                      setState(() {
                        isSelected ? selectedCuisines.remove(cuisine) : selectedCuisines.add(cuisine);
                      });
                    },
                    child: Container(
                      width: (MediaQuery.of(context).size.width - 60) / 2, 
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: isSelected ? primaryGreen : Colors.grey.shade300, width: isSelected ? 2 : 1),
                        borderRadius: BorderRadius.circular(8),
                        color: isSelected ? primaryGreen.withOpacity(0.05) : Colors.transparent,
                      ),
                      alignment: Alignment.center,
                      child: Text(cuisine, style: TextStyle(color: isSelected ? primaryGreen : Colors.black87, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 4),
              const Text('Leave unselected to see all cuisines', style: TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 24),

              const Text('Meal Speed Preference', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              _buildOutlinedRadio('Quick 10-15 min', mealSpeed, (val) => setState(() => mealSpeed = val!)),
              _buildOutlinedRadio('Normal 15-25 min', mealSpeed, (val) => setState(() => mealSpeed = val!)),
              _buildOutlinedRadio('Elaborate 25-35 min', mealSpeed, (val) => setState(() => mealSpeed = val!)),
              const SizedBox(height: 32),

              _buildSectionTitle('Budget & Goals'),
              Text('Budget Per Meal: RM ${budgetPerMeal.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  activeTrackColor: primaryGreen,
                  inactiveTrackColor: Colors.grey.shade200,
                  thumbColor: primaryGreen,
                  overlayColor: primaryGreen.withOpacity(0.2),
                ),
                child: Slider(
                  value: budgetPerMeal,
                  min: 10, max: 30, divisions: 20,
                  onChanged: (val) => setState(() => budgetPerMeal = val),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text('RM 10', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  Text('RM 30', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 24),

              const Text('Your Goals', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              _buildGoalRadio('Maintain Current Wellness', 'Keep your current healthy habits', goal, (val) => setState(() => goal = val!)),
              _buildGoalRadio('Boost Energy & Focus', 'Stay energized throughout the day', goal, (val) => setState(() => goal = val!)),
              _buildGoalRadio('Support Muscle & Fitness', 'Higher protein for active lifestyle', goal, (val) => setState(() => goal = val!)),
              _buildGoalRadio('Balanced Nutrition', 'Well-rounded meals for overall health', goal, (val) => setState(() => goal = val!)),
              
              const SizedBox(height: 40),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _handleGeneratePlan,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryGreen,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                  child: Text(planType == 'weekly' ? 'Generate 7-Day Plan →' : 'Generate My Meal Plan →', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  // --- FORM UI WIDGET HELPERS ---

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
    );
  }

  Widget _buildPlanTypeCard(String type, IconData icon, String title, String subtitle) {
    bool isSelected = planType == type;
    return InkWell(
      onTap: () => setState(() => planType = type),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: isSelected ? primaryGreen : Colors.grey.shade300, width: 2),
          borderRadius: BorderRadius.circular(12),
          color: isSelected ? primaryGreen.withOpacity(0.05) : Colors.white,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Icon(icon, color: isSelected ? primaryGreen : Colors.grey, size: 28),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: isSelected ? primaryGreen : Colors.black87)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCookingRadio(String title, String subtitle, String value) {
    bool isSelected = cookingPreference == value;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        border: Border.all(color: isSelected ? primaryGreen : Colors.grey.shade300, width: isSelected ? 2 : 1),
        borderRadius: BorderRadius.circular(8),
        color: isSelected ? primaryGreen.withOpacity(0.05) : Colors.white,
      ),
      child: RadioListTile<String>(
        title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        value: value,
        groupValue: cookingPreference,
        activeColor: primaryGreen,
        onChanged: (val) => setState(() => cookingPreference = val!),
      ),
    );
  }

  Widget _buildOutlinedRadio(String title, String groupValue, ValueChanged<String?> onChanged) {
    bool isSelected = groupValue == title;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        border: Border.all(color: isSelected ? primaryGreen : Colors.grey.shade300, width: isSelected ? 1.5 : 1),
        borderRadius: BorderRadius.circular(8),
        color: isSelected ? primaryGreen.withOpacity(0.02) : Colors.white,
      ),
      child: Theme(
        data: ThemeData(unselectedWidgetColor: Colors.grey.shade400),
        child: RadioListTile<String>(
          title: Text(title, style: const TextStyle(fontSize: 14)),
          value: title,
          groupValue: groupValue,
          activeColor: primaryGreen,
          contentPadding: const EdgeInsets.symmetric(horizontal: 8),
          dense: true,
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildGoalRadio(String title, String subtitle, String groupValue, ValueChanged<String?> onChanged) {
    bool isSelected = groupValue == title;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        border: Border.all(color: isSelected ? primaryGreen : Colors.grey.shade300, width: isSelected ? 1.5 : 1),
        borderRadius: BorderRadius.circular(8),
        color: isSelected ? primaryGreen.withOpacity(0.02) : Colors.white,
      ),
      child: Theme(
        data: ThemeData(unselectedWidgetColor: Colors.grey.shade400),
        child: RadioListTile<String>(
          title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black87)),
          subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          value: title,
          groupValue: groupValue,
          activeColor: primaryGreen,
          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildOutlinedCheckbox(String key, Map<String, bool> map) {
    bool isSelected = map[key]!;
    return SizedBox(
      width: (MediaQuery.of(context).size.width - 60) / 2, 
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: isSelected ? primaryGreen : Colors.grey.shade300, width: isSelected ? 1.5 : 1),
          borderRadius: BorderRadius.circular(8),
          color: isSelected ? primaryGreen.withOpacity(0.02) : Colors.white,
        ),
        child: Theme(
          data: ThemeData(unselectedWidgetColor: Colors.grey.shade400),
          child: CheckboxListTile(
            title: Text(key, style: const TextStyle(fontSize: 13)),
            value: map[key],
            activeColor: primaryGreen,
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: const EdgeInsets.only(left: 8),
            dense: true,
            visualDensity: VisualDensity.compact,
            onChanged: (val) => setState(() => map[key] = val!),
          ),
        ),
      ),
    );
  }
}

// --- LOADING DIALOG CLASS (Unchanged) ---
class _LoadingDialog extends StatefulWidget {
  const _LoadingDialog();

  @override
  State<_LoadingDialog> createState() => _LoadingDialogState();
}

class _LoadingDialogState extends State<_LoadingDialog> {
  final Color primaryGreen = const Color(0xFF00966C);
  
  final List<String> phrases = [
    "Analyzing your preferences...",
    "Applying nutrition safety rules...",
    "Balancing daily macros...",
    "Adding local Malaysian flavors...",
    "Finalizing your perfect plan..."
  ];
  
  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 1800), (timer) {
      if (mounted) {
        setState(() {
          _currentIndex = (_currentIndex + 1) % phrases.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      backgroundColor: Colors.white,
      elevation: 10,
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: primaryGreen.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.auto_awesome, color: primaryGreen, size: 40),
            ),
            const SizedBox(height: 24),
            
            const Text(
              "Creating Your Perfect Meal Plan",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF111827))
            ),
            const SizedBox(height: 8),
            Text(
              "This will only take a moment...",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600)
            ),
            const SizedBox(height: 32),
            
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: primaryGreen.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 400),
                child: Text(
                  phrases[_currentIndex],
                  key: ValueKey<int>(_currentIndex),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: primaryGreen, fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(primaryGreen),
                minHeight: 6,
              ),
            )
          ],
        ),
      ),
    );
  }
}