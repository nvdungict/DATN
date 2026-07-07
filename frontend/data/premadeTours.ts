export type PremadeTour = {
  id: string;
  title: string;
  destination: string;
  duration_days: number;
  budget_level: string;
  cover_image: string;
  category: string;
  overview: string;
  highlights: string[];
  itinerary: {
    day_number: number;
    start_time: string;
    end_time: string;
    activity: string;
    location: string;
    cost_estimate: number;
    notes: string;
  }[];
};

export const PREMADE_TOURS: PremadeTour[] = [
  {
    id: "tour-001",
    title: "Hanoi Street Food & Culture Immersion",
    destination: "Hanoi, Vietnam",
    duration_days: 2,
    budget_level: "Relaxed",
    cover_image: "/destinations/hanoi.jpg",
    category: "Culture",
    overview: "A rapid 2-day deep dive into the culinary and historical heart of Vietnam. Taste the best Pho, Banh Mi, and Egg Coffee in the bustling streets of the Old Quarter while visiting iconic landmarks.",
    highlights: ["Old Quarter Walking Tour", "Authentic Pho & Bun Cha", "Egg Coffee Experience", "Hoan Kiem Lake", "Temple of Literature"],
    itinerary: [
      { day_number: 1, start_time: "08:00:00", end_time: "09:00:00", activity: "Breakfast at Pho Bat Dan", location: "Old Quarter", cost_estimate: 50000, notes: "Famous traditional beef noodle soup. Expect a queue." },
      { day_number: 1, start_time: "09:30:00", end_time: "11:30:00", activity: "Hoan Kiem Lake & Ngoc Son Temple", location: "Hoan Kiem", cost_estimate: 30000, notes: "Stroll around the lake and cross the red wooden bridge." },
      { day_number: 1, start_time: "12:00:00", end_time: "13:30:00", activity: "Lunch at Bun Cha Huong Lien", location: "Hai Ba Trung", cost_estimate: 85000, notes: "The Obama combo is highly recommended!" },
      { day_number: 1, start_time: "14:00:00", end_time: "16:00:00", activity: "Temple of Literature", location: "Dong Da", cost_estimate: 30000, notes: "Vietnam's first national university. Great for photos." },
      { day_number: 1, start_time: "16:30:00", end_time: "17:30:00", activity: "Egg Coffee at Cafe Giang", location: "Old Quarter", cost_estimate: 35000, notes: "The legendary original egg coffee. A must-try." },
      { day_number: 1, start_time: "19:00:00", end_time: "20:30:00", activity: "Dinner at Cha Ca La Vong", location: "Old Quarter", cost_estimate: 150000, notes: "Turmeric fish with dill and noodles cooked at your table." },
      { day_number: 1, start_time: "21:00:00", end_time: "22:30:00", activity: "Ta Hien Beer Street", location: "Old Quarter", cost_estimate: 100000, notes: "Bia hoi, street snacks, and lively nightlife atmosphere." },
      
      { day_number: 2, start_time: "08:30:00", end_time: "09:30:00", activity: "Banh Mi 25 & Vietnamese Iced Coffee", location: "Old Quarter", cost_estimate: 60000, notes: "Grab a quick and delicious banh mi before exploring." },
      { day_number: 2, start_time: "10:00:00", end_time: "12:00:00", activity: "Ho Chi Minh Mausoleum Complex", location: "Ba Dinh", cost_estimate: 40000, notes: "Respectful attire required (no shorts or sleeveless shirts)." },
      { day_number: 2, start_time: "12:30:00", end_time: "14:00:00", activity: "Lunch at Xoi Yen", location: "Old Quarter", cost_estimate: 50000, notes: "Hearty sticky rice with various savory toppings." },
      { day_number: 2, start_time: "14:30:00", end_time: "16:30:00", activity: "Dong Xuan Market & Souvenir Shopping", location: "Dong Xuan", cost_estimate: 200000, notes: "Practice your bargaining skills for souvenirs and clothes." },
      { day_number: 2, start_time: "18:00:00", end_time: "21:00:00", activity: "Street Food Walking Tour", location: "Old Quarter", cost_estimate: 300000, notes: "Try Nem Chua Ran, Banh Xeo, and Che dessert with a local guide." }
    ]
  },
  {
    id: "tour-002",
    title: "Classic Paris Escapade",
    destination: "Paris, France",
    duration_days: 3,
    budget_level: "Premium",
    cover_image: "/destinations/paris.jpg",
    category: "City",
    overview: "Experience the timeless romance of Paris in this curated 3-day getaway. From the iconic Eiffel Tower to the artistic haven of Montmartre, this tour hits all the must-see spots.",
    highlights: ["Eiffel Tower Sunset", "Louvre Museum", "Seine River Cruise", "Montmartre", "Notre-Dame & Marais"],
    itinerary: [
      { day_number: 1, start_time: "08:30:00", end_time: "09:30:00", activity: "Café au Lait & Croissants", location: "Café de Flore", cost_estimate: 400000, notes: "Start the day like a true Parisian." },
      { day_number: 1, start_time: "10:00:00", end_time: "13:00:00", activity: "Eiffel Tower Ascent", location: "Eiffel Tower", cost_estimate: 750000, notes: "Pre-book tickets to the summit to avoid lines." },
      { day_number: 1, start_time: "13:30:00", end_time: "15:00:00", activity: "Lunch at Le Jules Verne", location: "Eiffel Tower", cost_estimate: 3500000, notes: "Luxury dining with a view." },
      { day_number: 1, start_time: "16:00:00", end_time: "18:00:00", activity: "Seine River Cruise", location: "Port de la Bourdonnais", cost_estimate: 450000, notes: "Relaxing afternoon cruise taking in the riverside monuments." },
      { day_number: 1, start_time: "19:30:00", end_time: "21:30:00", activity: "Dinner in Saint-Germain-des-Prés", location: "Saint-Germain", cost_estimate: 1200000, notes: "Classic French brasserie experience." },
      
      { day_number: 2, start_time: "09:00:00", end_time: "13:30:00", activity: "Louvre Museum Masterpieces", location: "Louvre", cost_estimate: 550000, notes: "Focus on the Mona Lisa, Venus de Milo, and Winged Victory." },
      { day_number: 2, start_time: "14:00:00", end_time: "15:30:00", activity: "Lunch near Palais Royal", location: "1st Arrondissement", cost_estimate: 800000, notes: "Quick bistrot lunch." },
      { day_number: 2, start_time: "16:00:00", end_time: "18:30:00", activity: "Champs-Élysées & Arc de Triomphe", location: "Champs-Élysées", cost_estimate: 350000, notes: "Window shopping and climbing the Arc for panoramic views." },
      { day_number: 2, start_time: "20:00:00", end_time: "23:00:00", activity: "Moulin Rouge Cabaret Show", location: "Pigalle", cost_estimate: 3000000, notes: "Iconic cabaret show with champagne." },
      
      { day_number: 3, start_time: "09:30:00", end_time: "12:30:00", activity: "Montmartre & Sacré-Cœur", location: "Montmartre", cost_estimate: 150000, notes: "Explore the artists' square and enjoy the city view." },
      { day_number: 3, start_time: "13:00:00", end_time: "14:30:00", activity: "Lunch at La Maison Rose", location: "Montmartre", cost_estimate: 700000, notes: "Picturesque pink restaurant." },
      { day_number: 3, start_time: "15:30:00", end_time: "18:00:00", activity: "Le Marais Walking Tour", location: "Le Marais", cost_estimate: 0, notes: "Boutique shops, historic mansions, and the Place des Vosges." }
    ]
  },
  {
    id: "tour-003",
    title: "Da Nang & Hoi An Complete Experience",
    destination: "Da Nang, Vietnam",
    duration_days: 3,
    budget_level: "Standard",
    cover_image: "/destinations/danang.jpg",
    category: "Culture",
    overview: "Explore the modern bridges and stunning beaches of Da Nang, conquer the Ba Na Hills, and step back in time in the lantern-lit streets of Hoi An Ancient Town.",
    highlights: ["Golden Bridge", "Dragon Bridge Fire Show", "Hoi An Lantern Boat", "An Bang Beach", "Marble Mountains"],
    itinerary: [
      { day_number: 1, start_time: "08:00:00", end_time: "09:00:00", activity: "Breakfast: Mi Quang Ba Mua", location: "Da Nang City", cost_estimate: 45000, notes: "The most famous local noodle dish in Da Nang." },
      { day_number: 1, start_time: "09:30:00", end_time: "16:00:00", activity: "Ba Na Hills & Golden Bridge", location: "Ba Na Hills", cost_estimate: 900000, notes: "Cable car ride, Golden Bridge photos, and Fantasy Park." },
      { day_number: 1, start_time: "16:30:00", end_time: "18:00:00", activity: "Relax at My Khe Beach", location: "My Khe", cost_estimate: 0, notes: "Sunset walk on one of the world's most beautiful beaches." },
      { day_number: 1, start_time: "19:00:00", end_time: "20:30:00", activity: "Seafood Dinner at Be Man", location: "Son Tra", cost_estimate: 400000, notes: "Fresh seafood by the beach." },
      { day_number: 1, start_time: "21:00:00", end_time: "22:00:00", activity: "Dragon Bridge Fire Show", location: "Han River", cost_estimate: 0, notes: "Only on weekends at 9 PM." },
      
      { day_number: 2, start_time: "08:30:00", end_time: "11:00:00", activity: "Explore Marble Mountains", location: "Ngu Hanh Son", cost_estimate: 40000, notes: "Climb the steps, visit caves and Buddhist sanctuaries." },
      { day_number: 2, start_time: "11:30:00", end_time: "12:30:00", activity: "Transfer to Hoi An", location: "Transport", cost_estimate: 150000, notes: "Grab or taxi to Hoi An Ancient Town." },
      { day_number: 2, start_time: "13:00:00", end_time: "14:00:00", activity: "Lunch at Morning Glory", location: "Hoi An", cost_estimate: 200000, notes: "Excellent local central Vietnamese cuisine." },
      { day_number: 2, start_time: "14:30:00", end_time: "17:30:00", activity: "Hoi An Ancient Town Walking Tour", location: "Hoi An", cost_estimate: 120000, notes: "Japanese Covered Bridge, Assembly Halls, and yellow alleys." },
      { day_number: 2, start_time: "18:30:00", end_time: "20:00:00", activity: "Dinner: Cao Lau Authentic", location: "Hoi An", cost_estimate: 50000, notes: "Hoi An's signature pork noodle dish." },
      { day_number: 2, start_time: "20:30:00", end_time: "21:30:00", activity: "Lantern Boat Ride on Hoai River", location: "Hoai River", cost_estimate: 100000, notes: "Release paper lanterns for good luck." },
      
      { day_number: 3, start_time: "08:00:00", end_time: "12:00:00", activity: "Coconut Village Basket Boat", location: "Cam Thanh", cost_estimate: 150000, notes: "Fun spinning basket boat ride through water coconut forest." },
      { day_number: 3, start_time: "12:30:00", end_time: "14:00:00", activity: "Lunch at An Bang Beach", location: "An Bang", cost_estimate: 250000, notes: "Seafood with a beach view." },
      { day_number: 3, start_time: "14:30:00", end_time: "16:00:00", activity: "Custom Tailoring Fitting", location: "Hoi An", cost_estimate: 0, notes: "Pick up your custom-made clothes before leaving." }
    ]
  },
  {
    id: "tour-004",
    title: "Kyoto Zen Retreat & Traditions",
    destination: "Kyoto, Japan",
    duration_days: 4,
    budget_level: "Premium",
    cover_image: "/destinations/kyoto.jpg",
    category: "Culture",
    overview: "Immerse yourself in the tranquility of ancient Japan. Focus on Kyoto's most stunning temples, serene bamboo forests, geisha districts, and traditional tea ceremonies.",
    highlights: ["Fushimi Inari Shrine", "Arashiyama Bamboo", "Tea Ceremony", "Golden Pavilion", "Kiyomizu-dera"],
    itinerary: [
      { day_number: 1, start_time: "07:30:00", end_time: "11:00:00", activity: "Fushimi Inari Walk", location: "Fushimi Inari", cost_estimate: 0, notes: "Go early to beat crowds and hike through thousands of torii gates." },
      { day_number: 1, start_time: "12:00:00", end_time: "13:30:00", activity: "Lunch at Vermillion Cafe", location: "Fushimi", cost_estimate: 350000, notes: "Relaxing lunch near the shrine." },
      { day_number: 1, start_time: "14:30:00", end_time: "17:00:00", activity: "Kiyomizu-dera Temple", location: "Higashiyama", cost_estimate: 80000, notes: "Iconic wooden stage with panoramic city views." },
      { day_number: 1, start_time: "17:30:00", end_time: "19:00:00", activity: "Stroll through Sannenzaka", location: "Higashiyama", cost_estimate: 200000, notes: "Traditional streets perfect for souvenirs and snacks." },
      
      { day_number: 2, start_time: "08:00:00", end_time: "11:00:00", activity: "Arashiyama Bamboo Grove", location: "Arashiyama", cost_estimate: 0, notes: "Walk through the towering bamboo stalks." },
      { day_number: 2, start_time: "11:30:00", end_time: "13:00:00", activity: "Tenryu-ji Temple & Garden", location: "Arashiyama", cost_estimate: 100000, notes: "UNESCO World Heritage site with stunning Zen gardens." },
      { day_number: 2, start_time: "13:30:00", end_time: "15:00:00", activity: "Soba Noodle Lunch", location: "Arashiyama", cost_estimate: 300000, notes: "Traditional handmade buckwheat noodles." },
      { day_number: 2, start_time: "15:30:00", end_time: "17:30:00", activity: "Iwatayama Monkey Park", location: "Arashiyama", cost_estimate: 150000, notes: "Hike up to feed monkeys and see Kyoto from above." },
      
      { day_number: 3, start_time: "09:00:00", end_time: "11:00:00", activity: "Golden Pavilion (Kinkaku-ji)", location: "Kinkaku-ji", cost_estimate: 80000, notes: "Stunning gold-leaf covered pavilion reflecting on the pond." },
      { day_number: 3, start_time: "11:30:00", end_time: "13:00:00", activity: "Ryoan-ji Zen Rock Garden", location: "Ryoan-ji", cost_estimate: 100000, notes: "The most famous Zen rock garden in Japan." },
      { day_number: 3, start_time: "14:00:00", end_time: "16:00:00", activity: "Traditional Tea Ceremony", location: "Gion", cost_estimate: 600000, notes: "Authentic matcha preparation in a tatami room." },
      { day_number: 3, start_time: "18:00:00", end_time: "20:30:00", activity: "Kaiseki Dinner in Gion", location: "Gion", cost_estimate: 2500000, notes: "Multi-course traditional dinner. Keep an eye out for Geishas." },
      
      { day_number: 4, start_time: "09:00:00", end_time: "12:00:00", activity: "Nijo Castle", location: "Central Kyoto", cost_estimate: 170000, notes: "Explore the former imperial villa with 'nightingale' floors." },
      { day_number: 4, start_time: "12:30:00", end_time: "14:30:00", activity: "Nishiki Market Food Tour", location: "Downtown Kyoto", cost_estimate: 500000, notes: "Kyoto's Kitchen - try tamagoyaki, mochi, and fresh seafood." }
    ]
  },
  {
    id: "tour-005",
    title: "Phu Quoc Tropical Escape",
    destination: "Phu Quoc, Vietnam",
    duration_days: 3,
    budget_level: "Relaxed",
    cover_image: "/destinations/phuquoc.jpg",
    category: "Beach",
    overview: "Unwind on the pristine white sand beaches of Vietnam's Pearl Island. Enjoy snorkeling, fresh seafood, and the world's longest over-sea cable car.",
    highlights: ["Hon Thom Cable Car", "Sao Beach", "Grand World", "Night Market", "Island Hopping"],
    itinerary: [
      { day_number: 1, start_time: "09:00:00", end_time: "10:00:00", activity: "Breakfast: Bun Quay Kien Xay", location: "Duong Dong", cost_estimate: 65000, notes: "Signature Phu Quoc stirring noodles." },
      { day_number: 1, start_time: "10:30:00", end_time: "16:00:00", activity: "Hon Thom Cable Car & Aquatopia", location: "An Thoi", cost_estimate: 600000, notes: "Spectacular ocean views and water park fun." },
      { day_number: 1, start_time: "17:00:00", end_time: "18:30:00", activity: "Sunset at Sunset Sanato Beach Club", location: "Long Beach", cost_estimate: 100000, notes: "Iconic photo spots during golden hour." },
      { day_number: 1, start_time: "19:30:00", end_time: "21:30:00", activity: "Phu Quoc Night Market", location: "Duong Dong", cost_estimate: 300000, notes: "Grilled urchin, fresh squid, and rolled ice cream." },
      
      { day_number: 2, start_time: "08:30:00", end_time: "15:00:00", activity: "4-Island Snorkeling Tour", location: "South Island", cost_estimate: 800000, notes: "Visit May Rut, Gam Ghi, and Mong Tay islands by speedboat." },
      { day_number: 2, start_time: "15:30:00", end_time: "17:30:00", activity: "Relax at Bai Sao (Sao Beach)", location: "An Thoi", cost_estimate: 50000, notes: "The whitest sand beach on the island." },
      { day_number: 2, start_time: "19:00:00", end_time: "21:00:00", activity: "Dinner at Xin Chao Restaurant", location: "Duong Dong", cost_estimate: 400000, notes: "Sunset view seafood dinner." },
      
      { day_number: 3, start_time: "09:00:00", end_time: "11:30:00", activity: "Vinpearl Safari", location: "North Island", cost_estimate: 650000, notes: "Vietnam's first open zoo." },
      { day_number: 3, start_time: "12:00:00", end_time: "13:30:00", activity: "Lunch at Ganh Dau Cape", location: "North Island", cost_estimate: 250000, notes: "Look out across the water to Cambodia." },
      { day_number: 3, start_time: "14:00:00", end_time: "18:00:00", activity: "Grand World Phu Quoc", location: "North Island", cost_estimate: 0, notes: "The Sleepless City, Venice boat ride, and Bamboo Legend." },
      { day_number: 3, start_time: "20:00:00", end_time: "21:30:00", activity: "Quintessence of Vietnam Show", location: "Grand World", cost_estimate: 300000, notes: "Spectacular cultural performance." }
    ]
  },
  {
    id: "tour-006",
    title: "Bali Luxury Villa & Beach Paradise",
    destination: "Bali, Indonesia",
    duration_days: 4,
    budget_level: "Luxury",
    cover_image: "/destinations/bali.jpg",
    category: "Beach",
    overview: "A perfect blend of culture and relaxation. Explore lush rice terraces, ancient sea temples, and pristine beaches in this luxurious Bali escape.",
    highlights: ["Ubud Rice Terraces", "Tanah Lot", "Nusa Penida", "Finns Beach Club", "Uluwatu Temple"],
    itinerary: [
      { day_number: 1, start_time: "09:00:00", end_time: "11:30:00", activity: "Sacred Monkey Forest Sanctuary", location: "Ubud", cost_estimate: 80000, notes: "Walk among hundreds of Balinese long-tailed macaques." },
      { day_number: 1, start_time: "12:00:00", end_time: "13:30:00", activity: "Lunch at Bebek Tepi Sawah", location: "Ubud", cost_estimate: 300000, notes: "Famous crispy duck overlooking rice fields." },
      { day_number: 1, start_time: "14:00:00", end_time: "17:00:00", activity: "Tegallalang Rice Terraces & Jungle Swing", location: "Ubud", cost_estimate: 250000, notes: "Iconic layered rice terraces and thrilling swings." },
      { day_number: 1, start_time: "18:00:00", end_time: "20:00:00", activity: "Dinner at Locavore", location: "Ubud", cost_estimate: 1500000, notes: "Fine dining with locally sourced ingredients." },
      
      { day_number: 2, start_time: "07:00:00", end_time: "16:00:00", activity: "Nusa Penida Day Trip", location: "Sanur Port", cost_estimate: 1200000, notes: "Visit Kelingking Beach, Broken Beach, and Angel's Billabong." },
      { day_number: 2, start_time: "17:30:00", end_time: "20:00:00", activity: "Jimbaran Bay Seafood Dinner", location: "Jimbaran", cost_estimate: 600000, notes: "Dine on the sand while watching the sunset." },
      
      { day_number: 3, start_time: "10:00:00", end_time: "13:00:00", activity: "Relax at Finns Beach Club", location: "Canggu", cost_estimate: 1500000, notes: "Luxury daybeds, infinity pools, and DJs." },
      { day_number: 3, start_time: "13:30:00", end_time: "15:00:00", activity: "Lunch at Milk & Madu", location: "Canggu", cost_estimate: 250000, notes: "Hipster cafe vibes and great food." },
      { day_number: 3, start_time: "16:00:00", end_time: "19:00:00", activity: "Tanah Lot Temple Sunset", location: "Beraban", cost_estimate: 100000, notes: "Iconic sea temple dramatically set on a rock." },
      
      { day_number: 4, start_time: "10:00:00", end_time: "12:30:00", activity: "Seminyak Boutique Shopping", location: "Seminyak", cost_estimate: 0, notes: "High-end fashion, homewares, and souvenirs." },
      { day_number: 4, start_time: "13:00:00", end_time: "14:30:00", activity: "Lunch at Motel Mexicola", location: "Seminyak", cost_estimate: 350000, notes: "Colorful and lively Mexican spot." },
      { day_number: 4, start_time: "16:30:00", end_time: "19:30:00", activity: "Uluwatu Temple & Kecak Fire Dance", location: "Uluwatu", cost_estimate: 200000, notes: "Cliffside temple and mesmerizing traditional dance at sunset." }
    ]
  }
];
