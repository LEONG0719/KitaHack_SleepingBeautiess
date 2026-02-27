import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'app_drawer.dart';
import 'package:flutter/services.dart';

// --- MODELS ---
class NearbyRestaurant {
  final String placeId;
  final String name;
  final String address;
  final double rating;
  final int totalRatings;
  final bool? isOpen;
  final double lat;
  final double lng;
  final int? priceLevel;

  NearbyRestaurant({
    required this.placeId, required this.name, required this.address,
    required this.rating, required this.totalRatings, this.isOpen,
    required this.lat, required this.lng, this.priceLevel,
  });
}

class NearbyPage extends StatefulWidget {
  const NearbyPage({super.key});

  @override
  State<NearbyPage> createState() => _NearbyPageState();
}

class _NearbyPageState extends State<NearbyPage> {
  // ⚠️ API KEY loaded securely from .env file
  final String googleApiKey = dotenv.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'] ?? '';
  
  final Color primaryGreen = const Color(0xFF10B981);
  
  GoogleMapController? mapController;
  Position? userLocation;
  bool isLoading = true;
  bool isSearching = false;
  String? errorMessage;
  
  List<NearbyRestaurant> restaurants = [];
  Set<Marker> markers = {};
  
  final TextEditingController _searchController = TextEditingController();
  final LatLng defaultKL = const LatLng(3.139, 101.6869); // Default if location denied

  final List<String> quickChips = [
    'Nasi Lemak', 'Roti Canai', 'Char Kuey Teow', 'Mamak', 
    'Nasi Kandar', 'Chinese', 'Vegetarian'
  ];

  @override
  void initState() {
    super.initState();
    _getUserLocation();
  }

  Future<void> _getUserLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _setDefaultLocation('Location services are disabled. Showing KL.');
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _setDefaultLocation('Location permissions are denied. Showing KL.');
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      _setDefaultLocation('Location permissions are permanently denied. Showing KL.');
      return;
    }

    try {
      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      if (!mounted) return;
      setState(() {
        userLocation = position;
        isLoading = false;
      });
      _updateUserMarker(LatLng(position.latitude, position.longitude));
    } catch (e) {
      _setDefaultLocation('Failed to get location. Showing KL.');
    }
  }

  void _setDefaultLocation(String errorMsg) {
    if (!mounted) return;
    setState(() {
      errorMessage = errorMsg;
      isLoading = false;
    });
    _updateUserMarker(defaultKL);
  }

  void _updateUserMarker(LatLng loc) {
    setState(() {
      markers.add(
        Marker(
          markerId: const MarkerId('user_loc'),
          position: loc,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: 'Your Location'),
        )
      );
    });
    mapController?.animateCamera(CameraUpdate.newLatLngZoom(loc, 14));
  }

  Future<void> searchRestaurants(String query) async {
    if (query.isEmpty) return;
    
    // Close keyboard
    FocusScope.of(context).unfocus();
    
    setState(() {
      isSearching = true;
      _searchController.text = query;
      errorMessage = null;
    });

    final lat = userLocation?.latitude ?? defaultKL.latitude;
    final lng = userLocation?.longitude ?? defaultKL.longitude;

    final String url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?'
        'query=${Uri.encodeComponent("$query restaurant")}'
        '&location=$lat,$lng'
        '&radius=3000'
        '&key=$googleApiKey';

    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['status'] == 'OK') {
          List results = data['results'];
          List<NearbyRestaurant> parsed = [];
          Set<Marker> newMarkers = {};
          
          // Re-add user location marker
          newMarkers.add(markers.firstWhere((m) => m.markerId.value == 'user_loc'));

          for (int i = 0; i < results.length && i < 15; i++) {
            var place = results[i];
            var latLng = place['geometry']['location'];
            
            NearbyRestaurant rest = NearbyRestaurant(
              placeId: place['place_id'] ?? '',
              name: place['name'] ?? 'Unknown',
              address: place['formatted_address'] ?? 'No address',
              rating: (place['rating'] ?? 0).toDouble(),
              totalRatings: place['user_ratings_total'] ?? 0,
              isOpen: place['opening_hours']?['open_now'],
              lat: latLng['lat'],
              lng: latLng['lng'],
              priceLevel: place['price_level'],
            );
            parsed.add(rest);

            newMarkers.add(
              Marker(
                markerId: MarkerId(rest.placeId),
                position: LatLng(rest.lat, rest.lng),
                infoWindow: InfoWindow(title: rest.name, snippet: rest.address),
              )
            );
          }

          setState(() {
            restaurants = parsed;
            markers = newMarkers;
          });

          // Zoom to show all markers (approximate bounds)
          if (parsed.isNotEmpty) {
            mapController?.animateCamera(CameraUpdate.newLatLngZoom(LatLng(parsed[0].lat, parsed[0].lng), 14));
          }
        } else if (data['status'] == 'ZERO_RESULTS') {
          setState(() => restaurants = []);
        } else {
          setState(() => errorMessage = "Google Maps API Error: ${data['status']}");
        }
      }
    } catch (e) {
      setState(() => errorMessage = 'Network error occurred while searching.');
    } finally {
      setState(() => isSearching = false);
    }
  }

  void _focusRestaurant(NearbyRestaurant r) {
    mapController?.animateCamera(CameraUpdate.newLatLngZoom(LatLng(r.lat, r.lng), 16));
    mapController?.showMarkerInfoWindow(MarkerId(r.placeId));
  }

  Future<void> _openGoogleMaps(String placeId) async {
    final Uri url = Uri.parse('https://www.google.com/maps/place/?q=place_id:$placeId');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  String _getPriceStr(int? level) {
    if (level == null) return '';
    return ' · ' + List.generate(level, (i) => '💰').join('');
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
    LatLng center = defaultKL;
    if (userLocation != null) {
      center = LatLng(userLocation!.latitude, userLocation!.longitude);
    }
    return PopScope(
      canPop: false, // 🔒 Locks the swipe-left gesture
      onPopInvoked: (bool didPop) {
        if (didPop) return;
        _handleAppExit(); // Triggers the popup instead of going back
      },
    child: Scaffold(
      drawer: const AppDrawer(activePage: 'Nearby'),
      backgroundColor: const Color(0xFFF9FAFB),
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
        : Column(
            children: [
              // --- HEADER & SEARCH ---
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.amber.shade200)),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 20),
                            const SizedBox(width: 8),
                            Expanded(child: Text(errorMessage!, style: TextStyle(color: Colors.amber.shade800, fontSize: 13))),
                          ],
                        ),
                      ),
                    
                    // Search Bar
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            decoration: InputDecoration(
                              hintText: 'Search cuisine (e.g., nasi lemak)...',
                              prefixIcon: const Icon(Icons.search),
                              contentPadding: const EdgeInsets.symmetric(vertical: 0),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            onSubmitted: searchRestaurants,
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () => searchRestaurants(_searchController.text),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryGreen, 
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: isSearching 
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(Icons.search),
                        )
                      ],
                    ),
                    const SizedBox(height: 12),
                    
                    // Quick Chips
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: quickChips.map((chip) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ActionChip(
                            label: Text(chip, style: TextStyle(fontSize: 12, color: primaryGreen, fontWeight: FontWeight.bold)),
                            backgroundColor: primaryGreen.withOpacity(0.1),
                            side: BorderSide(color: primaryGreen.withOpacity(0.3)),
                            onPressed: () => searchRestaurants(chip),
                          ),
                        )).toList(),
                      ),
                    ),
                  ],
                ),
              ),

              // --- MAP ---
              SizedBox(
                height: 250,
                child: GoogleMap(
                  initialCameraPosition: CameraPosition(target: center, zoom: 14),
                  myLocationEnabled: true,
                  myLocationButtonEnabled: true,
                  markers: markers,
                  onMapCreated: (controller) => mapController = controller,
                ),
              ),

              // --- LIST RESULTS ---
              Expanded(
                child: restaurants.isEmpty 
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.location_on_outlined, size: 48, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text(isSearching ? 'Searching...' : 'Search for a restaurant above', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: restaurants.length,
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (context, index) {
                        final r = restaurants[index];
                        return InkWell(
                          onTap: () => _focusRestaurant(r),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  backgroundColor: primaryGreen.withOpacity(0.1),
                                  child: Text('${index + 1}', style: TextStyle(color: primaryGreen, fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(r.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                      Text(r.address, style: TextStyle(color: Colors.grey.shade600, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Icon(Icons.star, size: 14, color: Colors.amber.shade600),
                                          const SizedBox(width: 4),
                                          Text('${r.rating} (${r.totalRatings})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                                          Text(_getPriceStr(r.priceLevel), style: const TextStyle(fontSize: 12)),
                                          const SizedBox(width: 12),
                                          if (r.isOpen != null)
                                            Row(
                                              children: [
                                                Icon(Icons.access_time, size: 14, color: r.isOpen! ? primaryGreen : Colors.red),
                                                const SizedBox(width: 4),
                                                Text(r.isOpen! ? 'Open' : 'Closed', style: TextStyle(fontSize: 12, color: r.isOpen! ? primaryGreen : Colors.red, fontWeight: FontWeight.bold)),
                                              ],
                                            ),
                                        ],
                                      )
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(Icons.open_in_new, color: primaryGreen),
                                  onPressed: () => _openGoogleMaps(r.placeId),
                                )
                              ],
                            ),
                          ),
                        );
                      },
                    ),
              )
            ],
          ),
    ),
    );
  }
}