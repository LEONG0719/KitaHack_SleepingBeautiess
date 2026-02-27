import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'questionnaire_page.dart'; 
import 'scanner_page.dart'; 
import 'saved_plan_page.dart'; 
import 'nearby_page.dart';
import 'leaderboard_page.dart';
import 'profile_page.dart';

class AppDrawer extends StatefulWidget {
  final String activePage; // Tells the drawer which page to highlight
  
  const AppDrawer({super.key, required this.activePage});

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  final Color primaryGreen = const Color(0xFF00966C);
  
  // 🔥 Pillar 4: Seasonal Mode State
  String seasonalMode = 'normal';

  @override
  void initState() {
    super.initState();
    _loadSeasonalMode();
  }

  // Fetch the mode from Firebase when the drawer opens
  Future<void> _loadSeasonalMode() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      final doc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      if (doc.exists && mounted) {
        setState(() {
          seasonalMode = (doc.data() as Map<String, dynamic>)['seasonalMode'] ?? 'normal';
        });
      }
    } catch (e) {
      print('Failed to load seasonal mode: $e');
    }
  }

  void _handleLogout(BuildContext context) {
    Navigator.pop(context); 
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.logout, color: Colors.red),
              SizedBox(width: 8),
              Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: const Text('Are you sure you want to log out of your account?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: () async {
                await FirebaseAuth.instance.signOut();
                if (context.mounted) {
                  Navigator.of(context).popUntil((route) => route.isFirst);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade600,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              child: const Text('Log Out'),
            ),
          ],
        );
      }
    );
  }

  void _navigateTo(BuildContext context, Widget page) {
    Navigator.pop(context); 
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => page));
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final String userName = user?.displayName != null && user!.displayName!.isNotEmpty 
        ? user.displayName! : 'Awesome Foodie'; 
    final String userSubtitle = user?.email ?? 'Ready to plan meals!';
    final String uniqueSeed = user?.uid ?? 'guest123';
    final String photoUrl = user?.photoURL ?? 'https://api.dicebear.com/8.x/adventurer/png?seed=$uniqueSeed&backgroundColor=b6e3f4';

    return Drawer(
      width: MediaQuery.of(context).size.width * 0.75,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(right: Radius.circular(30)), // Left-side drawer uses right-side rounding
      ),
      child: SafeArea(
        child: Column(
          children: [
            // --- HEADER ---
            SizedBox(
              height: 180,
              child: Stack(
                children: [
                  Positioned(top: -40, left: -40, child: Container(width: 140, height: 140, decoration: BoxDecoration(shape: BoxShape.circle, color: primaryGreen.withOpacity(0.08)))),
                  Positioned(bottom: 20, right: -30, child: Container(width: 90, height: 90, decoration: BoxDecoration(shape: BoxShape.circle, color: primaryGreen.withOpacity(0.05)))),
                  
                  // 🔥 THE TEAMMATE'S SEASONAL TOGGLE BUTTON (TOP RIGHT)
                  Positioned(
                    top: 16,
                    left: 24,
                    child: GestureDetector(
                      onTap: () {
                        // Cycle: normal → ramadan → festive → normal
                        final modes = ['normal', 'ramadan', 'festive'];
                        final nextIndex = (modes.indexOf(seasonalMode) + 1) % modes.length;
                        final newMode = modes[nextIndex];
                        setState(() => seasonalMode = newMode);
                        
                        // Persist to Firestore immediately
                        final uid = FirebaseAuth.instance.currentUser?.uid;
                        if (uid != null) {
                          FirebaseFirestore.instance.collection('users').doc(uid).update({'seasonalMode': newMode});
                        }
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: seasonalMode == 'ramadan'
                              ? const Color(0xFF7C3AED).withOpacity(0.12)
                              : seasonalMode == 'festive'
                                  ? const Color(0xFFF59E0B).withOpacity(0.12)
                                  : primaryGreen.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: seasonalMode == 'ramadan'
                                ? const Color(0xFF7C3AED).withOpacity(0.4)
                                : seasonalMode == 'festive'
                                    ? const Color(0xFFF59E0B).withOpacity(0.4)
                                    : primaryGreen.withOpacity(0.3),
                            width: 1.2,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              seasonalMode == 'ramadan' ? '🌙' : seasonalMode == 'festive' ? '🎉' : '🍽️',
                              style: const TextStyle(fontSize: 14),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              seasonalMode == 'ramadan' ? 'Ramadan' : seasonalMode == 'festive' ? 'Festive' : 'Normal',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: seasonalMode == 'ramadan'
                                    ? const Color(0xFF7C3AED)
                                    : seasonalMode == 'festive'
                                        ? const Color(0xFFD97706)
                                        : primaryGreen,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Avatar & Name
                  Positioned(
                    left: 24, bottom: 24, right: 16,
                    child: Row(
                      children: [
                        Container(
                          width: 64, height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle, border: Border.all(color: primaryGreen.withOpacity(0.2), width: 2), color: Colors.white,
                            image: DecorationImage(image: NetworkImage(photoUrl), fit: BoxFit.cover),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(userName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87), maxLines: 1, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 2),
                              Text(userSubtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade500), maxLines: 1, overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // --- MENU ITEMS ---
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                children: [
                  _buildDrawerItem(Icons.home_outlined, 'Home', () => _navigateTo(context, const QuestionnairePage())),
                  _buildDrawerItem(Icons.qr_code_scanner, 'Scanner', () => _navigateTo(context, const ScannerPage())),
                  _buildDrawerItem(Icons.bookmark_border, 'Saved Plans', () => _navigateTo(context, const SavedPlansPage())),
                  _buildDrawerItem(Icons.map_outlined, 'Nearby Restaurants', () => _navigateTo(context, const NearbyPage())),
                  _buildDrawerItem(Icons.emoji_events_outlined, 'Leaderboard', () => _navigateTo(context, const LeaderboardPage())),
                  _buildDrawerItem(Icons.person_outline, 'Profile', () => _navigateTo(context, const ProfilePage())),
                  
                  const Padding(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8), child: Divider()),
                  
                  _buildDrawerItem(Icons.logout, 'Log out', () => _handleLogout(context), color: Colors.red.shade600),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // The active page highlight logic!
  Widget _buildDrawerItem(IconData icon, String title, VoidCallback onTap, {Color color = Colors.black87}) {
    bool isSelected = widget.activePage == title; // Uses widget.activePage now
    Color itemColor = isSelected ? primaryGreen : color;

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: isSelected ? primaryGreen.withOpacity(0.1) : Colors.transparent, // Light green highlight
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(icon, color: itemColor, size: 24),
              const SizedBox(width: 16),
              Text(
                title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: itemColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}