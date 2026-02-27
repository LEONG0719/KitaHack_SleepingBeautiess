import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class WeeklyResultPage extends StatefulWidget {
  final Map<String, dynamic> planData;

  const WeeklyResultPage({super.key, required this.planData});

  @override
  State<WeeklyResultPage> createState() => _WeeklyResultPageState();
}

class _WeeklyResultPageState extends State<WeeklyResultPage> {
  final Color primaryGreen = const Color(0xFF00966C);
  int selectedDayIndex = 0;
  bool showGroceryList = false;
  
  // --- STATE FOR SAVING ---
  bool isSaving = false;
  bool isSaved = false;
  
  final List<String> days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  final List<String> daysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // --- 🔥 NEW: FIREBASE SAVE FUNCTION ---
  Future<void> _saveWeeklyPlan() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to save plans.'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => isSaving = true);
    try {
      // Save the 7-day plan to the user's personal Firestore collection
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('weekly_plans')
          .add({
        ...widget.planData,
        'createdAt': FieldValue.serverTimestamp(),
      });

      if (mounted) {
        setState(() => isSaved = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Weekly plan saved successfully!'), backgroundColor: Colors.green),
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

  @override
  Widget build(BuildContext context) {
    final summary = widget.planData['weekly_summary'];
    final weeklyPlan = widget.planData['weekly_plan'] as List<dynamic>;
    final groceryList = widget.planData['smart_grocery_list'] as List<dynamic>;

    // Ensure we don't go out of bounds if AI returns fewer days
    final currentDayMeals = weeklyPlan.length > selectedDayIndex ? weeklyPlan[selectedDayIndex]['meals'] as List<dynamic> : [];

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Your 7-Day Plan', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- 1. WEEKLY SUMMARY ---
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade200)),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildSummaryStat(Icons.account_balance_wallet, 'Total Cost', 'RM ${summary['total_estimated_cost_rm'].toStringAsFixed(0)}', Colors.blue),
                      _buildSummaryStat(Icons.restaurant, 'Cooked', '${summary['total_meals_cooked']}', Colors.orange),
                      _buildSummaryStat(Icons.shopping_bag, 'Bought', '${summary['total_meals_bought']}', Colors.purple),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // --- 2. DAY TABS ---
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(days.length, (index) {
                  bool isSelected = selectedDayIndex == index;
                  return GestureDetector(
                    onTap: () => setState(() => selectedDayIndex = index),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected ? primaryGreen : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isSelected ? primaryGreen : Colors.grey.shade300),
                      ),
                      child: Text(
                        MediaQuery.of(context).size.width > 400 ? days[index] : daysShort[index],
                        style: TextStyle(fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.grey.shade700),
                      ),
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 24),

            // --- 3. MEALS FOR SELECTED DAY ---
            Text(days[selectedDayIndex], style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...currentDayMeals.map((meal) => _buildWeeklyMealCard(meal)).toList(),
            const SizedBox(height: 24),

            // --- 4. SMART GROCERY LIST TOGGLE ---
            InkWell(
              onTap: () => setState(() => showGroceryList = !showGroceryList),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                child: Row(
                  children: [
                    Icon(Icons.shopping_cart, color: primaryGreen),
                    const SizedBox(width: 12),
                    const Expanded(child: Text('Smart Grocery List', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                    Icon(showGroceryList ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: Colors.grey),
                  ],
                ),
              ),
            ),
            
            // --- 5. GROCERY LIST EXPANDED ---
            if (showGroceryList)
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: groceryList.map((category) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(category['category'], style: TextStyle(fontWeight: FontWeight.bold, color: primaryGreen, fontSize: 16)),
                          const Divider(),
                          ...(category['items'] as List<dynamic>).map((item) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(child: Text('• ${item['name']}')),
                                  Text(item['amount'], style: const TextStyle(color: Colors.grey)),
                                  const SizedBox(width: 12),
                                  Text('RM ${item['estimated_cost_rm']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                            );
                          }).toList(),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
              
            const SizedBox(height: 32),

            // --- 🔥 6. NEW ACTION BUTTONS (Save & New Plan) ---
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
                    onPressed: isSaved || isSaving ? null : _saveWeeklyPlan,
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

  Widget _buildSummaryStat(IconData icon, String label, String value, Color color) {
    return Column(
      children: [
        Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle), child: Icon(icon, color: color)),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ],
    );
  }

  Widget _buildWeeklyMealCard(Map<String, dynamic> meal) {
    bool isCook = meal['source'] == 'cook';
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(meal['meal_type'].toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: primaryGreen, letterSpacing: 1.0)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: isCook ? Colors.orange.shade50 : Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
                child: Text(isCook ? '🍳 COOK' : '🛍️ BUY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isCook ? Colors.orange.shade800 : Colors.blue.shade800)),
              )
            ],
          ),
          const SizedBox(height: 8),
          Text(meal['dish_name'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildMicroStat(Icons.local_fire_department, '${meal['calories']} kcal'),
              const SizedBox(width: 16),
              _buildMicroStat(Icons.schedule, '${meal['prep_time_minutes']} min'),
              const SizedBox(width: 16),
              _buildMicroStat(Icons.payments, 'RM ${meal['estimated_cost_rm']}'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMicroStat(IconData icon, String label) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.grey.shade500),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontWeight: FontWeight.w500)),
      ],
    );
  }
}