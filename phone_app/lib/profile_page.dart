import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter/services.dart';
import 'gemini_service.dart';
import 'app_drawer.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final User? user = FirebaseAuth.instance.currentUser;
  final Color primaryGreen = const Color(0xFF00966C);
  final Color lightGreenBg = const Color(0xFFEAFBF3);

  bool isLoading = true;
  bool isSaving = false;
  bool isEditing = false;
  bool isTyping = false;
  bool isNudging = false;

  // Seasonal Mode (stored in Firestore)
  String seasonalMode = 'normal';

  // Profile Data
  String displayName = '';
  String bio = '';
  String campus = '';
  String goals = 'balanced';
  String favoriteCuisine = '';

  // Gamification Stats (Defaults, will be overwritten by DB)
  int vitality = 78;
  int level = 4;
  int streak = 2;
  int nutriCoins = 150;
  String currentTier = 'Iron';

  // Chat Data
  final TextEditingController _chatController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Content> _chatHistory = [];

  final List<String> campuses = [
    'Universiti Teknologi Malaysia (UTM)',
    'Asia Pacific University (APU)',
    'Universiti Malaya (UM)',
    "Taylor's University",
    'Universiti Kebangsaan Malaysia (UKM)',
    'Universiti Putra Malaysia (UPM)',
    'Sunway University',
    'Monash University Malaysia',
    'HELP University',
    'UCSI University',
    'Other',
  ];

  // 🔥 NEW: INTERACTIVE BUDDY STATE 🔥
  int _buddyClickCount = 0;
  bool _isSquishing = false;
  Map<String, String>? _activeReaction;
  double _reactionYOffset = 0.0;
  double _reactionOpacity = 0.0;

  // Exact same reactions from your Next.js code!
  final Map<String, List<Map<String, String>>> _moodReactions = {
    'happy': [
      {'emoji': '🎉', 'text': 'Yay!'},
      {'emoji': '💕', 'text': 'Love it!'},
      {'emoji': '✨', 'text': 'Sparkle!'},
      {'emoji': '🎊', 'text': 'So fun!'},
      {'emoji': '🌟', 'text': 'Woohoo!'},
    ],
    'neutral': [
      {'emoji': '😺', 'text': 'Nyaa~'},
      {'emoji': '🍵', 'text': 'Mmm tea'},
      {'emoji': '👋', 'text': 'Hello!'},
      {'emoji': '😊', 'text': 'Heehee'},
      {'emoji': '🐾', 'text': 'Pat pat'},
    ],
    'tired': [
      {'emoji': '😴', 'text': '5 more mins…'},
      {'emoji': '💤', 'text': 'Zzz…'},
      {'emoji': '☕', 'text': 'Need kopi!'},
      {'emoji': '🥺', 'text': 'So tired…'},
      {'emoji': '😪', 'text': 'Haiyaa…'},
    ],
  };

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  // --- 🔥 NEW: BUDDY CLICK LOGIC 🔥 ---
  void _handleBuddyClick() {
    String mood = vitality >= 70 ? 'happy' : vitality >= 40 ? 'neutral' : 'tired';
    var reactions = _moodReactions[mood]!;
    var reaction = reactions[_buddyClickCount % reactions.length];

    setState(() {
      _isSquishing = true;
      _activeReaction = reaction;
      _reactionYOffset = 0.0; // Reset position
      _reactionOpacity = 1.0;
      _buddyClickCount++;
    });

    // 1. Release the squish quickly
    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) setState(() => _isSquishing = false);
    });

    // 2. Trigger the float up animation
    Future.delayed(const Duration(milliseconds: 50), () {
      if (mounted) setState(() => _reactionYOffset = 60.0);
    });

    // 3. Fade out
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) setState(() => _reactionOpacity = 0.0);
    });
    
    // 4. Remove completely
    Future.delayed(const Duration(milliseconds: 2000), () {
      if (mounted) setState(() {
        if (_reactionOpacity == 0.0) _activeReaction = null;
      });
    });
  }

  // --- MATCHING REACT LOGIC: DYNAMIC BUDDY MESSAGES ---
  String getBuddyMessage() {
    final hour = DateTime.now().hour;
    if (vitality < 30) return "I'm feeling sluggish... feed me some fiber! 🥦";
    if (streak >= 3) return "Wok Hei activated! $streak day streak! 🔥";
    if (hour < 11) return "Selamat Pagi! Ready for a balanced breakfast? 🌅";
    if (hour < 15) return "Jom makan! Let's get that Suku-Suku Separuh for lunch! 🍛";
    if (hour < 19) return "Minum petang? Keep it light and healthy! ☕";
    return "Makan malam soon? Let's aim for a high Suku score tonight! 🌙";
  }

  // --- SEASONAL MODE METHODS (Pillar 4: Cultural Context) ---
  Future<void> _setSeasonalMode(String mode) async {
    setState(() => seasonalMode = mode);
    if (user != null) {
      try {
        await FirebaseFirestore.instance.collection('users').doc(user!.uid).update({
          'seasonalMode': mode,
        });
      } catch (e) {
        print('Failed to save seasonal mode: $e');
      }
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Seasonal mode set to ${mode[0].toUpperCase()}${mode.substring(1)}'),
          backgroundColor: const Color(0xFF10B981),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  // --- NUTRINUDGE METHOD (Pillar 4: Proactive AI Nudge via Gemini) ---
  Future<void> _triggerNutriNudge() async {
    if (isNudging) return;
    setState(() => isNudging = true);

    try {
      final hour = DateTime.now().hour;
      String timeOfDay = 'afternoon';
      if (hour < 11) timeOfDay = 'morning';
      else if (hour < 14) timeOfDay = 'lunchtime';
      else if (hour < 17) timeOfDay = 'afternoon';
      else if (hour < 20) timeOfDay = 'evening';
      else timeOfDay = 'night';

      final nudge = await GeminiService.generateNutriNudge(
        displayName: displayName.isEmpty ? 'User' : displayName,
        nutriCoins: nutriCoins,
        timeOfDay: timeOfDay,
        seasonalMode: seasonalMode,
      );

      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFF7C3AED).withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.notifications_active, color: Color(0xFF7C3AED), size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(child: Text('NutriNudge 🔔', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18))),
              ],
            ),
            content: Text(nudge, style: const TextStyle(fontSize: 14, height: 1.6, color: Color(0xFF374151))),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: const Text('Got it!', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Nudge failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isNudging = false);
    }
  }

  Future<void> _loadProfile() async {
    if (user == null) return;
    try {
      DocumentSnapshot doc = await FirebaseFirestore.instance.collection('users').doc(user!.uid).get();
      if (!mounted) return;

      if (doc.exists) {
        final data = doc.data() as Map<String, dynamic>;
        
        setState(() {
          displayName = data['fullName'] ?? user!.displayName ?? '';
          bio = data['bio'] ?? '';
          campus = data['campus'] ?? '';
          goals = data['goals'] ?? 'balanced';
          favoriteCuisine = data['favoriteCuisine'] ?? '';
          seasonalMode = data['seasonalMode'] ?? 'normal';
          
          if (data.containsKey('buddy')) {
            final buddy = data['buddy'] as Map<String, dynamic>;
            vitality = buddy['vitality'] ?? 78;
            level = buddy['level'] ?? 4;
          }

          if (data.containsKey('gamification_stats')) {
            final gStats = data['gamification_stats'] as Map<String, dynamic>;
            streak = gStats['current_health_streak_days'] ?? 0;
            nutriCoins = gStats['nutricoin_balance'] ?? 0;
            currentTier = data['current_tier'] ?? 'Iron';
          } else {
            streak = data['streak'] ?? 0;
            nutriCoins = data['nutricoin_balance'] ?? 0;
            currentTier = data['current_tier'] ?? 'Iron';
          }
        });
      }
    } catch (e) {
      print("Error loading profile: $e");
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> _saveProfile() async {
    if (user == null) return;
    setState(() => isSaving = true);
    try {
      await FirebaseFirestore.instance.collection('users').doc(user!.uid).update({
        'fullName': displayName,
        'bio': bio,
        'campus': campus,
        'goals': goals,
        'favoriteCuisine': favoriteCuisine,
      });
      await user!.updateDisplayName(displayName);

      if (!mounted) return;
      setState(() => isEditing = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated!'), backgroundColor: Colors.green));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to save: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  Future<void> _sendMessage() async {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _chatHistory.add(Content.text(text));
      _chatController.clear();
      isTyping = true;
    });
    _scrollToBottom();

    final buddyContext = {
      'name': displayName.isEmpty ? 'NutriBuddy' : displayName,
      'mood': vitality >= 70 ? 'happy' : 'tired',
      'vitality': vitality,
      'level': level,
      'streak': streak,
    };

    final reply = await GeminiService.chatWithBuddy(
      message: text,
      history: _chatHistory.sublist(0, _chatHistory.length - 1),
      buddyContext: buddyContext,
    );

    if (!mounted) return;
    setState(() {
      _chatHistory.add(Content.model([TextPart(reply)]));
      isTyping = false;
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
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
    if (isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    
    return PopScope(
      canPop: false, 
      onPopInvoked: (bool didPop) {
        if (didPop) return;
        _handleAppExit(); 
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FA),
        drawer: const AppDrawer(activePage: 'Profile'), 
        
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          centerTitle: false,
          titleSpacing: 0, 
          iconTheme: const IconThemeData(color: Colors.black),
          title: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              children: [
                const Icon(Icons.restaurant_menu, color: Color(0xFF00966C), size: 22),
                const SizedBox(width: 6),
                RichText(
                  text: const TextSpan(
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                    children: [
                      TextSpan(text: 'NutriBalance '),
                      TextSpan(text: 'AI', style: TextStyle(color: Color(0xFF00966C))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            Container(
              margin: const EdgeInsets.only(right: 12), 
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade200),
                borderRadius: BorderRadius.circular(12),
                color: Colors.white,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min, 
                children: [
                  const Icon(Icons.emoji_events_outlined, color: Colors.black54, size: 16),
                  const SizedBox(width: 4),
                  Text("RANK", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade400)),
                  const SizedBox(width: 4),
                  Text(currentTier.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF111827), fontSize: 12)),
                ],
              ),
            )
          ],
        ),
        
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: _buildStatCard(Icons.monetization_on_outlined, 'NutriCoins', '$nutriCoins', const Color(0xFF10B981))), 
                  const SizedBox(width: 12),
                  Expanded(child: _buildStatCard(Icons.local_fire_department_rounded, 'Streak', '$streak Days', const Color(0xFFF59E0B))), 
                ],
              ),
              const SizedBox(height: 24),

              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 15, offset: const Offset(0, 5))],
                ),
                child: isEditing ? _buildEditForm() : _buildProfileView(),
              ),
              const SizedBox(height: 24),

              _buildSeasonalModeCard(),
              const SizedBox(height: 24),

              _buildBuddySaysBubble(),
              const SizedBox(height: 12),

              _buildBuddyHeroCard(),
              const SizedBox(height: 24),

              Container(
                height: 400,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      decoration: BoxDecoration(
                        color: primaryGreen.withOpacity(0.08),
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: primaryGreen.withOpacity(0.2),
                            radius: 18,
                            child: const Text('🐱', style: TextStyle(fontSize: 20)),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('NutriBuddy Chat', style: TextStyle(fontWeight: FontWeight.bold, color: primaryGreen, fontSize: 16)),
                              const Text('Online • Manglish Mode', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _chatHistory.length + (isTyping ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == _chatHistory.length) {
                            return const Padding(padding: EdgeInsets.all(8), child: Text('Buddy is typing... 🐾', style: TextStyle(color: Colors.grey, fontSize: 12)));
                          }
                          final content = _chatHistory[index];
                          final isUser = content.role == 'user';
                          final text = content.parts.whereType<TextPart>().first.text;
                          return Align(
                            alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              constraints: const BoxConstraints(maxWidth: 260),
                              decoration: BoxDecoration(
                                color: isUser ? primaryGreen : const Color(0xFFF3F4F6),
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: isUser ? const Radius.circular(16) : Radius.zero,
                                  bottomRight: isUser ? Radius.zero : const Radius.circular(16),
                                ),
                              ),
                              child: Text(text, style: TextStyle(color: isUser ? Colors.white : const Color(0xFF1F2937), fontSize: 14)),
                            ),
                          );
                        },
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _chatController,
                              decoration: InputDecoration(
                                hintText: 'Ask buddy for advice...',
                                hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                                filled: true,
                                fillColor: const Color(0xFFF9FAFB),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey.shade200)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey.shade200)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 20),
                              ),
                              onSubmitted: (_) => _sendMessage(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: _sendMessage,
                            child: CircleAvatar(
                              backgroundColor: primaryGreen,
                              radius: 24,
                              child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                            ),
                          )
                        ],
                      ),
                    )
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- UI COMPONENTS ---

  Widget _buildBuddySaysBubble() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD1FAE5), width: 2), 
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: const Color(0xFFD1FAE5),
            child: const Text('🐱', style: TextStyle(fontSize: 20)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('BUDDY SAYS', style: TextStyle(color: primaryGreen, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1.2)),
                const SizedBox(height: 2),
                Text(getBuddyMessage(), style: const TextStyle(color: Colors.black87, fontSize: 13, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: Colors.grey.shade50, shape: BoxShape.circle),
            child: Icon(Icons.chat_bubble_outline, color: primaryGreen.withOpacity(0.5), size: 16),
          )
        ],
      ),
    );
  }

  Widget _buildSeasonalModeCard() {
    final modeEmojis = {'normal': '🍽️', 'ramadan': '🌙', 'festive': '🎉'};
    final modeColors = {
      'normal': const Color(0xFF10B981),
      'ramadan': const Color(0xFF7C3AED),
      'festive': const Color(0xFFF59E0B),
    };
    final currentColor = modeColors[seasonalMode] ?? const Color(0xFF10B981);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 15, offset: const Offset(0, 5))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: currentColor.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                  child: Text(modeEmojis[seasonalMode] ?? '🍽️', style: const TextStyle(fontSize: 20)),
                ),
                const SizedBox(width: 12),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Bazaar Survival Mode', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF111827))),
                    Text('Cultural context for meal plans', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            const Text('CURRENT SEASON', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: currentColor.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(12),
                color: currentColor.withOpacity(0.03),
              ),
              child: DropdownButtonFormField<String>(
                value: seasonalMode,
                items: [
                  DropdownMenuItem(value: 'normal', child: Row(children: [const Text('🍽️ ', style: TextStyle(fontSize: 16)), const Text('Normal', style: TextStyle(fontWeight: FontWeight.w600))])),
                  DropdownMenuItem(value: 'ramadan', child: Row(children: [const Text('🌙 ', style: TextStyle(fontSize: 16)), const Text('Ramadan', style: TextStyle(fontWeight: FontWeight.w600))])),
                  DropdownMenuItem(value: 'festive', child: Row(children: [const Text('🎉 ', style: TextStyle(fontSize: 16)), const Text('Festive', style: TextStyle(fontWeight: FontWeight.w600))])),
                ],
                onChanged: (val) {
                  if (val != null) _setSeasonalMode(val);
                },
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),

            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 16),

            Row(
              children: [
                const Icon(Icons.notifications_active_outlined, size: 18, color: Colors.grey),
                const SizedBox(width: 8),
                const Text('NUTRInudges', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isNudging ? null : _triggerNutriNudge,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                icon: isNudging
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.bolt, size: 18),
                label: Text(
                  isNudging ? 'Generating Nudge...' : 'Simulate Proactive Nudge',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileView() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [primaryGreen.withOpacity(0.1), const Color(0xFFE0F2FE)]),
                  shape: BoxShape.circle,
                ),
                child: Center(child: Text(displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: primaryGreen))),
              ),
              InkWell(
                onTap: () => setState(() => isEditing = true),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.grey.shade50, shape: BoxShape.circle),
                  child: const Icon(Icons.edit_outlined, color: Colors.grey, size: 20),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(displayName.isEmpty ? 'Dietitian Explorer' : displayName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF111827))),
          Text(user?.email ?? '', style: const TextStyle(color: Colors.grey, fontSize: 14)),
          const SizedBox(height: 24),
          
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: const Color(0xFFF9FAFB), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade100)),
            child: Text(bio.isEmpty ? 'No bio added yet. Click ✏️ to share your journey!' : bio, style: const TextStyle(color: Color(0xFF4B5563), fontSize: 14, height: 1.5)),
          ),
          const SizedBox(height: 20),
          
          Row(
            children: [
              Expanded(child: _buildInfoPill('CAMPUS', campus.isEmpty ? 'Unset' : campus, const Color(0xFF10B981))), 
              const SizedBox(width: 12),
              Expanded(child: _buildInfoPill('GOAL', goals, const Color(0xFF3B82F6))), 
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoPill('FAVOURITE CUISINE', favoriteCuisine.isEmpty ? 'I love all food! 🍛' : favoriteCuisine, const Color(0xFFF97316)), 
        ],
      ),
    );
  }

  // 🔥 UPDATED: INTERACTIVE BUDDY HERO CARD 🔥
  // 🔥 UPDATED: FULL WEBSITE REPLICA HERO CARD 🔥
  Widget _buildBuddyHeroCard() {
    // 1. Logic matching your React website
    String mood = vitality >= 70 ? 'happy' : vitality >= 40 ? 'neutral' : 'tired';
    int xp = (level * 137) % 100; // Simulated XP logic from website
    bool hasStreak = streak >= 3;
    
    String aura = hasStreak ? 'Wok Hei' : mood == 'happy' ? 'Glowing' : mood == 'tired' ? 'Sleepy' : 'Calm';
    String auraIcon = hasStreak ? '✨' : mood == 'happy' ? '🌟' : mood == 'tired' ? '💤' : '😌';

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFCCFBF1), Color(0xFFD1FAE5)], 
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Stack(
        children: [
          Positioned(top: 20, left: 20, child: Icon(Icons.star, color: Colors.yellow.shade400, size: 20)),
          Positioned(bottom: 40, right: 30, child: Icon(Icons.star, color: Colors.yellow.shade300, size: 16)),
          
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                Align(
                  alignment: Alignment.topRight,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: const Color(0xFF047857), borderRadius: BorderRadius.circular(20)),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.local_fire_department, color: Colors.orange, size: 14),
                        SizedBox(width: 4),
                        Text("WOK HEI!", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                
                // 🐾 INTERACTIVE CAT IMAGE 🐾
               Center(
                  child: Stack(
                    alignment: Alignment.center,
                    clipBehavior: Clip.none,
                    children: [
                      // Floating Reaction Bubble
                      if (_activeReaction != null)
                        AnimatedPositioned(
                          duration: const Duration(milliseconds: 1500),
                          curve: Curves.easeOut,
                          bottom: 150 + _reactionYOffset, 
                          child: AnimatedOpacity(
                            duration: const Duration(milliseconds: 300),
                            opacity: _reactionOpacity,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(24),
                                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(_activeReaction!['emoji']!, style: const TextStyle(fontSize: 22)),
                                  const SizedBox(width: 6),
                                  Text(_activeReaction!['text']!, style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.black87, fontSize: 14)),
                                ],
                              ),
                            ),
                          ),
                        ),

                      // Squishable Cat-in-the-Box Image
                      GestureDetector(
                        onTap: _handleBuddyClick,
                        child: AnimatedScale(
                          scale: _isSquishing ? 0.85 : 1.0,
                          duration: const Duration(milliseconds: 150),
                          curve: Curves.easeInOut,
                          child: SizedBox(
                            height: 180,
                            // 🔥 This loads your actual transparent Cat-in-a-box PNG!
                            child: Image.asset(
                              'assets/nutribuddy-cat-$mood.png', 
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                // If you see this red text, your pubspec.yaml spacing is wrong!
                                return const Center(
                                  child: Text(
                                    'Image not found!\nCheck pubspec.yaml',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                      ),
                      
                      // "Tap me" hint for new users
                      if (_buddyClickCount == 0)
                        Positioned(
                          bottom: 0,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text('tap me! 🐾', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
                
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.6), borderRadius: BorderRadius.circular(20)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("YOUR COMPANION", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
                              const SizedBox(height: 2),
                              Text(displayName.isEmpty ? "Explorer" : displayName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF064E3B))),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(12)),
                            child: Row(
                              children: [
                                const Icon(Icons.star, color: Colors.yellow, size: 14),
                                const SizedBox(width: 4),
                                Text("LVL $level", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                              ],
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // VITALITY BAR
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("VITALITY", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
                          Text("$vitality/100 HP", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(value: vitality / 100, backgroundColor: Colors.grey.shade300, color: const Color(0xFF10B981), minHeight: 10),
                      ),
                      const SizedBox(height: 16),

                      // XP BAR
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("XP → LV.${level + 1}", style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
                          Text("$xp/100", style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(value: xp / 100, backgroundColor: Colors.grey.shade300, color: const Color(0xFF8B5CF6), minHeight: 6), // Purple color
                      ),
                      const SizedBox(height: 20),

                      // 3 MINI STAT CARDS
                      Row(
                        children: [
                          Expanded(child: _buildMiniStat('🔥', '${streak}d', 'STREAK', const Color(0xFFC2410C), const Color(0xFFFFF7ED))),
                          const SizedBox(width: 8),
                          Expanded(child: _buildMiniStat('⭐', '$level', 'LEVEL', const Color(0xFF6D28D9), const Color(0xFFF5F3FF))),
                          const SizedBox(width: 8),
                          Expanded(child: _buildMiniStat(auraIcon, aura, 'AURA', const Color(0xFF0369A1), const Color(0xFFF0F9FF))),
                        ],
                      ),
                    ],
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Helper widget for the 3 mini cards at the bottom of the buddy area
  Widget _buildMiniStat(String icon, String value, String label, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 16)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildEditForm() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Edit Profile', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 20),
          _buildTextField('Display Name', displayName, (v) => displayName = v),
          const SizedBox(height: 16),
          _buildTextField('Bio', bio, (v) => bio = v, maxLines: 2),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: campuses.contains(campus) ? campus : null,
            items: campuses.map((c) => DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)))).toList(),
            onChanged: (v) => setState(() => campus = v!),
            decoration: InputDecoration(
              labelText: 'Campus',
              labelStyle: const TextStyle(fontSize: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          const SizedBox(height: 24),
          Row(children: [
            Expanded(child: OutlinedButton(onPressed: () => setState(() => isEditing = false), style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(vertical: 14)), child: const Text('Cancel'))),
            const SizedBox(width: 12),
            Expanded(child: ElevatedButton(onPressed: isSaving ? null : _saveProfile, style: ElevatedButton.styleFrom(backgroundColor: primaryGreen, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), padding: const EdgeInsets.symmetric(vertical: 14)), child: const Text('Save Changes'))),
          ]),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, String value, Function(String) onChanged, {int maxLines = 1}) {
    return TextField(
      controller: TextEditingController(text: value),
      onChanged: onChanged,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  Widget _buildInfoPill(String label, String value, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: color, letterSpacing: 1.0)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1F2937))),
        ],
      ),
    );
  }

  Widget _buildStatCard(IconData icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white, 
        borderRadius: BorderRadius.circular(20), 
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 24, color: color)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        ],
      ),
    );
  }
}