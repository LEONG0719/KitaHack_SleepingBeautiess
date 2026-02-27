import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'weekly_result_page.dart';
import 'result_page.dart';
import 'models/meal_plan.dart';
import 'app_drawer.dart';
import 'package:flutter/services.dart';

class SavedPlansPage extends StatefulWidget {
  const SavedPlansPage({super.key});

  @override
  State<SavedPlansPage> createState() => _SavedPlansPageState();
}

class _SavedPlansPageState extends State<SavedPlansPage> {
  final Color primaryGreen = const Color(0xFF00966C);
  final User? user = FirebaseAuth.instance.currentUser;

  bool isLoading = true;
  List<Map<String, dynamic>> savedPlans = [];

  @override
  void initState() {
    super.initState();
    _fetchSavedPlans();
  }

  // 🛠️ HELPER TO SAFELY READ DATES FROM BOTH REACT (Strings) & FLUTTER (Timestamps)
  DateTime? _parseDate(Map<String, dynamic> data) {
    var dateField = data['createdAt'] ?? data['date'];
    if (dateField == null) return null;
    if (dateField is Timestamp) return dateField.toDate();
    if (dateField is String) return DateTime.tryParse(dateField);
    return null;
  }

  Future<void> _fetchSavedPlans() async {
    if (user == null) return;
    try {
      // 🔥 1. Fetch Weekly Plans from secure user folder
      final weeklySnap = await FirebaseFirestore.instance
          .collection('users')
          .doc(user!.uid)
          .collection('weekly_plans')
          .get();

      // 🔥 2. Fetch Daily Plans from secure user folder
      final dailySnap = await FirebaseFirestore.instance
          .collection('users')
          .doc(user!.uid)
          .collection('saved_plans')
          .get();

      List<Map<String, dynamic>> allPlans = [];
      
      for (var doc in weeklySnap.docs) {
        final data = doc.data();
        data['id'] = doc.id;
        data['type'] = 'weekly';
        allPlans.add(data);
      }

      for (var doc in dailySnap.docs) {
        final data = doc.data();
        data['id'] = doc.id;
        data['type'] = 'daily';
        allPlans.add(data);
      }

      // 3. Sort them locally handling both Web and Mobile date formats
      allPlans.sort((a, b) {
        DateTime? timeA = _parseDate(a);
        DateTime? timeB = _parseDate(b);
        if (timeA == null && timeB == null) return 0;
        if (timeA == null) return 1;
        if (timeB == null) return -1;
        return timeB.compareTo(timeA);
      });

      if (mounted) {
        setState(() {
          savedPlans = allPlans;
          isLoading = false;
        });
      }
    } catch (e) {
      print("Error fetching plans: $e");
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> _deletePlan(String planId, String type) async {
    if (user == null) return;
    try {
      String collectionName = type == 'weekly' ? 'weekly_plans' : 'saved_plans';
      
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user!.uid)
          .collection(collectionName)
          .doc(planId)
          .delete();

      setState(() {
        savedPlans.removeWhere((plan) => plan['id'] == planId);
      });
      
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Plan deleted successfully.'), backgroundColor: Colors.black87));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error deleting plan: $e'), backgroundColor: Colors.red));
    }
  }
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
                SystemNavigator.pop(); // Safely closes the app entirely!
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00966C),
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
      canPop: false, // 🔒 Locks the swipe-left gesture
      onPopInvoked: (bool didPop) {
        if (didPop) return;
        _handleAppExit(); // Triggers the popup instead of going back
      },
      child: Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      drawer: const AppDrawer(activePage: 'Saved Plans'),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black), // This turns the Hamburger icon black
        title: Row(
          children: [
            Icon(Icons.restaurant_menu, color: const Color(0xFF00966C)),
            const SizedBox(width: 8),
            RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                children: [
                  const TextSpan(text: 'NutriBalance '),
                  TextSpan(text: 'AI', style: const TextStyle(color: Color(0xFF00966C))),
                ],
              ),
            ),
          ],
        ),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : savedPlans.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.all(20),
                  itemCount: savedPlans.length,
                  itemBuilder: (context, index) {
                    final plan = savedPlans[index];
                    if (plan['type'] == 'weekly') {
                      return _buildWeeklyPlanCard(plan);
                    } else {
                      return _buildDailyPlanCard(plan);
                    }
                  },
                ),
    ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle),
            child: Icon(Icons.calendar_month, size: 48, color: Colors.grey.shade400),
          ),
          const SizedBox(height: 16),
          const Text('No Saved Plans Yet', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Create and save your first meal plan to see it here', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: primaryGreen, foregroundColor: Colors.white),
            child: const Text('Create New Plan'),
          )
        ],
      ),
    );
  }

  // --- DAILY PLAN CARD ---
  Widget _buildDailyPlanCard(Map<String, dynamic> plan) {
    DateTime? dt = _parseDate(plan);
    String dateStr = dt != null ? "${dt.day}/${dt.month}/${dt.year}" : "Recently";

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200, width: 1.5)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(dateStr, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                IconButton(
                  padding: EdgeInsets.zero, constraints: const BoxConstraints(),
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                  onPressed: () => _deletePlan(plan['id'], 'daily'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text('Daily Meal Plan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            
            _buildDailyMealRow('🌅', plan['breakfast']?['name'] ?? 'Breakfast', plan['breakfast']?['caloriesMin'] ?? 0),
            _buildDailyMealRow('☀️', plan['lunch']?['name'] ?? 'Lunch', plan['lunch']?['caloriesMin'] ?? 0),
            _buildDailyMealRow('🌙', plan['dinner']?['name'] ?? 'Dinner', plan['dinner']?['caloriesMin'] ?? 0),
            
            const Divider(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildSmallStat(Icons.payments, 'Total Cost', 'RM ${plan['totalCost']?.toStringAsFixed(0) ?? 0}'),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  MealPlan parsedPlan = MealPlan.fromJson(plan);
                  Navigator.push(context, MaterialPageRoute(
                    builder: (context) => ResultPage(plan: parsedPlan, userPreferences: const {}),
                  ));
                },
                style: ElevatedButton.styleFrom(backgroundColor: primaryGreen, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                icon: const Icon(Icons.visibility, size: 18),
                label: const Text('View Plan'),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildDailyMealRow(String emoji, String name, int calories) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 12),
          Expanded(child: Text(name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  // --- WEEKLY PLAN CARD ---
  Widget _buildWeeklyPlanCard(Map<String, dynamic> plan) {
    final summary = plan['weekly_summary'] ?? {};
    final days = (plan['weekly_plan'] as List<dynamic>?) ?? [];
    
    DateTime? dt = _parseDate(plan);
    String dateStr = dt != null ? "${dt.day}/${dt.month}/${dt.year}" : "Recently";

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: primaryGreen.withOpacity(0.4), width: 2)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(dateStr, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                IconButton(
                  padding: EdgeInsets.zero, constraints: const BoxConstraints(),
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                  onPressed: () => _deletePlan(plan['id'], 'weekly'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.date_range, color: primaryGreen, size: 20),
                const SizedBox(width: 8),
                const Text('7-Day Meal Plan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 16),

            ...days.take(3).map((day) {
              final meals = (day['meals'] as List<dynamic>?) ?? [];
              final dishNames = meals.map((m) => m['dish_name']).join(' · ');
              return Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Row(
                  children: [
                    SizedBox(width: 40, child: Text(day['day'].toString().substring(0, 3), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey))),
                    Expanded(child: Text(dishNames, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
                  ],
                ),
              );
            }).toList(),
            if (days.length > 3)
              Text('+ ${days.length - 3} more days...', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            
            const Divider(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildSmallStat(Icons.payments, 'Total', 'RM ${summary['total_estimated_cost_rm']?.toStringAsFixed(0) ?? 0}'),
                _buildSmallStat(Icons.restaurant, 'Cooked', '${summary['total_meals_cooked'] ?? 0} meals'),
                _buildSmallStat(Icons.shopping_bag, 'Bought', '${summary['total_meals_bought'] ?? 0} meals'),
              ],
            ),
            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (context) => WeeklyResultPage(planData: plan)));
                },
                style: ElevatedButton.styleFrom(backgroundColor: primaryGreen, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                icon: const Icon(Icons.visibility, size: 18),
                label: const Text('View Plan'),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildSmallStat(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.grey),
        const SizedBox(width: 4),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
            Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        )
      ],
    );
  }
}