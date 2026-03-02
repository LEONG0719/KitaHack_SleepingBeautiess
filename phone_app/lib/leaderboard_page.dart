import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart'; // 🔥 IMPORT FIRESTORE
import 'app_drawer.dart';
import 'package:flutter/services.dart';

// --- MOCK DATA MODELS ---
class Competitor {
  final String userId;
  final String displayName;
  final String campus;
  final String currentTier;
  final int streak;
  final int totalScans;
  final double sukuScore;
  final double rmSaved;

  Competitor({
    required this.userId, required this.displayName, required this.campus,
    required this.currentTier, required this.streak, required this.totalScans,
    required this.sukuScore, required this.rmSaved,
  });
}

final List<Competitor> mockCompetitors = [
  Competitor(userId: 'mock1', displayName: 'Darren Wong', campus: 'Monash University Malaysia', currentTier: 'Radiant', streak: 25, totalScans: 95, sukuScore: 9.8, rmSaved: 210.00),
  Competitor(userId: 'mock2', displayName: 'Sarah Wong', campus: 'Universiti Malaya (UM)', currentTier: 'Immortal', streak: 21, totalScans: 84, sukuScore: 9.5, rmSaved: 185.50),
  Competitor(userId: 'mock3', displayName: 'Ali Razak', campus: 'Asia Pacific University (APU)', currentTier: 'Ascendant', streak: 18, totalScans: 72, sukuScore: 9.1, rmSaved: 155.00),
  Competitor(userId: 'mock4', displayName: 'Nur Aina', campus: 'Universiti Malaya (UM)', currentTier: 'Ascendant', streak: 16, totalScans: 65, sukuScore: 8.9, rmSaved: 142.00),
  Competitor(userId: 'mock5', displayName: 'Kavitha Murugan', campus: "Taylor's University", currentTier: 'Diamond', streak: 15, totalScans: 60, sukuScore: 8.8, rmSaved: 134.20),
  Competitor(userId: 'mock6', displayName: 'Wei Jian', campus: 'Sunway University', currentTier: 'Diamond', streak: 14, totalScans: 55, sukuScore: 8.5, rmSaved: 120.00),
  Competitor(userId: 'mock7', displayName: 'Aiman Hakim', campus: 'Universiti Putra Malaysia (UPM)', currentTier: 'Platinum', streak: 12, totalScans: 48, sukuScore: 8.2, rmSaved: 105.50),
  Competitor(userId: 'mock14', displayName: 'Muthu Kumar', campus: 'Asia Pacific University (APU)', currentTier: 'Silver', streak: 5, totalScans: 28, sukuScore: 6.1, rmSaved: 48.50),
  Competitor(userId: 'mock19', displayName: 'Aisha Osman', campus: 'Sunway University', currentTier: 'Iron', streak: 1, totalScans: 5, sukuScore: 3.2, rmSaved: 12.00),
];

final List<String> campuses = [
  'All Campuses', 'Universiti Teknologi Malaysia (UTM)', 'Asia Pacific University (APU)', 'Universiti Malaya (UM)',
  "Taylor's University", 'Universiti Kebangsaan Malaysia (UKM)',
  'Universiti Putra Malaysia (UPM)', 'Sunway University',
  'Monash University Malaysia', 'HELP University', 'UCSI University', 'Other',
];

class LeaderboardPage extends StatefulWidget {
  const LeaderboardPage({super.key});

  @override
  State<LeaderboardPage> createState() => _LeaderboardPageState();
}

class _LeaderboardPageState extends State<LeaderboardPage> {
  final User? currentUser = FirebaseAuth.instance.currentUser;
  final Color primaryGreen = const Color(0xFF00966C);

  String metric = 'weekly_suku_avg_score';
  String selectedCampus = 'All Campuses';

  // 🔥 NEW STATE VARIABLES FOR DATABASE FETCHING
  List<Competitor> _realUsers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchLeaderboardData(); // Fetch from Firebase on load!
  }

  // 🔥 FIRESTORE FETCH LOGIC (Mirrors your React website)
  Future<void> _fetchLeaderboardData() async {
    setState(() => _isLoading = true);
    try {
      final snapshot = await FirebaseFirestore.instance.collection('users').get();
      final List<Competitor> fetched = [];
      
      for (var doc in snapshot.docs) {
        final data = doc.data();
        
        // Parse fields safely (matching your website's database structure)
        String name = data['fullName'] ?? data['display_name'] ?? 'User';
        String campus = data['campus'] ?? 'Unset';
        String tier = data['current_tier'] ?? 'Iron';
        
        // Handle gamification stats (handling both flat and nested objects)
        Map<String, dynamic> gStats = data.containsKey('gamification_stats') 
            ? data['gamification_stats'] as Map<String, dynamic> 
            : {};
            
        int streak = gStats['current_health_streak_days'] ?? data['streak'] ?? 0;
        int totalScans = gStats['total_scans'] ?? data['totalScans'] ?? 0;
        
        // Convert to double safely
        double sukuScore = (gStats['weekly_suku_avg_score'] ?? data['weekly_suku_avg_score'] ?? 0.0).toDouble();
        double rmSaved = (gStats['weekly_money_saved_rm'] ?? data['weekly_money_saved_rm'] ?? 0.0).toDouble();

        fetched.add(Competitor(
          userId: doc.id,
          displayName: name,
          campus: campus,
          currentTier: tier,
          streak: streak,
          totalScans: totalScans,
          sukuScore: sukuScore,
          rmSaved: rmSaved,
        ));
      }
      
      if (mounted) {
        setState(() {
          _realUsers = fetched;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error fetching leaderboard: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Color _getTierColor(String tier) {
    switch (tier) {
      case 'Iron': return Colors.grey.shade600;
      case 'Bronze': return const Color(0xFFB45309);
      case 'Silver': return const Color(0xFF94A3B8);
      case 'Gold': return const Color(0xFFEAB308);
      case 'Platinum': return const Color(0xFF06B6D4);
      case 'Diamond': return const Color(0xFF8B5CF6);
      case 'Ascendant': return const Color(0xFFEF4444);
      case 'Immortal': return const Color(0xFFBE123C);
      case 'Radiant': return const Color(0xFFF59E0B);
      default: return Colors.grey;
    }
  }

  // 🔥 MERGE & SORT LOGIC
  List<Competitor> get _filteredAndSortedData {
    // 1. Start with REAL users from Firestore
    List<Competitor> data = List.from(_realUsers);
    
    // 2. Add MOCK users (Ensuring no duplicates)
    for (var mock in mockCompetitors) {
      if (!data.any((c) => c.userId == mock.userId)) {
        data.add(mock);
      }
    }

    // 3. Fallback for Current User if they haven't saved profile data yet
    if (currentUser != null && !data.any((c) => c.userId == currentUser!.uid)) {
      data.add(Competitor(
        userId: currentUser!.uid, 
        displayName: currentUser!.displayName ?? 'You', 
        campus: 'Earth', currentTier: 'Iron', streak: 0, totalScans: 0, sukuScore: 0.0, rmSaved: 0.0
      ));
    }

    // 4. Filter by Campus
    if (selectedCampus != 'All Campuses') {
      data = data.where((c) => c.campus == selectedCampus).toList();
    }

    // 5. Sort by active Tab Metric (Highest first)
    data.sort((a, b) {
      double valA = metric == 'weekly_suku_avg_score' ? a.sukuScore : a.rmSaved;
      double valB = metric == 'weekly_suku_avg_score' ? b.sukuScore : b.rmSaved;
      return valB.compareTo(valA); 
    });

    return data;
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
                SystemNavigator.pop(); 
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
    final data = _filteredAndSortedData;
    final top3 = data.take(3).toList();
    final rest = data.skip(3).toList();

    // Find current user rank
    int currentUserRank = -1;
    Competitor? currentUserData;
    if (currentUser != null) {
      currentUserRank = data.indexWhere((c) => c.userId == currentUser!.uid) + 1;
      if (currentUserRank > 0) currentUserData = data[currentUserRank - 1];
    }

    return PopScope(
      canPop: false, 
      onPopInvoked: (bool didPop) {
        if (didPop) return;
        _handleAppExit(); 
      },
      child: Scaffold(
      drawer: const AppDrawer(activePage: 'Leaderboard'),
      backgroundColor: const Color(0xFFF9FAFB),
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
      
      // 🔥 Show loading spinner while fetching DB data
      body: _isLoading 
        ? Center(child: CircularProgressIndicator(color: primaryGreen))
        : Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20.0).copyWith(bottom: 120), 
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.emoji_events, color: Colors.amber, size: 28),
                        const SizedBox(width: 8),
                        const Text('Leaderboard', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Tabs & Dropdown
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Container(
                        height: 40,
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade200)),
                        child: Row(
                          children: [
                            _buildTab('Suku Score', 'weekly_suku_avg_score'),
                            _buildTab('RM Saved', 'weekly_money_saved_rm'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: Container(
                        height: 40,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade200)),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedCampus,
                            isExpanded: true,
                            icon: const Icon(Icons.keyboard_arrow_down, size: 16),
                            style: const TextStyle(fontSize: 12, color: Colors.black, fontWeight: FontWeight.bold),
                            onChanged: (v) => setState(() => selectedCampus = v!),
                            items: campuses.map((c) => DropdownMenuItem(value: c, child: Text(c == 'All Campuses' ? '🌍 All Campuses' : c.split('(')[0].trim(), overflow: TextOverflow.ellipsis))).toList(),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40),

                // --- PODIUM (Top 3) ---
                if (top3.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 10, bottom: 20),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (top3.length > 1) Expanded(child: _buildPodiumItem(top3[1], 2)),
                        Expanded(child: _buildPodiumItem(top3[0], 1)),
                        if (top3.length > 2) Expanded(child: _buildPodiumItem(top3[2], 3)),
                      ],
                    ),
                  ),
                
                const SizedBox(height: 24),

                // --- LIST VIEW (Ranks 4+) ---
                Container(
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: rest.length,
                    separatorBuilder: (c, i) => Divider(height: 1, color: Colors.grey.shade100),
                    itemBuilder: (context, index) {
                      final item = rest[index];
                      final rank = index + 4;
                      return _buildListItem(item, rank);
                    },
                  ),
                )
              ],
            ),
          ),

          // --- STICKY BOTTOM BAR ---
          if (currentUserRank > 3 && currentUserData != null)
            Positioned(
              bottom: 0, left: 0, right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF064E3B), 
                  border: const Border(top: BorderSide(color: Color(0xFF10B981), width: 4)),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, -5))],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: const Color(0xFF065F46), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF10B981))),
                      child: Center(child: Text('#$currentUserRank', style: const TextStyle(color: Color(0xFFD1FAE5), fontWeight: FontWeight.w900))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text('Your Current Rank ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              Text('Keep it up!', style: TextStyle(color: Colors.green.shade300, fontSize: 10)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              _buildTierBadge(currentUserData.currentTier),
                              const SizedBox(width: 8),
                              Icon(Icons.local_fire_department, color: Colors.orange.shade400, size: 14),
                              Text('${currentUserData.streak}', style: TextStyle(color: Colors.orange.shade400, fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          )
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(metric == 'weekly_money_saved_rm' ? 'RM ${currentUserData.rmSaved.toStringAsFixed(0)}' : currentUserData.sukuScore.toStringAsFixed(1), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF34D399))),
                        Text(metric == 'weekly_money_saved_rm' ? 'Saved this week' : 'Suku Score', style: const TextStyle(fontSize: 10, color: Color(0xFFA7F3D0))),
                      ],
                    )
                  ],
                ),
              ),
            )
        ],
      ),
      ),
    );
  }

  // --- WIDGET HELPERS ---

  Widget _buildTab(String title, String tabMetric) {
    final isSelected = metric == tabMetric;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => metric = tabMetric),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            boxShadow: isSelected ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
          ),
          alignment: Alignment.center,
          margin: const EdgeInsets.all(2),
          child: Text(title, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSelected ? Colors.black : Colors.grey)),
        ),
      ),
    );
  }

  Widget _buildPodiumItem(Competitor entry, int rank) {
    final heightMap = {1: 140.0, 2: 110.0, 3: 90.0};
    final colorMap = {
      1: [Colors.amber.shade200, Colors.amber.shade50],
      2: [Colors.grey.shade300, Colors.grey.shade50],
      3: [Colors.orange.shade200, Colors.orange.shade50],
    };
    final rankColor = {1: Colors.amber.shade600, 2: Colors.grey.shade500, 3: Colors.orange.shade600};

    final avatarUrl = "https://api.dicebear.com/7.x/micah/png?seed=${Uri.encodeComponent(entry.displayName)}&backgroundColor=f1f5f9";

    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (rank == 1) const Icon(Icons.workspace_premium, color: Colors.amber, size: 28), 
        
        Stack(
          alignment: Alignment.bottomCenter,
          clipBehavior: Clip.none,
          children: [
            Container(
              width: rank == 1 ? 64 : 52,
              height: rank == 1 ? 64 : 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: _getTierColor(entry.currentTier), width: 3),
                image: DecorationImage(image: NetworkImage(avatarUrl), fit: BoxFit.cover),
              ),
            ),
            Positioned(bottom: -8, child: _buildTierBadge(entry.currentTier)),
          ],
        ),
        const SizedBox(height: 12),
        
        Text(entry.displayName.split(' ')[0], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, overflow: TextOverflow.ellipsis)),
        Text(metric == 'weekly_money_saved_rm' ? 'RM ${entry.rmSaved.toStringAsFixed(0)}' : entry.sukuScore.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF059669))),
        
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_fire_department, color: Colors.orange.shade500, size: 10),
            Text('${entry.streak}', style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
            const SizedBox(width: 4),
            Icon(Icons.camera_alt, color: Colors.grey.shade400, size: 10),
            Text('${entry.totalScans}', style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),

        Container(
          height: heightMap[rank],
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: colorMap[rank]!),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            border: Border(top: BorderSide(color: rankColor[rank]!, width: 2), left: BorderSide(color: rankColor[rank]!, width: 2), right: BorderSide(color: rankColor[rank]!, width: 2)),
          ),
          child: Center(
            child: Text(rank == 1 ? '1st' : rank == 2 ? '2nd' : '3rd', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: rankColor[rank])),
          ),
        ),
      ],
    );
  }

  Widget _buildListItem(Competitor entry, int rank) {
    bool isCurrentUser = entry.userId == currentUser?.uid;
    final avatarUrl = "https://api.dicebear.com/7.x/micah/png?seed=${Uri.encodeComponent(entry.displayName)}&backgroundColor=f1f5f9";

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: isCurrentUser ? primaryGreen.withOpacity(0.05) : Colors.transparent,
      child: Row(
        children: [
          SizedBox(
            width: 32,
            child: Text('#$rank', style: TextStyle(fontWeight: FontWeight.w900, color: isCurrentUser ? primaryGreen : Colors.grey.shade400, fontSize: 16)),
          ),
          
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: _getTierColor(entry.currentTier), width: 2),
              image: DecorationImage(image: NetworkImage(avatarUrl), fit: BoxFit.cover),
            ),
          ),
          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(child: Text(entry.displayName, style: TextStyle(fontWeight: FontWeight.bold, color: isCurrentUser ? primaryGreen : Colors.black, overflow: TextOverflow.ellipsis))),
                    if (isCurrentUser) Container(margin: const EdgeInsets.only(left: 8), padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: primaryGreen.withOpacity(0.2), borderRadius: BorderRadius.circular(10)), child: Text('YOU', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: primaryGreen))),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _buildTierBadge(entry.currentTier),
                    const SizedBox(width: 6),
                    Flexible(child: Text('• ${entry.campus.split('(')[0].trim()}', style: const TextStyle(fontSize: 10, color: Colors.grey, overflow: TextOverflow.ellipsis))),
                  ],
                )
              ],
            ),
          ),

          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(children: [Icon(Icons.local_fire_department, color: Colors.orange.shade400, size: 12), Text('${entry.streak}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey))]),
              Row(children: [Icon(Icons.camera_alt, color: Colors.grey.shade400, size: 12), Text('${entry.totalScans}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey))]),
            ],
          ),
          const SizedBox(width: 12),

          SizedBox(
            width: 50,
            child: Text(
              metric == 'weekly_money_saved_rm' ? 'RM ${entry.rmSaved.toStringAsFixed(0)}' : entry.sukuScore.toStringAsFixed(1),
              textAlign: TextAlign.right,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: isCurrentUser ? primaryGreen : Colors.black87),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildTierBadge(String tier) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: _getTierColor(tier), borderRadius: BorderRadius.circular(12)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.workspace_premium, color: Colors.white, size: 10),
          const SizedBox(width: 2),
          Text(tier.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        ],
      ),
    );
  }
}