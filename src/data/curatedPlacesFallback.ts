import { DiningOption } from '../types';
import { PlaceItemApi } from '../services/apiClient';

interface RegionalVenueSeed {
  name: string;
  cuisineOrType: string;
  cost: number;
  distanceKm: number;
  address: string;
  dietaryTags?: string[];
  allergenFlags?: string[];
}

interface RegionalDirectoryEntry {
  lat: number;
  lon: number;
  dining: RegionalVenueSeed[];
  stays: RegionalVenueSeed[];
}

const REGIONAL_DIRECTORY: Record<string, RegionalDirectoryEntry> = {
  hampi: {
    lat: 15.335,
    lon: 76.46,
    dining: [
      { name: 'Mango Tree Heritage Kitchen', cuisineOrType: 'South Indian · Thali', cost: 550, distanceKm: 0.6, address: 'Hampi Bazaar Riverfront', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Laughing Buddha Cafe', cuisineOrType: 'Pan-Asian · Continental', cost: 700, distanceKm: 1.4, address: 'Virupapur Gaddi Island', allergenFlags: ['Nut Allergy'] },
      { name: 'Gopi Rooftop Restaurant', cuisineOrType: 'North Indian · Tandoor', cost: 600, distanceKm: 0.4, address: 'Janata Plot, Hampi Bazaar', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Chillout Bamboo Cafe', cuisineOrType: 'Woodfired · Fresh Juices', cost: 650, distanceKm: 1.8, address: 'Sanapur Riverside Road' },
      { name: 'Sri Krishna Bhavan', cuisineOrType: 'Udupi · Filter Coffee', cost: 350, distanceKm: 0.9, address: 'Kamalapura Main Junction', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Evolve Back Kamalapura Palace', cuisineOrType: 'resort', cost: 14500, distanceKm: 4.2, address: 'Kamalapura Heritage Sector' },
      { name: 'Heritage Resort Hampi', cuisineOrType: 'resort', cost: 6800, distanceKm: 5.5, address: 'Hosapete-Kamalapura Road' },
      { name: 'Clark’s Inn Hampi', cuisineOrType: 'hotel', cost: 4600, distanceKm: 3.8, address: 'Opp. ASI Museum, Kamalapura' },
      { name: 'Mowgli Guesthouse', cuisineOrType: 'guest_house', cost: 2100, distanceKm: 1.5, address: 'Virupapur Gaddi Ridge' },
      { name: 'Zostel Hampi', cuisineOrType: 'hostel', cost: 1150, distanceKm: 2.9, address: 'Gangavathi Road, Sanapur' },
    ],
  },
  coorg: {
    lat: 12.4244,
    lon: 75.7382,
    dining: [
      { name: 'Coorg Cuisine', cuisineOrType: 'Kodava · Pandi Curry & Akki Roti', cost: 850, distanceKm: 0.5, address: 'Stuart Hill, Madikeri' },
      { name: 'Raintree Heritage Grill', cuisineOrType: 'Kodava · Plantation Spice', cost: 1100, distanceKm: 0.9, address: 'Raja’s Seat Road, Madikeri' },
      { name: 'Beans N Brews Estate Cafe', cuisineOrType: 'Single-Origin Coffee · Bakery', cost: 500, distanceKm: 1.2, address: 'Abbey Falls Trail' },
      { name: 'Udupi The Veg', cuisineOrType: 'South Indian · Pure Veg', cost: 420, distanceKm: 0.7, address: 'College Road, Madikeri', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Taste of Coorg', cuisineOrType: 'Kodava · Bamboo Shoot Curry', cost: 750, distanceKm: 1.4, address: 'GT Road, Madikeri' },
    ],
    stays: [
      { name: 'Taj Madikeri Resort & Spa', cuisineOrType: 'resort', cost: 16500, distanceKm: 4.1, address: 'Monnangeri Rainforest Ridge' },
      { name: 'Evolve Back Coorg', cuisineOrType: 'resort', cost: 18500, distanceKm: 14.0, address: 'Siddapura Coffee Estate' },
      { name: 'Coorg Wilderness Resort', cuisineOrType: 'resort', cost: 11200, distanceKm: 3.6, address: 'Virajpet Highway, Madikeri' },
      { name: 'The Tamara Coorg', cuisineOrType: 'resort', cost: 15800, distanceKm: 16.5, address: 'Kabbinakad Estate' },
      { name: 'Zostel Coorg Madikeri', cuisineOrType: 'hostel', cost: 1250, distanceKm: 1.8, address: 'Abbey Falls Approach Road' },
    ],
  },
  kyoto: {
    lat: 35.0116,
    lon: 135.7681,
    dining: [
      { name: 'Kikunoi Honten Kaiseki', cuisineOrType: 'Kaiseki · Seasonal Kyoto', cost: 6500, distanceKm: 1.1, address: 'Higashiyama-ku, Kyoto' },
      { name: 'Gion Tanto Okonomiyaki', cuisineOrType: 'Teppanyaki · Kyoto Style', cost: 2400, distanceKm: 0.8, address: 'Pontocho Alley, Nakagyo' },
      { name: 'Shigetsu Zen Shojin', cuisineOrType: 'Shojin Ryori · Temple Vegan', cost: 3200, distanceKm: 6.4, address: 'Tenryu-ji Grounds, Arashiyama', dietaryTags: ['Pure Vegetarian', 'Vegan'] },
      { name: 'Tsujiri Tea House Gion', cuisineOrType: 'Uji Matcha · Wagashi', cost: 1600, distanceKm: 0.9, address: 'Shijo-dori, Gion', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Nishiki Warai', cuisineOrType: 'Yakisoba · Street Grill', cost: 1800, distanceKm: 0.4, address: 'Nishiki Market Arcade' },
    ],
    stays: [
      { name: 'Hoshinoya Kyoto', cuisineOrType: 'resort', cost: 32000, distanceKm: 7.2, address: 'Arashiyama Riverbank' },
      { name: 'Ace Hotel Kyoto', cuisineOrType: 'hotel', cost: 18500, distanceKm: 0.7, address: 'Karasuma Oike, Nakagyo' },
      { name: 'The Thousand Kyoto', cuisineOrType: 'hotel', cost: 14800, distanceKm: 2.1, address: 'Shimogyo Ward, Kyoto Station' },
      { name: 'Gion Hatanaka Ryokan', cuisineOrType: 'guest_house', cost: 19200, distanceKm: 1.2, address: 'Yasaka Shrine South Gate' },
      { name: 'Piece Hostel Sanjo', cuisineOrType: 'hostel', cost: 3400, distanceKm: 0.5, address: 'Sanjo-dori, Nakagyo' },
    ],
  },
  varanasi: {
    lat: 25.3176,
    lon: 82.9739,
    dining: [
      { name: 'Kashi Chat Bhandar', cuisineOrType: 'Banarasi · Tamatar Chaat', cost: 350, distanceKm: 0.7, address: 'Godowlia Chowk', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Pizzeria Vaatika Cafe', cuisineOrType: 'Woodfired · River View', cost: 850, distanceKm: 1.9, address: 'Assi Ghat Promenade', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Bati Chokha Heritage', cuisineOrType: 'Purvanchal · Clay Oven', cost: 600, distanceKm: 2.2, address: 'Teliyabag Crossing', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Blue Lassi Shop', cuisineOrType: 'Artisan Lassi · Traditional', cost: 280, distanceKm: 1.1, address: 'Kachori Gali, Dashashwamedh', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Brown Bread Bakery', cuisineOrType: 'Organic · Rooftop Cafe', cost: 750, distanceKm: 1.3, address: 'Bangali Tola, Dashashwamedh', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'BrijRama Palace', cuisineOrType: 'hotel', cost: 19500, distanceKm: 1.4, address: 'Darbhanga Ghat' },
      { name: 'Taj Ganges Varanasi', cuisineOrType: 'resort', cost: 14200, distanceKm: 3.1, address: 'Nadesar Palace Grounds' },
      { name: 'Suryauday Haveli', cuisineOrType: 'hotel', cost: 9800, distanceKm: 1.8, address: 'Shivala Ghat' },
      { name: 'Alka Hotel Heritage', cuisineOrType: 'hotel', cost: 4200, distanceKm: 1.2, address: 'Meer Ghat Waterfront' },
      { name: 'Zostel Varanasi', cuisineOrType: 'hostel', cost: 1100, distanceKm: 1.6, address: 'Rathyatra Crossing' },
    ],
  },
  jaipur: {
    lat: 26.9239,
    lon: 75.8267,
    dining: [
      { name: 'Laxmi Misthan Bhandar (LMB)', cuisineOrType: 'Rajasthani · Dal Baati Churma', cost: 900, distanceKm: 0.6, address: 'Johari Bazaar, Pink City', dietaryTags: ['Pure Vegetarian'] },
      { name: '1135 AD Amber Courtyard', cuisineOrType: 'Royal Rajputana · Fine Dining', cost: 2800, distanceKm: 7.4, address: 'Jaleb Chowk, Amer Fort' },
      { name: 'Bar Palladio Jaipur', cuisineOrType: 'Italian · Heritage Pavilion', cost: 2400, distanceKm: 2.5, address: 'Narain Niwas Palace' },
      { name: 'Tapri Central', cuisineOrType: 'Chai · Rajasthani Tapas', cost: 750, distanceKm: 3.1, address: 'Prithviraj Road, C-Scheme', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Peacock Rooftop Restaurant', cuisineOrType: 'North Indian · Tandoor', cost: 1100, distanceKm: 2.8, address: 'Hathroi Fort, Hari Kishan Marg' },
    ],
    stays: [
      { name: 'Rambagh Palace Taj', cuisineOrType: 'resort', cost: 28000, distanceKm: 3.9, address: 'Bhawani Singh Road' },
      { name: 'Samode Haveli', cuisineOrType: 'hotel', cost: 12500, distanceKm: 1.1, address: 'Gangapole, Pink City' },
      { name: 'Pearl Palace Heritage', cuisineOrType: 'guest_house', cost: 4400, distanceKm: 3.2, address: 'Hathroi Fort Road' },
      { name: 'Alsisar Haveli', cuisineOrType: 'hotel', cost: 7900, distanceKm: 2.4, address: 'Sansar Chandra Road' },
      { name: 'Moustache Hostel Jaipur', cuisineOrType: 'hostel', cost: 1050, distanceKm: 2.7, address: 'MI Road, Sindhi Camp' },
    ],
  },
  agra: {
    lat: 27.1751,
    lon: 78.0421,
    dining: [
      { name: 'Pinch of Spice', cuisineOrType: 'Mughlai · North Indian', cost: 1300, distanceKm: 1.8, address: 'Fatehabad Road, Tajganj' },
      { name: 'Peshawri ITC Mughal', cuisineOrType: 'Northwest Frontier · Clay Oven', cost: 3400, distanceKm: 2.1, address: 'Taj Ganj, Fatehabad Road' },
      { name: 'Sheroes Hangout Cafe', cuisineOrType: 'Cafe · Continental & Chai', cost: 550, distanceKm: 1.5, address: 'Fatehabad Road, Agra', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Dasaprakash Agra', cuisineOrType: 'South Indian · Pure Veg', cost: 700, distanceKm: 2.9, address: 'Meher Cinema Complex', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Joney’s Place', cuisineOrType: 'Home-Style Indian · Lassi', cost: 400, distanceKm: 0.7, address: 'Kaserat Bazaar, Tajganj' },
    ],
    stays: [
      { name: 'The Oberoi Amarvilas', cuisineOrType: 'resort', cost: 34000, distanceKm: 0.6, address: 'Taj East Gate Road' },
      { name: 'Taj Hotel & Convention Centre', cuisineOrType: 'hotel', cost: 9600, distanceKm: 1.9, address: 'Taj East Gate Road' },
      { name: 'ITC Mughal Luxury Collection', cuisineOrType: 'resort', cost: 11800, distanceKm: 2.2, address: 'Fatehabad Road' },
      { name: 'Coral Tree Homestay', cuisineOrType: 'guest_house', cost: 3600, distanceKm: 0.8, address: 'Shilpgram Road, Taj East' },
      { name: 'Joey’s Hostel Agra', cuisineOrType: 'hostel', cost: 950, distanceKm: 0.9, address: 'Taj East Gate Sector' },
    ],
  },
  udaipur: {
    lat: 24.5754,
    lon: 73.6808,
    dining: [
      { name: 'Ambrai Waterfront', cuisineOrType: 'Mewari · Lake Pichola View', cost: 1800, distanceKm: 0.5, address: 'Hanuman Ghat, Pichola' },
      { name: 'Upre by 1559 AD', cuisineOrType: 'Rajasthani · Rooftop', cost: 2100, distanceKm: 0.6, address: 'Lake Pichola Hotel Terrace' },
      { name: 'Natraj Dining Hall', cuisineOrType: 'Gujarati & Rajasthani Thali', cost: 650, distanceKm: 1.9, address: 'City Station Road', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Jheel’s Ginger Coffee Bar', cuisineOrType: 'Artisan Coffee · Bakery', cost: 600, distanceKm: 0.4, address: 'Gangaur Ghat Promenade', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Millets of Mewar', cuisineOrType: 'Organic · Gluten-Free & Vegan', cost: 750, distanceKm: 0.7, address: 'Hanuman Ghat Marg', dietaryTags: ['Pure Vegetarian', 'Vegan', 'Gluten-Free'] },
    ],
    stays: [
      { name: 'Taj Lake Palace', cuisineOrType: 'resort', cost: 36000, distanceKm: 0.2, address: 'Pichola Island' },
      { name: 'The Oberoi Udaivilas', cuisineOrType: 'resort', cost: 32000, distanceKm: 1.1, address: 'Haridasji Ki Magri' },
      { name: 'Jagat Niwas Palace', cuisineOrType: 'hotel', cost: 8400, distanceKm: 0.4, address: 'Lal Ghat, Pichola' },
      { name: 'Amet Haveli Heritage', cuisineOrType: 'guest_house', cost: 6200, distanceKm: 0.5, address: 'Outside Chandpole' },
      { name: 'Zostel Udaipur', cuisineOrType: 'hostel', cost: 1100, distanceKm: 0.6, address: 'Chandpole Lakefront' },
    ],
  },
  mysuru: {
    lat: 12.3052,
    lon: 76.6552,
    dining: [
      { name: 'Vinayaka Mylari', cuisineOrType: 'Mysuru · Butter Masala Dosa', cost: 300, distanceKm: 1.2, address: 'Nazarbad Main Road', dietaryTags: ['Pure Vegetarian'] },
      { name: 'RRR Mysuru', cuisineOrType: 'Andhra · Heritage Biryani', cost: 750, distanceKm: 0.8, address: 'Gandhi Square' },
      { name: 'The Old House', cuisineOrType: 'Woodfired Pizza · Cafe', cost: 950, distanceKm: 1.9, address: 'Jhansi Lakshmibai Road', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Oyster Bay', cuisineOrType: 'Coastal & Karnataka Grill', cost: 1200, distanceKm: 2.3, address: 'Vijayanagar 1st Stage' },
      { name: 'Guru Sweet Mart', cuisineOrType: 'Original Mysore Pak · Heritage', cost: 350, distanceKm: 0.5, address: 'Sayyaji Rao Road', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Lalitha Mahal Palace Hotel', cuisineOrType: 'resort', cost: 11500, distanceKm: 4.5, address: 'Lalitha Mahal Road' },
      { name: 'Royal Orchid Metropole', cuisineOrType: 'hotel', cost: 7800, distanceKm: 1.7, address: 'Jhansi Lakshmibai Road' },
      { name: 'Radisson Blu Plaza Mysuru', cuisineOrType: 'hotel', cost: 8600, distanceKm: 2.6, address: 'MG Road, Indiranagar' },
      { name: 'Green Hotel Chittaranjan Palace', cuisineOrType: 'guest_house', cost: 4900, distanceKm: 3.1, address: 'Hunsur Road, Jayalakshmipuram' },
      { name: 'Zostel Mysuru', cuisineOrType: 'hostel', cost: 1000, distanceKm: 2.2, address: 'Gokulam 2nd Stage' },
    ],
  },
  munnar: {
    lat: 10.0889,
    lon: 77.0595,
    dining: [
      { name: 'Saravana Bhavan Munnar', cuisineOrType: 'South Indian · Pure Veg', cost: 450, distanceKm: 0.4, address: 'MG Road, Munnar Town', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Rapsy Restaurant', cuisineOrType: 'Kerala · Appam & Stew', cost: 550, distanceKm: 0.5, address: 'Main Bazaar, Munnar' },
      { name: 'Tea Tales Estate Cafe', cuisineOrType: 'Single-Estate Tea · Bakery', cost: 650, distanceKm: 2.1, address: 'Nullatanni Tea Ridge', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Eastend Silver Spoon', cuisineOrType: 'Malabar · Spice Kitchen', cost: 900, distanceKm: 1.2, address: 'Temple Road, Munnar' },
      { name: 'Guru’s Kitchen', cuisineOrType: 'Kerala Sadhya · Vegetarian', cost: 500, distanceKm: 0.6, address: 'Old Munnar Market', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Windermere Estate', cuisineOrType: 'resort', cost: 13800, distanceKm: 4.4, address: 'Pothamedu Ridge' },
      { name: 'Fragrant Nature Munnar', cuisineOrType: 'resort', cost: 10500, distanceKm: 5.2, address: 'Bison Valley Road' },
      { name: 'Tea County KTDC', cuisineOrType: 'hotel', cost: 5600, distanceKm: 1.1, address: 'Hill Station Ridge' },
      { name: 'Blanket Hotel & Spa', cuisineOrType: 'resort', cost: 9800, distanceKm: 6.1, address: 'Attukad Waterfalls Road' },
      { name: 'Zostel Munnar', cuisineOrType: 'hostel', cost: 1150, distanceKm: 7.5, address: 'Chithirapuram Tea Slopes' },
    ],
  },
  alleppey: {
    lat: 9.4981,
    lon: 76.3388,
    dining: [
      { name: 'Halais Restaurant', cuisineOrType: 'Kerala · Malabar & Karimeen', cost: 750, distanceKm: 0.8, address: 'Mullakkal Road, Alappuzha' },
      { name: 'Cassia Backwater Kitchen', cuisineOrType: 'Coastal Kerala · Grill', cost: 1100, distanceKm: 1.4, address: 'Finishing Point Jetty' },
      { name: 'Indian Coffee House', cuisineOrType: 'Classic Filter Coffee · Snacks', cost: 350, distanceKm: 0.6, address: 'CCNB Road, Alappuzha', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Thaff Delicacy', cuisineOrType: 'Kerala · Appam & Veg Curry', cost: 600, distanceKm: 0.9, address: 'YMCA Bridge Road' },
      { name: 'Dreamers Beach Cafe', cuisineOrType: 'Fresh Bowls · Sunset Deck', cost: 700, distanceKm: 2.3, address: 'Alappuzha Lighthouse Beach' },
    ],
    stays: [
      { name: 'Spice Routes Luxury Kettuvallam', cuisineOrType: 'resort', cost: 14500, distanceKm: 2.5, address: 'Pallathuruthy Backwaters' },
      { name: 'Punnamada Backwater Resort', cuisineOrType: 'resort', cost: 9200, distanceKm: 3.1, address: 'Punnamada Lake' },
      { name: 'Ramada by Wyndham Alleppey', cuisineOrType: 'hotel', cost: 7400, distanceKm: 1.8, address: 'Nehru Trophy Finishing Point' },
      { name: 'Marari Beach CGH Earth', cuisineOrType: 'resort', cost: 16800, distanceKm: 11.2, address: 'Mararikulam Coast' },
      { name: 'Artpackers Life Hostel', cuisineOrType: 'hostel', cost: 950, distanceKm: 1.9, address: 'Sea View Ward, Beach' },
    ],
  },
  leh: {
    lat: 34.1526,
    lon: 77.5771,
    dining: [
      { name: 'Tibetan Kitchen Leh', cuisineOrType: 'Ladakhi · Thukpa & Momos', cost: 750, distanceKm: 0.6, address: 'Fort Road, Leh' },
      { name: 'Bon Appetit Leh', cuisineOrType: 'Himalayan · Woodfired', cost: 1250, distanceKm: 0.9, address: 'Changspa Road' },
      { name: 'Gesmo Restaurant', cuisineOrType: 'Yak Cheese · Bakery', cost: 700, distanceKm: 0.5, address: 'Fort Road Market' },
      { name: 'Tsas by Dolkhar', cuisineOrType: 'Organic Ladakhi · Plant-Forward', cost: 1600, distanceKm: 1.2, address: 'Lower Tukcha Road', dietaryTags: ['Pure Vegetarian', 'Vegan'] },
      { name: 'Lehvenda Cafe', cuisineOrType: 'Sea Buckthorn · Espresso', cost: 550, distanceKm: 0.4, address: 'Main Bazaar Terrace', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'The Grand Dragon Ladakh', cuisineOrType: 'hotel', cost: 14200, distanceKm: 0.9, address: 'Old Road, Sheynam' },
      { name: 'Dolkhar Boutique Resort', cuisineOrType: 'resort', cost: 17500, distanceKm: 1.3, address: 'Lower Tukcha Road' },
      { name: 'Stok Palace Heritage', cuisineOrType: 'hotel', cost: 15800, distanceKm: 13.5, address: 'Stok Village' },
      { name: 'The Zen Ladakh', cuisineOrType: 'hotel', cost: 8200, distanceKm: 1.1, address: 'Fort Road, Leh' },
      { name: 'Zostel Leh', cuisineOrType: 'hostel', cost: 1200, distanceKm: 1.5, address: 'Karzoo, Shanti Stupa Road' },
    ],
  },
  rishikesh: {
    lat: 30.1259,
    lon: 78.3237,
    dining: [
      { name: 'Chotiwala Heritage', cuisineOrType: 'Garhwali · Pure Veg Thali', cost: 550, distanceKm: 0.7, address: 'Swarg Ashram, Ram Jhula', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Little Buddha Cafe', cuisineOrType: 'Himalayan · River Terrace', cost: 750, distanceKm: 0.4, address: 'Lakshman Jhula Walkway', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Beatles Cafe (60s)', cuisineOrType: 'Organic · Herbal Teas', cost: 800, distanceKm: 0.6, address: 'Tapovan Riverfront', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Ganga Beach Restaurant', cuisineOrType: 'North Indian · Pure Veg', cost: 650, distanceKm: 0.5, address: 'Laxman Jhula East Bank', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Tattv Cafe', cuisineOrType: 'Ayurvedic · Smoothie Bowls', cost: 700, distanceKm: 1.1, address: 'Badrinath Road, Tapovan', dietaryTags: ['Pure Vegetarian', 'Vegan'] },
    ],
    stays: [
      { name: 'Taj Rishikesh Resort & Spa', cuisineOrType: 'resort', cost: 24500, distanceKm: 18.0, address: 'Singthali Ganga Bend' },
      { name: 'Aloha on the Ganges', cuisineOrType: 'resort', cost: 8900, distanceKm: 1.2, address: 'Tapovan, NH-58' },
      { name: 'Ganga Kinare Riverside', cuisineOrType: 'hotel', cost: 7600, distanceKm: 3.4, address: 'Veerbhadra Road' },
      { name: 'Divine Resort Laxman Jhula', cuisineOrType: 'hotel', cost: 5800, distanceKm: 0.5, address: 'Tapovan Promenade' },
      { name: 'Zostel Rishikesh Tapovan', cuisineOrType: 'hostel', cost: 1050, distanceKm: 0.8, address: 'Laxman Jhula Road' },
    ],
  },
  goa: {
    lat: 15.4922,
    lon: 73.7734,
    dining: [
      { name: 'Thalassa Greek Taverna', cuisineOrType: 'Mediterranean · Sunset Deck', cost: 2200, distanceKm: 4.8, address: 'Siolim Waterfront' },
      { name: 'Gunpowder Assagao', cuisineOrType: 'Coastal Indian · Heritage', cost: 1700, distanceKm: 6.2, address: 'Saunto Vaddo, Assagao' },
      { name: 'Artjuna Garden Cafe', cuisineOrType: 'Artisan Bakery · Vegan Bowls', cost: 900, distanceKm: 5.9, address: 'Monteiro Vaddo, Anjuna', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Fisherman’s Wharf Panjim', cuisineOrType: 'Goan · Riverside Grill', cost: 1600, distanceKm: 7.5, address: 'Campal, Panjim' },
      { name: 'Navtara Veg Goa', cuisineOrType: 'Goan & South Indian · Pure Veg', cost: 450, distanceKm: 3.4, address: 'Calangute Circle', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Taj Fort Aguada Resort', cuisineOrType: 'resort', cost: 18500, distanceKm: 0.7, address: 'Sinquerim Beachfront' },
      { name: 'W Goa Vagator', cuisineOrType: 'resort', cost: 22000, distanceKm: 7.4, address: 'Vagator Cliff' },
      { name: 'Ahilya by the Sea', cuisineOrType: 'hotel', cost: 14200, distanceKm: 2.1, address: 'Coco Beach, Nerul' },
      { name: 'The Postcard Velha', cuisineOrType: 'hotel', cost: 12800, distanceKm: 9.8, address: 'Old Goa Heritage' },
      { name: 'Zostel Goa Anjuna', cuisineOrType: 'hostel', cost: 1250, distanceKm: 6.1, address: 'Anjuna Beach Road' },
    ],
  },
  konark: {
    lat: 19.8876,
    lon: 86.0945,
    dining: [
      { name: 'OTDC Panthanivas Kitchen', cuisineOrType: 'Odia · Dalma & Temple Thali', cost: 500, distanceKm: 0.4, address: 'Konark Ring Road', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Chandrabhaga Beach Grill', cuisineOrType: 'Coastal Odia · Fresh Catch', cost: 750, distanceKm: 2.9, address: 'Marine Drive, Chandrabhaga' },
      { name: 'Kaveri Heritage Dining', cuisineOrType: 'East Indian · Pure Veg', cost: 480, distanceKm: 0.8, address: 'Konark Bazaar', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Lotus Eco Kitchen', cuisineOrType: 'Organic · Coastal Garden', cost: 950, distanceKm: 4.1, address: 'Ramchandi Estuary' },
      { name: 'Sun Temple Chai & Sweets', cuisineOrType: 'Chhena Poda · Snacks', cost: 280, distanceKm: 0.3, address: 'East Gate Promenade', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Lotus Eco Beach Resort', cuisineOrType: 'resort', cost: 6400, distanceKm: 4.2, address: 'Ramchandi Marine Drive' },
      { name: 'Toshali Sands Nature Escape', cuisineOrType: 'resort', cost: 7200, distanceKm: 8.5, address: 'Konark-Puri Marine Drive' },
      { name: 'Mayfair Heritage Puri', cuisineOrType: 'resort', cost: 11500, distanceKm: 18.0, address: 'Chakratirtha Road' },
      { name: 'Panthanivas Konark', cuisineOrType: 'hotel', cost: 3100, distanceKm: 0.5, address: 'Sun Temple Approach' },
      { name: 'Sun Temple Heritage Lodge', cuisineOrType: 'guest_house', cost: 2200, distanceKm: 0.7, address: 'Konark Market Road' },
    ],
  },
  darjeeling: {
    lat: 27.041,
    lon: 88.2663,
    dining: [
      { name: 'Glenary’s Bakery & Cafe', cuisineOrType: 'Colonial Bakery · Darjeeling Tea', cost: 850, distanceKm: 0.4, address: 'Nehru Road, Mall' },
      { name: 'Keventers Terrace', cuisineOrType: 'Himalayan Breakfast · Views', cost: 750, distanceKm: 0.5, address: 'Nehru Road, Chowrasta' },
      { name: 'Kunga Restaurant', cuisineOrType: 'Tibetan · Momos & Thukpa', cost: 550, distanceKm: 0.6, address: 'Gandhi Road, Darjeeling' },
      { name: 'Sonam’s Kitchen', cuisineOrType: 'Pancakes · Mountain Cafe', cost: 600, distanceKm: 0.7, address: 'Zakir Hussain Road', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Nathmull’s Tea Room', cuisineOrType: 'First-Flush Tea Tasting', cost: 500, distanceKm: 0.3, address: 'Laden La Road', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Mayfair Hill Resort', cuisineOrType: 'resort', cost: 13500, distanceKm: 0.8, address: 'Opposite Governor House' },
      { name: 'Windamere Hotel Heritage', cuisineOrType: 'hotel', cost: 12200, distanceKm: 0.5, address: 'Observatory Hill' },
      { name: 'Elgin Darjeeling', cuisineOrType: 'hotel', cost: 10800, distanceKm: 0.6, address: 'HD Lama Road' },
      { name: 'Cedar Inn Ridge', cuisineOrType: 'hotel', cost: 6900, distanceKm: 1.2, address: 'Jalapahar Road' },
      { name: 'Zostel Darjeeling', cuisineOrType: 'hostel', cost: 1150, distanceKm: 1.4, address: 'Gandhi Road Slope' },
    ],
  },
  kochi: {
    lat: 9.9658,
    lon: 76.2421,
    dining: [
      { name: 'Kashi Art Cafe', cuisineOrType: 'Artisan Cafe · Kerala Fusion', cost: 900, distanceKm: 0.4, address: 'Burger Street, Fort Kochi' },
      { name: 'Fusion Bay Fort Kochi', cuisineOrType: 'Malabar · Coastal Grill', cost: 1100, distanceKm: 0.3, address: 'Santa Cruz Basilica Road' },
      { name: 'Teapot Cafe', cuisineOrType: 'Tea & Spices · Colonial Courtyard', cost: 750, distanceKm: 0.5, address: 'Peter Celli Street', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Kayees Rahmathulla Cafe', cuisineOrType: 'Kochi · Mutton & Veg Biryani', cost: 650, distanceKm: 1.9, address: 'Mattancherry Bazaar' },
      { name: 'Pepper House Courtyard', cuisineOrType: 'Organic · Waterfront Cafe', cost: 850, distanceKm: 0.7, address: 'Kalvathy Road, Fort Kochi' },
    ],
    stays: [
      { name: 'Brunton Boatyard CGH Earth', cuisineOrType: 'resort', cost: 15800, distanceKm: 0.6, address: 'Calvetty Road, Fort Kochi' },
      { name: 'Taj Malabar Resort & Spa', cuisineOrType: 'resort', cost: 16200, distanceKm: 3.1, address: 'Willingdon Island' },
      { name: 'Forte Kochi Heritage', cuisineOrType: 'hotel', cost: 10400, distanceKm: 0.4, address: 'Princess Street' },
      { name: 'Old Harbour Hotel', cuisineOrType: 'hotel', cost: 9600, distanceKm: 0.3, address: 'Tower Road, Fort Kochi' },
      { name: 'Zostel Kochi', cuisineOrType: 'hostel', cost: 1050, distanceKm: 0.5, address: 'Napier Street, Fort Kochi' },
    ],
  },
  paris: {
    lat: 48.8584,
    lon: 2.2945,
    dining: [
      { name: 'Le Jules Verne (2nd Deck)', cuisineOrType: 'French Gastronomy · Eiffel View', cost: 18500, distanceKm: 0.1, address: 'Champ de Mars, 7th Arr.' },
      { name: 'Cafe de Flore', cuisineOrType: 'Classic Parisian Bistro', cost: 4200, distanceKm: 2.8, address: 'Boulevard Saint-Germain' },
      { name: 'L’As du Fallafel', cuisineOrType: 'Mediterranean · Marais', cost: 1800, distanceKm: 4.5, address: 'Rue des Rosiers, Le Marais', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Bouillon Chartier', cuisineOrType: 'Historic French Brasserie', cost: 2600, distanceKm: 4.1, address: 'Rue du Faubourg Montmartre' },
      { name: 'Poilane Bakery & Tartines', cuisineOrType: 'Sourdough · Artisan Pastry', cost: 1500, distanceKm: 2.4, address: 'Rue du Cherche-Midi', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Shangri-La Paris', cuisineOrType: 'hotel', cost: 48000, distanceKm: 0.7, address: '10 Avenue d’Iena, 16th Arr.' },
      { name: 'Hotel Le Walt', cuisineOrType: 'hotel', cost: 22000, distanceKm: 0.9, address: 'Avenue de la Motte-Picquet' },
      { name: 'Hotel Cler', cuisineOrType: 'hotel', cost: 16500, distanceKm: 0.8, address: 'Rue Cler, 7th Arr.' },
      { name: 'CitizenM Gare de Lyon', cuisineOrType: 'hotel', cost: 13500, distanceKm: 5.2, address: 'Rue de Van Gogh, 12th Arr.' },
      { name: 'The People Paris Marais', cuisineOrType: 'hostel', cost: 4200, distanceKm: 4.3, address: 'Boulevard Morland' },
    ],
  },
  singapore: {
    lat: 1.2834,
    lon: 103.8607,
    dining: [
      { name: 'Lau Pa Sat Hawker Hall', cuisineOrType: 'Singaporean · Satay & Laksa', cost: 1400, distanceKm: 1.1, address: '18 Raffles Quay' },
      { name: 'CE LA VI SkyPark', cuisineOrType: 'Modern Asian · SkyDeck', cost: 6800, distanceKm: 0.1, address: 'Marina Bay Sands Tower 3' },
      { name: 'Komala Vilas Little India', cuisineOrType: 'South Indian · Pure Veg', cost: 1100, distanceKm: 3.1, address: '76 Serangoon Road', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Maxwell Food Centre', cuisineOrType: 'Hawker Heritage · Hainanese', cost: 950, distanceKm: 1.7, address: '1 Kadayanallur Street' },
      { name: 'PS.Cafe Harding Road', cuisineOrType: 'Botanical Bistro · Truffle Fries', cost: 3400, distanceKm: 5.4, address: 'Dempsey Hill' },
    ],
    stays: [
      { name: 'Marina Bay Sands', cuisineOrType: 'resort', cost: 42000, distanceKm: 0.1, address: '10 Bayfront Avenue' },
      { name: 'The Fullerton Hotel', cuisineOrType: 'hotel', cost: 26500, distanceKm: 0.9, address: '1 Fullerton Square' },
      { name: 'PARKROYAL COLLECTION Pickering', cuisineOrType: 'hotel', cost: 21000, distanceKm: 1.6, address: '3 Upper Pickering Street' },
      { name: 'Hotel Mono Chinatown', cuisineOrType: 'hotel', cost: 11800, distanceKm: 1.8, address: '18 Mosque Street' },
      { name: 'LYF Funan Singapore', cuisineOrType: 'hostel', cost: 8900, distanceKm: 1.4, address: '67 Hill Street' },
    ],
  },
  amritsar: {
    lat: 31.6200,
    lon: 74.8765,
    dining: [
      { name: 'Kesar Da Dhaba', cuisineOrType: 'restaurant', distanceKm: 0.9, cost: 550, address: 'Chowk Passian', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Bharawan Da Dhaba', cuisineOrType: 'restaurant', distanceKm: 0.6, cost: 650, address: 'Town Hall Rd', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Brother’s Amritsari Dhaba', cuisineOrType: 'restaurant', distanceKm: 0.7, cost: 600, address: 'Hall Bazaar', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Gian Chand Lassi', cuisineOrType: 'cafe', distanceKm: 0.5, cost: 220, address: 'Regent Cinema Rd', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Beera Chicken House', cuisineOrType: 'restaurant', distanceKm: 2.8, cost: 850, address: 'Majitha Road', dietaryTags: [] },
    ],
    stays: [
      { name: 'Taj Swarna Amritsar', cuisineOrType: 'hotel', distanceKm: 4.5, cost: 11500, address: 'Outer Circular Rd' },
      { name: 'Hyatt Regency Amritsar', cuisineOrType: 'hotel', distanceKm: 3.8, cost: 9200, address: 'GT Road' },
      { name: 'Ranjit’s Svaasa Heritage', cuisineOrType: 'resort', distanceKm: 3.1, cost: 8800, address: 'Mall Road' },
      { name: 'Ramada Encore Hall Gate', cuisineOrType: 'hotel', distanceKm: 0.8, cost: 4800, address: 'Hall Gate' },
      { name: 'Sarovar Residency', cuisineOrType: 'guest_house', distanceKm: 0.4, cost: 2900, address: 'Heritage Street' },
    ],
  },
  khajuraho: {
    lat: 24.8530,
    lon: 79.9196,
    dining: [
      { name: 'Raja Cafe Courtyard', cuisineOrType: 'cafe', distanceKm: 0.3, cost: 600, address: 'Opposite Western Group', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Madras Coffee House', cuisineOrType: 'restaurant', distanceKm: 0.4, cost: 420, address: 'Temple Road', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Bella Italia Khajuraho', cuisineOrType: 'restaurant', distanceKm: 0.8, cost: 850, address: 'Jain Temple Rd', dietaryTags: ['Vegetarian'] },
      { name: 'Bundeli Rasoi', cuisineOrType: 'restaurant', distanceKm: 1.2, cost: 550, address: 'Sevagram', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Badri Seth Marwari Bhoj', cuisineOrType: 'restaurant', distanceKm: 0.5, cost: 380, address: 'Main Market', dietaryTags: ['Pure Vegetarian', 'Jain Vegetarian'] },
    ],
    stays: [
      { name: 'The Lalit Temple View', cuisineOrType: 'resort', distanceKm: 0.5, cost: 9500, address: 'Western Group Rd' },
      { name: 'Radisson Jass Hotel', cuisineOrType: 'hotel', distanceKm: 1.8, cost: 6200, address: 'Bypass Road' },
      { name: 'Clarks Khajuraho', cuisineOrType: 'hotel', distanceKm: 2.1, cost: 5400, address: 'Airport Road' },
      { name: 'Syna Heritage Hotel', cuisineOrType: 'hotel', distanceKm: 1.4, cost: 4600, address: 'Circuit House Rd' },
      { name: 'Zostel Khajuraho', cuisineOrType: 'hostel', distanceKm: 0.9, cost: 1600, address: 'Sevagram' },
    ],
  },
  jaisalmer: {
    lat: 26.9124,
    lon: 70.9125,
    dining: [
      { name: 'Trio Fort View', cuisineOrType: 'restaurant', distanceKm: 0.4, cost: 950, address: 'Gandhi Chowk', dietaryTags: ['Vegetarian'] },
      { name: 'Saffron & Sand Rooftop', cuisineOrType: 'restaurant', distanceKm: 0.3, cost: 800, address: 'Fort Bastion Rd', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Jaisal Italy', cuisineOrType: 'cafe', distanceKm: 0.2, cost: 750, address: 'Fort Rampart', dietaryTags: ['Vegetarian'] },
      { name: 'Milan Vegetarian Dining', cuisineOrType: 'restaurant', distanceKm: 0.7, cost: 500, address: 'Hanuman Circle', dietaryTags: ['Pure Vegetarian', 'Jain Vegetarian'] },
      { name: '1st Gate Home Fusion', cuisineOrType: 'restaurant', distanceKm: 0.5, cost: 1100, address: 'Fort Gate', dietaryTags: ['Vegetarian'] },
    ],
    stays: [
      { name: 'Suryagarh Jaisalmer', cuisineOrType: 'resort', distanceKm: 14.0, cost: 24000, address: 'Kahala Phata, Sam Rd' },
      { name: 'Jaisalmer Marriott Resort', cuisineOrType: 'resort', distanceKm: 2.2, cost: 12500, address: 'Jaisalmer–Sam Link' },
      { name: 'Hotel Pleasant Haveli', cuisineOrType: 'hotel', distanceKm: 0.6, cost: 4200, address: 'Chainpura Street' },
      { name: 'Shahi Palace Rooftop', cuisineOrType: 'guest_house', distanceKm: 0.4, cost: 2800, address: 'Shiv Road' },
      { name: 'Sam Desert Heritage Camp', cuisineOrType: 'resort', distanceKm: 38.0, cost: 6500, address: 'Sam Sand Dunes' },
    ],
  },
  ooty: {
    lat: 11.4046,
    lon: 76.6970,
    dining: [
      { name: 'Earl’s Secret Garden', cuisineOrType: 'restaurant', distanceKm: 1.5, cost: 1150, address: 'Havelock Road', dietaryTags: ['Vegetarian'] },
      { name: 'Nahar’s Sidewalk Cafe', cuisineOrType: 'cafe', distanceKm: 0.8, cost: 650, address: 'Charing Cross', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Shinkow’s Nilgiri Kitchen', cuisineOrType: 'restaurant', distanceKm: 1.1, cost: 850, address: 'Commissioner Rd', dietaryTags: [] },
      { name: 'Place To Bee', cuisineOrType: 'cafe', distanceKm: 1.9, cost: 900, address: 'Club Road', dietaryTags: ['Vegetarian'] },
      { name: 'Adyar Ananda Bhavan Ooty', cuisineOrType: 'restaurant', distanceKm: 0.7, cost: 450, address: 'Commercial Rd', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Savoy Ooty IHCL SeleQtions', cuisineOrType: 'resort', distanceKm: 1.6, cost: 14500, address: 'Sylks Road' },
      { name: 'Gem Park Ooty', cuisineOrType: 'hotel', distanceKm: 2.1, cost: 7200, address: 'Sheddon Road' },
      { name: 'Sterling Ooty Fern Hill', cuisineOrType: 'resort', distanceKm: 2.4, cost: 6800, address: 'Kundah House Rd' },
      { name: 'Sinclairs Retreat Ooty', cuisineOrType: 'resort', distanceKm: 3.1, cost: 5900, address: 'Gorishola Rd' },
      { name: 'Tea Nest Coonoor Ridge', cuisineOrType: 'guest_house', distanceKm: 14.0, cost: 5200, address: 'Singara Estate' },
    ],
  },
  shillong: {
    lat: 25.5733,
    lon: 91.8878,
    dining: [
      { name: 'Trattoria Khasi Kitchen', cuisineOrType: 'restaurant', distanceKm: 0.5, cost: 600, address: 'Police Bazaar', dietaryTags: [] },
      { name: 'Dylan’s Cafe Shillong', cuisineOrType: 'cafe', distanceKm: 1.6, cost: 850, address: 'Rynjah', dietaryTags: ['Vegetarian'] },
      { name: 'Cafe Shillong Heritage', cuisineOrType: 'cafe', distanceKm: 1.2, cost: 950, address: 'Laitumkhrah', dietaryTags: ['Vegetarian'] },
      { name: 'City Hut Family Dhaba', cuisineOrType: 'restaurant', distanceKm: 0.8, cost: 750, address: 'Earle Holiday Home', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Jadoh Traditional Stall', cuisineOrType: 'restaurant', distanceKm: 0.9, cost: 450, address: 'Bara Bazaar', dietaryTags: [] },
    ],
    stays: [
      { name: 'Vivanta Meghalaya Shillong', cuisineOrType: 'hotel', distanceKm: 0.6, cost: 11800, address: 'Police Bazaar' },
      { name: 'Ri Kynjai Serenity', cuisineOrType: 'resort', distanceKm: 15.0, cost: 13500, address: 'Umiam Lake' },
      { name: 'The Heritage Club Tripod', cuisineOrType: 'guest_house', distanceKm: 1.8, cost: 6400, address: 'Laitumkhrah' },
      { name: 'Hotel Polo Towers', cuisineOrType: 'hotel', distanceKm: 0.9, cost: 5800, address: 'Oakland Rd' },
      { name: 'Aerodene Cottage', cuisineOrType: 'guest_house', distanceKm: 2.3, cost: 4200, address: 'Nongrim Hills' },
    ],
  },
  kanyakumari: {
    lat: 8.0780,
    lon: 77.5511,
    dining: [
      { name: 'The Ocean Restaurant', cuisineOrType: 'restaurant', distanceKm: 0.6, cost: 700, address: 'Sannathi Street', dietaryTags: ['Vegetarian'] },
      { name: 'Saravana Bhavan Cape', cuisineOrType: 'restaurant', distanceKm: 0.5, cost: 420, address: 'Main Road', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Triveni Seafood Terrace', cuisineOrType: 'restaurant', distanceKm: 0.8, cost: 850, address: 'Beach Road', dietaryTags: [] },
      { name: 'Sangam Filter Coffee Bar', cuisineOrType: 'cafe', distanceKm: 0.3, cost: 250, address: 'Sunrise Point', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Zam Zam Coastal Grill', cuisineOrType: 'restaurant', distanceKm: 1.1, cost: 650, address: 'Kovalam Rd', dietaryTags: ['Halal'] },
    ],
    stays: [
      { name: 'Annai Resorts & Spa', cuisineOrType: 'resort', distanceKm: 1.2, cost: 6800, address: 'Kovalam Road' },
      { name: 'Sparsa Resort Kanyakumari', cuisineOrType: 'resort', distanceKm: 1.6, cost: 5900, address: 'Beach Road' },
      { name: 'Hotel Sea View Cape', cuisineOrType: 'hotel', distanceKm: 0.4, cost: 4100, address: 'East Car Street' },
      { name: 'Vivekananda Kendra Guest House', cuisineOrType: 'guest_house', distanceKm: 0.9, cost: 2400, address: 'Vivekanandapuram' },
      { name: 'Tri-Sea Residency', cuisineOrType: 'hotel', distanceKm: 0.7, cost: 3200, address: 'Sannathi Street' },
    ],
  },
  mahabalipuram: {
    lat: 12.6165,
    lon: 80.1993,
    dining: [
      { name: 'Moonrakers Shore Kitchen', cuisineOrType: 'restaurant', distanceKm: 0.4, cost: 950, address: 'Othavadai Street', dietaryTags: [] },
      { name: 'Wharf 2.0 Radisson', cuisineOrType: 'restaurant', distanceKm: 1.4, cost: 2200, address: 'ECR Shore', dietaryTags: ['Vegetarian'] },
      { name: 'Gecko Cafe Mahabs', cuisineOrType: 'cafe', distanceKm: 0.5, cost: 650, address: 'Othavadai Cross', dietaryTags: ['Vegetarian'] },
      { name: 'Adyar Ananda Bhavan ECR', cuisineOrType: 'restaurant', distanceKm: 1.1, cost: 450, address: 'East Raja St', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Le Yogi Bistro', cuisineOrType: 'cafe', distanceKm: 0.6, cost: 750, address: 'Beach Road', dietaryTags: ['Vegan'] },
    ],
    stays: [
      { name: 'Taj Fisherman’s Cove', cuisineOrType: 'resort', distanceKm: 16.0, cost: 19500, address: 'Covelong Beach' },
      { name: 'Radisson Blu Resort Temple Bay', cuisineOrType: 'resort', distanceKm: 1.5, cost: 13500, address: 'Kovalam Road' },
      { name: 'InterContinental Chennai Mahabalipuram', cuisineOrType: 'resort', distanceKm: 6.5, cost: 15500, address: 'ECR Nemmeli' },
      { name: 'Chariot Beach Resort', cuisineOrType: 'resort', distanceKm: 2.2, cost: 6800, address: 'Five Rathas Rd' },
      { name: 'Daphne Shore Stay', cuisineOrType: 'guest_house', distanceKm: 0.5, cost: 3100, address: 'Othavadai St' },
    ],
  },
  rameswaram: {
    lat: 9.2881,
    lon: 79.3174,
    dining: [
      { name: 'Ahaan Temple Dining', cuisineOrType: 'restaurant', distanceKm: 1.8, cost: 750, address: 'Madurai Highway', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Sri Saravana Bhavan', cuisineOrType: 'restaurant', distanceKm: 0.3, cost: 380, address: 'West Car Street', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Nattukottai Chettinad Mess', cuisineOrType: 'restaurant', distanceKm: 0.5, cost: 450, address: 'East Car Street', dietaryTags: ['Pure Vegetarian'] },
      { name: 'Rameswaram Fishermen’s Pier', cuisineOrType: 'restaurant', distanceKm: 1.4, cost: 700, address: 'Olaikuda Road', dietaryTags: [] },
      { name: 'Kaveri Tiffin & Filter Coffee', cuisineOrType: 'cafe', distanceKm: 0.4, cost: 240, address: 'South Car Street', dietaryTags: ['Pure Vegetarian'] },
    ],
    stays: [
      { name: 'Daiwik Hotels Rameswaram', cuisineOrType: 'hotel', distanceKm: 1.9, cost: 5800, address: 'Madurai–Rameswaram Rd' },
      { name: 'Hyatt Place Rameswaram', cuisineOrType: 'hotel', distanceKm: 2.4, cost: 7400, address: 'NH-87' },
      { name: 'Jiwan Residency', cuisineOrType: 'hotel', distanceKm: 0.5, cost: 3200, address: 'East Car Street' },
      { name: 'Hotel Pearl Residency', cuisineOrType: 'hotel', distanceKm: 1.1, cost: 3600, address: 'Railway Station Rd' },
      { name: 'Kathadi North Kite Camp', cuisineOrType: 'guest_house', distanceKm: 7.5, cost: 4400, address: 'Pamban Coast' },
    ],
  },
  london: {
    lat: 51.5007,
    lon: -0.1246,
    dining: [
      { name: 'Dishoom Covent Garden', cuisineOrType: 'restaurant', distanceKm: 1.4, cost: 4200, address: '12 Upper St Martin’s Ln', dietaryTags: ['Vegetarian', 'Halal'] },
      { name: 'Borough Market Artisanal Hall', cuisineOrType: 'restaurant', distanceKm: 2.8, cost: 2800, address: '8 Southwark St', dietaryTags: ['Vegetarian', 'Vegan'] },
      { name: 'Monmouth Coffee Company', cuisineOrType: 'cafe', distanceKm: 1.3, cost: 1100, address: '27 Monmouth St', dietaryTags: ['Vegan'] },
      { name: 'Mildreds Soho Plant Kitchen', cuisineOrType: 'restaurant', distanceKm: 1.6, cost: 3400, address: '45 Lexington St', dietaryTags: ['Pure Vegetarian', 'Vegan'] },
      { name: 'The Regency Cafe', cuisineOrType: 'cafe', distanceKm: 0.9, cost: 1900, address: '17 Regency St', dietaryTags: [] },
    ],
    stays: [
      { name: 'The Savoy London', cuisineOrType: 'hotel', distanceKm: 1.2, cost: 48000, address: 'Strand, WC2R' },
      { name: 'Sea Containers London', cuisineOrType: 'hotel', distanceKm: 1.7, cost: 26000, address: '20 Upper Ground' },
      { name: 'CitizenM Tower of London', cuisineOrType: 'hotel', distanceKm: 3.9, cost: 18500, address: '40 Trinity Square' },
      { name: 'The Hoxton Southwark', cuisineOrType: 'hotel', distanceKm: 2.1, cost: 21000, address: '40 Blackfriars Rd' },
      { name: 'Z Hotel Trafalgar', cuisineOrType: 'hotel', distanceKm: 0.9, cost: 13500, address: 'Chandos Place' },
    ],
  },
  tokyo: {
    lat: 35.7101,
    lon: 139.8107,
    dining: [
      { name: 'T’s TanTan Ueno Station', cuisineOrType: 'restaurant', distanceKm: 3.1, cost: 1400, address: 'Ecute Ueno', dietaryTags: ['Pure Vegetarian', 'Vegan'] },
      { name: 'Asakusa Imahan Sukiyaki', cuisineOrType: 'restaurant', distanceKm: 1.4, cost: 6200, address: 'Nishi-Asakusa', dietaryTags: [] },
      { name: 'Koffee Mameya Omotesando', cuisineOrType: 'cafe', distanceKm: 10.5, cost: 1200, address: 'Jingumae, Shibuya', dietaryTags: ['Vegan'] },
      { name: 'Ain Soph. Ginza', cuisineOrType: 'restaurant', distanceKm: 6.2, cost: 2800, address: '4-12-1 Ginza', dietaryTags: ['Pure Vegetarian', 'Vegan'] },
      { name: 'Tsukiji Outer Market Donburi', cuisineOrType: 'restaurant', distanceKm: 6.8, cost: 2400, address: 'Tsukiji, Chuo', dietaryTags: [] },
    ],
    stays: [
      { name: 'Aman Tokyo Otemachi', cuisineOrType: 'hotel', distanceKm: 5.8, cost: 68000, address: 'Otemachi Tower' },
      { name: 'Hoshinoya Tokyo', cuisineOrType: 'hotel', distanceKm: 5.5, cost: 52000, address: 'Otemachi, Chiyoda' },
      { name: 'Trunk Hotel Yoyogi Park', cuisineOrType: 'hotel', distanceKm: 11.2, cost: 29000, address: 'Tomigaya, Shibuya' },
      { name: 'Richmond Hotel Premier Asakusa', cuisineOrType: 'hotel', distanceKm: 1.5, cost: 12500, address: 'Asakusa, Taito' },
      { name: 'K5 Kabutocho Boutique', cuisineOrType: 'hotel', distanceKm: 4.9, cost: 21000, address: 'Nihonbashi Kabutocho' },
    ],
  },
};

export function getCuratedRegionalDining(destinationId: string): DiningOption[] {
  const entry = REGIONAL_DIRECTORY[destinationId] ?? REGIONAL_DIRECTORY.hampi;
  return entry.dining.map((item, idx) => ({
    id: `reg-din-${destinationId}-${idx + 1}`,
    name: item.name,
    cuisine: item.cuisineOrType,
    distanceKm: item.distanceKm,
    costForTwo: item.cost,
    dietaryTags: (item.dietaryTags || []) as DiningOption['dietaryTags'],
    allergenFlags: item.allergenFlags || [],
    isVerifiedSafe: (item.allergenFlags || []).length === 0,
    rating: 4.6,
    address: item.address,
    kind: 'dining',
    categoryTag: 'restaurant',
    lat: entry.lat + idx * 0.0022,
    lon: entry.lon + idx * 0.0022,
    isOsmDietVerified: (item.dietaryTags || []).length > 0,
    osmVerifiedTags: item.dietaryTags || [],
    heuristicNotes: ['Curated Regional Directory'],
    costSource: 'regional_directory',
    source: 'regional_directory',
  }));
}

export function getCuratedRegionalStays(destinationId: string): PlaceItemApi[] {
  const entry = REGIONAL_DIRECTORY[destinationId] ?? REGIONAL_DIRECTORY.hampi;
  return entry.stays.map((item, idx) => ({
    id: `reg-stay-${destinationId}-${idx + 1}`,
    name: item.name,
    kind: 'stay',
    category_tag: item.cuisineOrType,
    cuisine: item.cuisineOrType.replace('_', ' ').toUpperCase(),
    distance_km: item.distanceKm,
    lat: entry.lat - idx * 0.0025,
    lon: entry.lon + idx * 0.0025,
    address: item.address,
    estimated_cost_for_two: item.cost,
    cost_source: 'regional_directory',
    osm_verified_tags: [],
    heuristic_notes: ['Curated Regional Directory'],
    allergen_warnings: [],
    is_osm_diet_verified: false,
    matches_diet_filter: true,
    within_budget: true,
    source: 'regional_directory',
  }));
}
