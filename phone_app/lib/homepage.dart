import 'package:flutter/material.dart';
import 'sign_in.dart';
import 'sign_up_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  // Defining your website's brand colors
  final Color primaryGreen = const Color(0xFF00966C); // The dark green from your button
  final Color lightGreenBg = const Color(0xFFEAFBF3); // The light mint background

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      // 1. The Top Navigation Bar
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0, // Removes the shadow for a flat, modern look
        title: Row(
          children: [
            Icon(Icons.restaurant_menu, color: primaryGreen),
            const SizedBox(width: 8),
            const Text(
              'NutriBalance AI',
              style: TextStyle(
                color: Colors.black87,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: ElevatedButton(
              onPressed: () {
               Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SignInPage()),
               );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryGreen,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Sign In'),
            ),
          ),
        ],
      ),
      
      // 2. The Scrollable Body
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeroSection(),
            _buildFeaturesSection(),
            _buildHowItWorksSection(),
          ],
        ),
      ),
    );
  }

  // --- SECTION 1: The Hero Area (Green Background) ---
  Widget _buildHeroSection() {
    return Container(
      width: double.infinity,
      color: lightGreenBg,
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 48.0),
      child: Column(
        children: [
          // Circular Icon Logo
          CircleAvatar(
            radius: 40,
            backgroundColor: primaryGreen.withOpacity(0.2),
            child: Icon(Icons.restaurant_menu, size: 40, color: primaryGreen),
          ),
          const SizedBox(height: 24),
          
          // Headline
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
                height: 1.2,
              ),
              children: [
                const TextSpan(text: 'Your Personal Meal Planner for '),
                TextSpan(
                  text: 'Malaysia',
                  style: TextStyle(color: primaryGreen),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          
          // Subheadline
          const Text(
            'Get personalized, budget-friendly meal plans tailored to your lifestyle, dietary needs, and favorite cuisines. Made for Malaysian students and young professionals.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, color: Colors.black54, height: 1.5),
          ),
          const SizedBox(height: 32),
          
          // Main Call to Action Button
          ElevatedButton.icon(
            onPressed: () {
              // Navigator.push(
              //   context,
              //   MaterialPageRoute(builder: (context) => const SignInPage()),
              // );
            },
            icon: const Icon(Icons.auto_awesome),
            label: const Text('Create Your Meal Plan'),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryGreen,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Takes less than 2 minutes',
            style: TextStyle(fontSize: 12, color: Colors.black45),
          ),
        ],
      ),
    );
  }

  // --- SECTION 2: The Feature Cards ---
  Widget _buildFeaturesSection() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFeatureCard(
            Icons.attach_money,
            'Budget-Friendly',
            'Set your meal budget (RM 10-30) and get affordable meal suggestions that fit your wallet.',
            Colors.green,
          ),
          const SizedBox(height: 16),
          _buildFeatureCard(
            Icons.favorite_border,
            'Halal & Dietary Options',
            'Choose from Halal, vegetarian, vegan options, plus no pork/beef preferences and allergy filters.',
            Colors.blue,
          ),
          const SizedBox(height: 16),
          _buildFeatureCard(
            Icons.ramen_dining,
            'Local Cuisines',
            'Enjoy authentic Malay, Chinese, Indian, and Western dishes from Malaysian food culture.',
            Colors.orange,
          ),
          const SizedBox(height: 16),
          _buildFeatureCard(
            Icons.schedule,
            'Quick & Easy',
            'Filter by meal prep time whether you want quick 10-minute meals or elaborate 30-minute dishes.',
            Colors.purple,
          ),
        ],
      ),
    );
  }

  // Helper widget to build individual feature cards
  Widget _buildFeatureCard(IconData icon, String title, String description, Color iconColor) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: iconColor.withOpacity(0.1),
            child: Icon(icon, color: iconColor),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: const TextStyle(fontSize: 14, color: Colors.black54, height: 1.4),
          ),
        ],
      ),
    );
  }

  // --- SECTION 3: How it Works ---
  Widget _buildHowItWorksSection() {
    return Container(
      width: double.infinity,
      color: lightGreenBg,
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          const Text(
            'How It Works',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Simple steps to get your personalized meal plan',
            style: TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 32),
          
          _buildStep(1, 'Share Your Preferences', 'Tell us about your dietary needs, favorite cuisines, budget, and lifestyle goals.'),
          const SizedBox(height: 24),
          _buildStep(2, 'Get Your Plan', 'Our AI generates a personalized daily meal plan with breakfast, lunch, and dinner.'),
          const SizedBox(height: 24),
          _buildStep(3, 'Customize & Save', "Swap meals you don't like, generate weekly plans, and save your favorites."),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  // Helper widget for the numbered steps
  Widget _buildStep(int number, String title, String description) {
    return Column(
      children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: primaryGreen,
          child: Text(
            number.toString(),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          title,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          description,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.black54),
        ),
      ],
    );
  }
}