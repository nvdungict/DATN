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
    title: "Hanoi Street Food & Culture",
    destination: "Hanoi, Vietnam",
    duration_days: 2,
    budget_level: "Relaxed",
    cover_image: "/destinations/hanoi.jpg",
    category: "Culture",
    overview: "A rapid 2-day deep dive into the culinary and historical heart of Vietnam. Taste the best Pho, Banh Mi, and Egg Coffee in the bustling streets of the Old Quarter.",
    highlights: ["Old Quarter Walking Tour", "Authentic Pho & Bun Cha", "Egg Coffee Experience", "Hoan Kiem Lake"],
    itinerary: [
      { day_number: 1, start_time: "08:00:00", end_time: "10:00:00", activity: "Pho Bat Dan Breakfast", location: "Old Quarter", cost_estimate: 50000, notes: "Classic Hanoi breakfast" },
      { day_number: 1, start_time: "10:30:00", end_time: "13:00:00", activity: "Hoan Kiem Lake Stroll", location: "Hoan Kiem", cost_estimate: 0, notes: "Visit Ngoc Son Temple" },
      { day_number: 1, start_time: "13:00:00", end_time: "14:00:00", activity: "Bun Cha Huong Lien", location: "Hai Ba Trung", cost_estimate: 80000, notes: "Obama's favorite Bun Cha" },
      { day_number: 1, start_time: "15:00:00", end_time: "16:00:00", activity: "Egg Coffee at Cafe Giang", location: "Old Quarter", cost_estimate: 35000, notes: "The birthplace of egg coffee" },
      { day_number: 2, start_time: "09:00:00", end_time: "12:00:00", activity: "Dong Xuan Market", location: "Dong Xuan", cost_estimate: 200000, notes: "Shop for souvenirs and spices" },
      { day_number: 2, start_time: "18:00:00", end_time: "21:00:00", activity: "Night Market & Ta Hien", location: "Ta Hien Beer Street", cost_estimate: 150000, notes: "Bia Hoi and street snacks" }
    ]
  },
  {
    id: "tour-002",
    title: "Classic Paris Escapade",
    destination: "Paris, France",
    duration_days: 3,
    budget_level: "Moderate",
    cover_image: "/destinations/paris.jpg",
    category: "City",
    overview: "Experience the timeless romance of Paris in this curated 3-day getaway. From the iconic Eiffel Tower to the artistic haven of Montmartre, this tour hits all the must-see spots.",
    highlights: ["Eiffel Tower Sunset", "Louvre Museum", "Seine River Cruise", "Montmartre"],
    itinerary: [
      { day_number: 1, start_time: "10:00:00", end_time: "13:00:00", activity: "Eiffel Tower Ascent", location: "Eiffel Tower", cost_estimate: 600000, notes: "Book tickets in advance" },
      { day_number: 1, start_time: "15:00:00", end_time: "17:00:00", activity: "Seine River Cruise", location: "Port de la Bourdonnais", cost_estimate: 350000, notes: "Relaxing afternoon cruise" },
      { day_number: 2, start_time: "09:00:00", end_time: "14:00:00", activity: "Louvre Masterpieces", location: "Louvre Museum", cost_estimate: 450000, notes: "Focus on Denon Wing" },
      { day_number: 2, start_time: "16:00:00", end_time: "18:00:00", activity: "Champs-Élysées Stroll", location: "Champs-Élysées", cost_estimate: 0, notes: "Window shopping" },
      { day_number: 3, start_time: "10:00:00", end_time: "13:00:00", activity: "Montmartre & Sacré-Cœur", location: "Montmartre", cost_estimate: 100000, notes: "Great city views" }
    ]
  },
  {
    id: "tour-003",
    title: "Da Nang & Hoi An Getaway",
    destination: "Da Nang, Vietnam",
    duration_days: 3,
    budget_level: "Moderate",
    cover_image: "/destinations/danang.jpg",
    category: "Culture",
    overview: "Explore the modern bridges of Da Nang and step back in time in the lantern-lit streets of Hoi An Ancient Town.",
    highlights: ["Dragon Bridge", "Ba Na Hills", "Hoi An Ancient Town", "An Bang Beach"],
    itinerary: [
      { day_number: 1, start_time: "09:00:00", end_time: "16:00:00", activity: "Ba Na Hills & Golden Bridge", location: "Ba Na Hills", cost_estimate: 900000, notes: "Cable car ride and theme park" },
      { day_number: 1, start_time: "19:00:00", end_time: "21:00:00", activity: "Dragon Bridge Show", location: "Han River", cost_estimate: 0, notes: "Fire and water show on weekends" },
      { day_number: 2, start_time: "14:00:00", end_time: "21:00:00", activity: "Hoi An Ancient Town", location: "Hoi An", cost_estimate: 120000, notes: "Walk through lantern streets and take a boat ride" },
      { day_number: 3, start_time: "08:00:00", end_time: "12:00:00", activity: "Relax at An Bang Beach", location: "Hoi An", cost_estimate: 50000, notes: "Morning swim and seafood" }
    ]
  },
  {
    id: "tour-004",
    title: "Kyoto Zen Retreat",
    destination: "Kyoto, Japan",
    duration_days: 4,
    budget_level: "Relaxed",
    cover_image: "/destinations/kyoto.jpg",
    category: "Culture",
    overview: "Immerse yourself in the tranquility of ancient Japan. Focus on Kyoto's most stunning temples, serene bamboo forests, and traditional tea ceremonies.",
    highlights: ["Fushimi Inari Shrine", "Arashiyama Bamboo", "Tea Ceremony", "Golden Pavilion"],
    itinerary: [
      { day_number: 1, start_time: "08:00:00", end_time: "11:00:00", activity: "Fushimi Inari Walk", location: "Fushimi Inari", cost_estimate: 0, notes: "Go early to beat crowds" },
      { day_number: 2, start_time: "09:00:00", end_time: "12:00:00", activity: "Arashiyama Bamboo Grove", location: "Arashiyama", cost_estimate: 0, notes: "Beautiful photos" },
      { day_number: 3, start_time: "10:00:00", end_time: "12:00:00", activity: "Golden Pavilion", location: "Kinkaku-ji", cost_estimate: 80000, notes: "Stunning reflection" },
      { day_number: 4, start_time: "14:00:00", end_time: "16:00:00", activity: "Tea Ceremony", location: "Gion", cost_estimate: 600000, notes: "Authentic matcha experience" }
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
    highlights: ["Hon Thom Cable Car", "Sao Beach", "Grand World", "Night Market"],
    itinerary: [
      { day_number: 1, start_time: "10:00:00", end_time: "16:00:00", activity: "Hon Thom Cable Car & Aquatopia", location: "An Thoi", cost_estimate: 600000, notes: "Spectacular ocean views" },
      { day_number: 1, start_time: "19:00:00", end_time: "21:00:00", activity: "Phu Quoc Night Market", location: "Duong Dong", cost_estimate: 300000, notes: "Fresh seafood dinner" },
      { day_number: 2, start_time: "09:00:00", end_time: "14:00:00", activity: "Four Islands Snorkeling", location: "South Island", cost_estimate: 800000, notes: "Island hopping by canoe" },
      { day_number: 3, start_time: "16:00:00", end_time: "21:00:00", activity: "Grand World Phu Quoc", location: "North Island", cost_estimate: 0, notes: "Venice of Vietnam" }
    ]
  },
  {
    id: "tour-006",
    title: "Bali Island Paradise",
    destination: "Bali, Indonesia",
    duration_days: 4,
    budget_level: "Luxury",
    cover_image: "/destinations/bali.jpg",
    category: "Beach",
    overview: "A perfect blend of culture and relaxation. Explore lush rice terraces, ancient sea temples, and pristine beaches in this luxurious Bali escape.",
    highlights: ["Ubud Rice Terraces", "Tanah Lot", "Nusa Penida", "Finns Beach Club"],
    itinerary: [
      { day_number: 1, start_time: "10:00:00", end_time: "13:00:00", activity: "Tegallalang Terraces", location: "Ubud", cost_estimate: 50000, notes: "Iconic Bali views" },
      { day_number: 2, start_time: "08:00:00", end_time: "16:00:00", activity: "Nusa Penida Day Trip", location: "Sanur", cost_estimate: 1200000, notes: "Kelingking Beach" },
      { day_number: 3, start_time: "11:00:00", end_time: "18:00:00", activity: "Finns Beach Club", location: "Canggu", cost_estimate: 1500000, notes: "Luxury relaxation" },
      { day_number: 4, start_time: "16:00:00", end_time: "19:00:00", activity: "Tanah Lot Temple", location: "Beraban", cost_estimate: 100000, notes: "Farewell sunset" }
    ]
  },
  {
    id: "tour-007",
    title: "Ha Long Bay Cruise",
    destination: "Quang Ninh, Vietnam",
    duration_days: 2,
    budget_level: "Luxury",
    cover_image: "/destinations/halong.jpg",
    category: "Nature",
    overview: "Sail through thousands of majestic limestone karsts rising from emerald waters. Sleep on a 5-star cruise and wake up to a serene sunrise.",
    highlights: ["Overnight Cruise", "Sung Sot Cave", "Kayaking", "Titop Island"],
    itinerary: [
      { day_number: 1, start_time: "12:00:00", end_time: "13:00:00", activity: "Board Luxury Cruise", location: "Tuan Chau Marina", cost_estimate: 3500000, notes: "Check-in and lunch" },
      { day_number: 1, start_time: "15:00:00", end_time: "17:00:00", activity: "Kayaking & Swimming", location: "Luon Cave", cost_estimate: 0, notes: "Included in cruise package" },
      { day_number: 2, start_time: "06:00:00", end_time: "07:00:00", activity: "Tai Chi on Sundeck", location: "Cruise", cost_estimate: 0, notes: "Morning exercise" },
      { day_number: 2, start_time: "08:00:00", end_time: "10:00:00", activity: "Explore Sung Sot Cave", location: "Surprise Cave", cost_estimate: 0, notes: "The largest cave in Ha Long" }
    ]
  },
  {
    id: "tour-008",
    title: "Swiss Alps Explorer",
    destination: "Interlaken, Switzerland",
    duration_days: 3,
    budget_level: "Luxury",
    cover_image: "/destinations/interlaken.jpg",
    category: "Nature",
    overview: "Breathe in the crisp mountain air on this alpine adventure. Experience train rides to the Top of Europe and serene boat cruises.",
    highlights: ["Jungfraujoch", "Lake Thun Cruise", "Lauterbrunnen Valley", "Swiss Chocolate"],
    itinerary: [
      { day_number: 1, start_time: "09:00:00", end_time: "17:00:00", activity: "Jungfraujoch Excursion", location: "Jungfrau", cost_estimate: 4500000, notes: "Top of Europe" },
      { day_number: 2, start_time: "10:00:00", end_time: "14:00:00", activity: "Lauterbrunnen Valley", location: "Lauterbrunnen", cost_estimate: 200000, notes: "Valley of 72 waterfalls" },
      { day_number: 3, start_time: "11:00:00", end_time: "14:00:00", activity: "Lake Thun Boat Cruise", location: "Interlaken West", cost_estimate: 800000, notes: "Scenic cruise with castle views" }
    ]
  },
  {
    id: "tour-009",
    title: "Saigon Vibrant Pulse",
    destination: "Ho Chi Minh, Vietnam",
    duration_days: 2,
    budget_level: "Moderate",
    cover_image: "/destinations/hochiminh2.jpg",
    category: "City",
    overview: "Feel the energetic heartbeat of Vietnam's largest city. From historic landmarks to modern skyscrapers and amazing street food.",
    highlights: ["Ben Thanh Market", "Cu Chi Tunnels", "Landmark 81", "Bui Vien Nightlife"],
    itinerary: [
      { day_number: 1, start_time: "08:00:00", end_time: "13:00:00", activity: "Cu Chi Tunnels Half-day", location: "Cu Chi", cost_estimate: 400000, notes: "Historical tunnel system" },
      { day_number: 1, start_time: "18:00:00", end_time: "20:00:00", activity: "Landmark 81 Skyview", location: "Binh Thanh", cost_estimate: 500000, notes: "Tallest building in Vietnam" },
      { day_number: 2, start_time: "09:00:00", end_time: "11:00:00", activity: "War Remnants Museum", location: "District 3", cost_estimate: 40000, notes: "Must-visit museum" },
      { day_number: 2, start_time: "20:00:00", end_time: "23:00:00", activity: "Bui Vien Walking Street", location: "District 1", cost_estimate: 300000, notes: "Vibrant nightlife" }
    ]
  },
  {
    id: "tour-010",
    title: "Dubai Desert & Skyline",
    destination: "Dubai, UAE",
    duration_days: 3,
    budget_level: "Luxury",
    cover_image: "/destinations/dubai.jpg",
    category: "City",
    overview: "Experience the ultimate modern luxury in Dubai. From the world's tallest building to thrilling 4x4 desert safaris.",
    highlights: ["Burj Khalifa", "Desert Safari", "Dubai Mall", "Palm Jumeirah"],
    itinerary: [
      { day_number: 1, start_time: "16:00:00", end_time: "19:00:00", activity: "Burj Khalifa Sunset", location: "Downtown Dubai", cost_estimate: 1500000, notes: "Level 124" },
      { day_number: 2, start_time: "15:00:00", end_time: "21:00:00", activity: "Premium Desert Safari", location: "Dubai Desert", cost_estimate: 2500000, notes: "Dune bashing & BBQ" },
      { day_number: 3, start_time: "10:00:00", end_time: "14:00:00", activity: "Palm Jumeirah Cruise", location: "Dubai Marina", cost_estimate: 2000000, notes: "Yacht tour" }
    ]
  }
];
