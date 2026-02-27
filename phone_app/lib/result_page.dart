import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'models/meal_plan.dart';
import 'gemini_service.dart';
import 'saved_plan_page.dart'; // Just ensuring this matches your file name

class ResultPage extends StatefulWidget {
  final MealPlan plan;
  final Map<String, dynamic> userPreferences;

  const ResultPage({
    super.key, 
    required this.plan, 
    required this.userPreferences,
  });

  @override
  State<ResultPage> createState() => _ResultPageState();
}

class _ResultPageState extends State<ResultPage> {
  late MealPlan currentPlan;
  
  // --- STATE FOR SAVING ---
  bool isSaving = false;
  bool isSaved = false; // 🔥 ADDED: This tracks if the plan was successfully saved
  
  final Color primaryGreen = const Color(0xFF00966C);

  @override
  void initState() {
    super.initState();
    currentPlan = widget.plan;
  }

  // --- SAVE LOGIC ---
  Future<void> _saveDailyPlan() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to save plans.'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => isSaving = true);
    try {
      // Save the daily plan to the user's personal Firestore collection
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('saved_plans') // Saves to daily plans collection
          .add({
        // Convert your MealPlan object to a map/JSON here
        ...widget.plan.toJson(), 
        'date': DateTime.now().toIso8601String(),
        'createdAt': FieldValue.serverTimestamp(),
      });

      if (mounted) {
        setState(() => isSaved = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Daily plan saved successfully!'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save plan: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  // --- SWAP LOGIC ---
  Future<void> _handleSwap(String mealType) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Swapping $mealType...'), 
        duration: const Duration(seconds: 2),
        backgroundColor: primaryGreen,
      ),
    );

    try {
      Meal mealToReplace = (mealType == 'Breakfast') 
          ? currentPlan.breakfast 
          : (mealType == 'Lunch') ? currentPlan.lunch : currentPlan.dinner;

      Meal newMeal = await GeminiService.swapMeal(mealType, mealToReplace, widget.userPreferences);

      setState(() {
        if (mealType == 'Breakfast') {
          currentPlan = MealPlan(breakfast: newMeal, lunch: currentPlan.lunch, dinner: currentPlan.dinner, totalCost: newMeal.cost + currentPlan.lunch.cost + currentPlan.dinner.cost);
        } else if (mealType == 'Lunch') {
          currentPlan = MealPlan(breakfast: currentPlan.breakfast, lunch: newMeal, dinner: currentPlan.dinner, totalCost: currentPlan.breakfast.cost + newMeal.cost + currentPlan.dinner.cost);
        } else {
          currentPlan = MealPlan(breakfast: currentPlan.breakfast, lunch: currentPlan.lunch, dinner: newMeal, totalCost: currentPlan.breakfast.cost + currentPlan.lunch.cost + newMeal.cost);
        }
        
        // If they swap a meal, reset the saved state so they can save the new version
        isSaved = false; 
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Swap failed: $e'), backgroundColor: Colors.red));
    }
  }

  String _getFormattedDate() {
    final now = DateTime.now();
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return "${now.day} ${months[now.month - 1]} ${now.year}";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('NutriBalance AI', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Your Personalized Meal Plan", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
            const SizedBox(height: 4),
            Text("A balanced daily plan tailored to your preferences", style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
            const SizedBox(height: 24),
            
            // --- TOP STAT CARDS (Horizontally Scrollable for mobile) ---
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildStatCard(
                    title: "Total Daily Cost", 
                    value: "RM ${currentPlan.totalCost.toStringAsFixed(2)}", 
                    subtitle: "Within your budget", 
                    icon: Icons.attach_money, 
                    color: primaryGreen, 
                    valueColor: Colors.black87
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    title: "Calorie Range", 
                    value: "${currentPlan.breakfast.caloriesMin + currentPlan.lunch.caloriesMin}-2250", 
                    subtitle: "Approximate daily range", 
                    icon: Icons.local_fire_department_outlined, 
                    color: Colors.orange, 
                    valueColor: Colors.black87
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    title: "Date", 
                    value: "Today", 
                    subtitle: _getFormattedDate(), 
                    icon: Icons.calendar_today_outlined, 
                    color: Colors.blue, 
                    valueColor: Colors.black87
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),

            // --- MEAL SECTIONS ---
            _buildMealSection("Breakfast", "🌅", currentPlan.breakfast),
            _buildMealSection("Lunch", "☀️", currentPlan.lunch),
            _buildMealSection("Dinner", "🌙", currentPlan.dinner),

            const SizedBox(height: 20),

            // --- 🔥 ACTION BUTTONS (NEW & SAVE) ---
            const Divider(),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.refresh),
                    label: const Text('New Plan'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: isSaved || isSaving ? null : _saveDailyPlan,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isSaved ? Colors.green.shade100 : primaryGreen,
                      foregroundColor: isSaved ? Colors.green.shade800 : Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    icon: isSaving 
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) 
                        : Icon(isSaved ? Icons.check : Icons.save),
                    label: Text(
                      isSaved ? 'Plan Saved!' : 'Save Plan', 
                      style: const TextStyle(fontWeight: FontWeight.bold)
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  // --- UI WIDGETS ---

  Widget _buildStatCard({required String title, required String value, required String subtitle, required IconData icon, required Color color, required Color valueColor}) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, 
        borderRadius: BorderRadius.circular(12), 
        border: Border.all(color: Colors.grey.shade200)
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 6),
              Text(title, style: TextStyle(color: Colors.grey.shade600, fontSize: 12, fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: valueColor)),
          const SizedBox(height: 4),
          Text(subtitle, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildMealSection(String type, String emoji, Meal meal) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 22)),
              const SizedBox(width: 8),
              Text(type, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header (Title & Price)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(meal.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF111827)))),
                      Text("\$ RM ${meal.cost.toStringAsFixed(2)}", style: TextStyle(color: primaryGreen, fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                ),
                
                // Tags (Cuisine, Cal, Time)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: primaryGreen.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                        child: Text("Malay", style: TextStyle(color: primaryGreen, fontSize: 11, fontWeight: FontWeight.w600)), // Placeholder
                      ),
                      const SizedBox(width: 12),
                      Icon(Icons.local_fire_department_outlined, size: 14, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text("${meal.caloriesMin}-${meal.caloriesMax} cal", style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      const SizedBox(width: 12),
                      Icon(Icons.access_time_outlined, size: 14, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text("15 min", style: TextStyle(fontSize: 12, color: Colors.grey.shade600)), // Placeholder
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Blue "Why this meal" Box
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFBFDBFE))),
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(fontSize: 13, height: 1.5),
                        children: [
                          const TextSpan(text: 'Why this meal: ', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E40AF))),
                          TextSpan(text: meal.description, style: const TextStyle(color: Color(0xFF1D4ED8))),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Macros Row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildMacroItem("Protein", "25g"),
                      _buildMacroItem("Carbs", "85g"),
                      _buildMacroItem("Fats", "30g"),
                      _buildMacroItem("Fiber", "4g"),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Ingredients
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Ingredients:", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: meal.ingredients.map((ing) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(6)),
                          child: Text(ing, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                        )).toList(),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                
                const Divider(height: 1),
                
                // Swap Button
                InkWell(
                  onTap: () => _handleSwap(type),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    alignment: Alignment.center,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.swap_horiz, size: 18, color: Colors.grey.shade700),
                        const SizedBox(width: 8),
                        Text("Swap Meal", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade800)),
                      ],
                    ),
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMacroItem(String label, String value) {
    return Column(
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
      ],
    );
  }
}