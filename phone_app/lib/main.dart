import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'firebase_options.dart';
import 'splash_screen.dart';
void main() async {
  // 1. Ensure Flutter bindings are ready
  WidgetsFlutterBinding.ensureInitialized();
  
  // 2. Safely load the .env file
  try {
    await dotenv.load(fileName: ".env");
    print("Environment variables loaded successfully!");
  } catch (e) {
    print("WARNING: Could not load .env file. Error: $e");
  }
  
  // 3. Safely initialize Firebase
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print("Firebase initialized successfully!");
  } catch (e) {
    print("WARNING: Firebase initialization failed. Error: $e");
  }

  // 4. Run the app
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NutriBalance AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF00966C)),
        useMaterial3: true,
      ),
      home: const SplashScreen(), 
    );
  }
}