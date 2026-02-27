import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'gemini_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'app_drawer.dart';
import 'package:flutter/services.dart';
class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});

  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  final Color primaryGreen = const Color(0xFF00966C);
  
  File? _selectedImage;
  bool _isAnalyzing = false;
  Map<String, dynamic>? _result;
  String? _errorMessage;

  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(source: source, maxWidth: 1024, imageQuality: 80);
      if (pickedFile != null) {
        setState(() {
          _selectedImage = File(pickedFile.path);
          _result = null;
          _errorMessage = null;
        });
      }
    } catch (e) {
      setState(() => _errorMessage = "Error picking image: $e");
    }
  }

  Future<void> _analyzeImage() async {
    if (_selectedImage == null) return;

    setState(() {
      _isAnalyzing = true;
      _errorMessage = null;
    });

    try {
      Uint8List imageBytes = await _selectedImage!.readAsBytes();
      final result = await GeminiService.analyzeMealImage(imageBytes);
      
      // 🔥 NEW: Automatically save the earned NutriCoins to Firebase!
      if (result.containsKey('nutricoin_reward')) {
        int reward = result['nutricoin_reward'] ?? 0;
        if (reward > 0) {
          await _awardNutriCoins(reward);
        }
      }

      if (mounted) {
        setState(() => _result = result);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = e.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isAnalyzing = false);
      }
    }
  }

  // 🔥 NEW: Function to safely add coins to the user's database
  Future<void> _awardNutriCoins(int rewardAmount) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      // FieldValue.increment automatically adds the number to their current balance!
      await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
        'gamification_stats': {
          'nutricoin_balance': FieldValue.increment(rewardAmount),
        }
      }, SetOptions(merge: true)); // Merge ensures we don't delete other data
      
      print('Successfully added $rewardAmount NutriCoins to database!');
    } catch (e) {
      print('Failed to update NutriCoins: $e');
    }
  }

  void _resetScanner() {
    setState(() {
      _selectedImage = null;
      _result = null;
      _errorMessage = null;
    });
  }

  Color _getScoreColor(int score) {
    if (score >= 8) return const Color(0xFF059669); // Emerald 600
    if (score >= 5) return const Color(0xFFF59E0B); // Amber 500
    return const Color(0xFFEF4444); // Red 500
  }

  String _getScoreLabel(int score) {
    if (score >= 9) return 'Excellent!';
    if (score >= 7) return 'Great Job!';
    if (score >= 5) return 'Not Bad';
    if (score >= 3) return 'Needs Work';
    return 'Try Harder!';
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
      drawer: const AppDrawer(activePage: 'Scanner'),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
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
    
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            // --- HEADER ---
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(20)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.track_changes, color: primaryGreen, size: 16),
                  const SizedBox(width: 8),
                  Text('Suku-Suku Separuh Scanner', style: TextStyle(color: primaryGreen, fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text('Scan Your Meal', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
            const SizedBox(height: 8),
            const Text(
              'Take a photo of your plate and our AI will analyze it against the Malaysian Healthy Plate guidelines (¼ Carbs, ¼ Protein, ½ Fiber)',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 32),

            // --- UPLOAD SECTION ---
            Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.grey.shade200)),
              child: Column(
                children: [
                  if (_selectedImage != null)
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Image.file(_selectedImage!, height: 250, width: double.infinity, fit: BoxFit.cover),
                          if (_isAnalyzing)
                            Container(
                              height: 250,
                              color: primaryGreen.withOpacity(0.3),
                              child: const Center(child: CircularProgressIndicator(color: Colors.white)),
                            ),
                          Positioned(
                            top: 12, right: 12,
                            child: InkWell(
                              onTap: _resetScanner,
                              child: const CircleAvatar(backgroundColor: Colors.white, radius: 16, child: Icon(Icons.refresh, size: 18, color: Colors.black87)),
                            ),
                          )
                        ],
                      ),
                    )
                  else
                    InkWell(
                      onTap: () => _pickImage(ImageSource.gallery),
                      child: Container(
                        height: 250,
                        width: double.infinity,
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircleAvatar(radius: 32, backgroundColor: const Color(0xFFD1FAE5), child: Icon(Icons.camera_alt, size: 32, color: primaryGreen)),
                            const SizedBox(height: 16),
                            const Text('Upload a photo of your meal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const Text('Tap to browse gallery', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      ),
                    ),

                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: _selectedImage == null
                        ? Row(
                            children: [
                              Expanded(child: OutlinedButton.icon(onPressed: () => _pickImage(ImageSource.camera), icon: const Icon(Icons.camera), label: const Text('Camera'))),
                              const SizedBox(width: 12),
                              Expanded(child: ElevatedButton.icon(onPressed: () => _pickImage(ImageSource.gallery), style: ElevatedButton.styleFrom(backgroundColor: primaryGreen, foregroundColor: Colors.white), icon: const Icon(Icons.upload), label: const Text('Gallery'))),
                            ],
                          )
                        : SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: ElevatedButton.icon(
                              onPressed: _isAnalyzing ? null : _analyzeImage,
                              style: ElevatedButton.styleFrom(backgroundColor: primaryGreen, foregroundColor: Colors.white),
                              icon: _isAnalyzing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.analytics),
                              label: Text(_isAnalyzing ? 'Analyzing...' : 'Analyze Plate', style: const TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                  )
                ],
              ),
            ),

            const SizedBox(height: 16),

            // --- IDEAL RATIO CARD ---
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('✅ Ideal "Suku-Suku Separuh" Ratio', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildRatioBox('25%', 'Carbs', Colors.amber)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildRatioBox('25%', 'Protein', Colors.red)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildRatioBox('50%', 'Fiber', Colors.green)),
                    ],
                  )
                ],
              ),
            ),
            
            const SizedBox(height: 24),

            // --- ERROR MESSAGE ---
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red.shade200)),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red),
                    const SizedBox(width: 12),
                    Expanded(child: Text(_errorMessage!, style: const TextStyle(color: Colors.red))),
                  ],
                ),
              ),

            // --- RESULTS SECTION ---
            if (_result != null && !_isAnalyzing) ...[
              // Score Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.grey.shade200)),
                child: Column(
                  children: [
                    Row(
                      children: [
                        // Circular Gauge
                        Container(
                          width: 80, height: 80,
                          decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: _getScoreColor(_result!['suku_score']), width: 4)),
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('${_result!['suku_score']}', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: _getScoreColor(_result!['suku_score']), height: 1.0)),
                                const Text('SCORE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('AI HEALTH ASSESSMENT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.0)),
                              Text(_getScoreLabel(_result!['suku_score']), style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: _getScoreColor(_result!['suku_score']))),
                              Text('"${_result!['feedback']['message']}"', style: const TextStyle(fontSize: 13, color: Colors.grey, fontStyle: FontStyle.italic)),
                            ],
                          ),
                        )
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          const Icon(Icons.monetization_on, color: Colors.amber),
                          const SizedBox(width: 8),
                          Text('+${_result!['nutricoin_reward']} NutriCoins earned!', style: TextStyle(color: Colors.amber.shade800, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    )
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Breakdown Bars
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.grey.shade200)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Plate Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 16),
                    _buildProgressBar('Carbs', _result!['breakdown']['carbs_percentage'], 25, Colors.amber),
                    const SizedBox(height: 12),
                    _buildProgressBar('Protein', _result!['breakdown']['protein_percentage'], 25, Colors.red),
                    const SizedBox(height: 12),
                    _buildProgressBar('Fiber/Veg', _result!['breakdown']['fiber_percentage'], 50, Colors.green),
                  ],
                ),
              ),
            ]
          ],
        ),
      ),
    ),
    );
  }

  // --- WIDGET HELPERS ---
  
  Widget _buildRatioBox(String percentage, String label, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(color: color.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: color.shade200)),
      child: Column(
        children: [
          Text(percentage, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color.shade700)),
          Text(label, style: TextStyle(fontSize: 12, color: color.shade700)),
        ],
      ),
    );
  }

  Widget _buildProgressBar(String label, int value, int ideal, MaterialColor color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            RichText(
              text: TextSpan(
                style: const TextStyle(color: Colors.black, fontSize: 14),
                children: [
                  TextSpan(text: '$value% ', style: const TextStyle(fontWeight: FontWeight.bold)),
                  TextSpan(text: '(ideal: $ideal%)', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: value / 100,
            backgroundColor: Colors.grey.shade200,
            color: color.shade500,
            minHeight: 8,
          ),
        ),
      ],
    );
  }
}