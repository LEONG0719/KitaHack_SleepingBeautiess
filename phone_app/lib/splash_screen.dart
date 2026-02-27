import 'package:flutter/material.dart';
import 'dart:async';
import 'homepage.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  final Color primaryGreen = const Color(0xFF00966C);

  @override
  void initState() {
    super.initState();
    // Creates a smooth 1.5-second fade-in animation
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(_controller);
    _controller.forward();

    // Waits 3 seconds, then naturally slides to your main app
    Timer(const Duration(seconds: 3), () {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const HomePage()),
      );
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Main Logo & Title in the Center
          Center(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo Circle
                  Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: primaryGreen.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    // If you have an image, replace this Icon with: Image.asset('assets/your_logo.png', width: 80)
                    child: Icon(Icons.restaurant_menu, size: 80, color: primaryGreen),
                  ),
                  const SizedBox(height: 24),
                  
                  // NutriBalance AI Text
                  RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.black87),
                      children: [
                        const TextSpan(text: 'NutriBalance '),
                        TextSpan(text: 'AI', style: TextStyle(color: primaryGreen)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Sleeping Beauties Branding
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Column(
                children: [
                  const Text(
                    'developed by',
                    style: TextStyle(fontSize: 12, color: Colors.grey, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sleeping Beauties Team',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: primaryGreen),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}