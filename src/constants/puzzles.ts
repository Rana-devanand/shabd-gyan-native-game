export interface Puzzle {
  id: string;
  category: string;
  clue: string;
  answer: string;
  decoys: string[];
  hint: string;
}

export interface Category {
  name: string;
  icon: string;
  gradient: [string, string, ...string[]];
}

export const CATEGORIES: Category[] = [
  { name: "Fruits & Food", icon: "🍎", gradient: ["#4A121A", "#7A2B1C"] }, // Dark Rust-Red gradient
  { name: "Nature", icon: "🌿", gradient: ["#0B3A33", "#145A45"] },       // Dark Forest Green gradient
  { name: "Festivals", icon: "🪔", gradient: ["#663300", "#7E57C2"] },    // Dark Ochre & Purple gradient
  { name: "City Life", icon: "🚗", gradient: ["#1A237E", "#283593"] },    // Deep Indigo gradient
  { name: "Music & Art", icon: "🎵", gradient: ["#4A148C", "#311B92"] },   // Deep Purple/Violet gradient
  { name: "Precious Things", icon: "💎", gradient: ["#004D40", "#006064"] } // Deep Teal/Cyan gradient
];

export const PUZZLES: Puzzle[] = [
  // Fruits & Food
  {
    id: "food_1",
    category: "Fruits & Food",
    clue: "This hot beverage is the first thing most people want in the morning (desi tea)",
    answer: "TEA",
    decoys: ["M", "O", "S"],
    hint: "Starts with 'T' (3 letters)"
  },
  {
    id: "food_2",
    category: "Fruits & Food",
    clue: "Everyone's favorite summer fruit, also known as the king of fruits in India",
    answer: "MANGO",
    decoys: ["Z", "Y", "P"],
    hint: "Starts with 'M' (5 letters)"
  },
  {
    id: "food_3",
    category: "Fruits & Food",
    clue: "A popular baked snack dipped in tea during snack time",
    answer: "BISCUIT",
    decoys: ["O", "P", "X"],
    hint: "Starts with 'B' (7 letters)"
  },
  {
    id: "food_4",
    category: "Fruits & Food",
    clue: "A royal dish made of rice and spiced meat served at weddings and feasts",
    answer: "BIRYANI",
    decoys: ["P", "X", "O", "T"],
    hint: "Starts with 'B' (7 letters)"
  },

  // Nature
  {
    id: "nature_1",
    category: "Nature",
    clue: "The bright body that shines in the sky during the morning and provides light",
    answer: "SUN",
    decoys: ["R", "K", "V"],
    hint: "Starts with 'S' (3 letters)"
  },
  {
    id: "nature_2",
    category: "Nature",
    clue: "Water droplets falling from the sky that get everyone wet",
    answer: "RAIN",
    decoys: ["E", "T", "U"],
    hint: "Starts with 'R' (4 letters)"
  },
  {
    id: "nature_3",
    category: "Nature",
    clue: "The rainy season when there is water and wetness everywhere",
    answer: "MONSOON",
    decoys: ["T", "L", "K"],
    hint: "Starts with 'M' (7 letters)"
  },
  {
    id: "nature_4",
    category: "Nature",
    clue: "A beautiful arch of seven colors visible in the sky after the rain",
    answer: "RAINBOW",
    decoys: ["Z", "Q", "P"],
    hint: "Starts with 'R' (7 letters)"
  },

  // Festivals
  {
    id: "fest_1",
    category: "Festivals",
    clue: "The vibrant festival of colors celebrated with water guns and sweet treats",
    answer: "HOLI",
    decoys: ["K", "A", "E"],
    hint: "Starts with 'H' (4 letters)"
  },
  {
    id: "fest_2",
    category: "Festivals",
    clue: "The festival of lights when people light clay lamps and share sweets",
    answer: "DIWALI",
    decoys: ["S", "P", "K"],
    hint: "Starts with 'D' (6 letters)"
  },
  {
    id: "fest_3",
    category: "Festivals",
    clue: "The festival of brother-sister bond when a sacred thread is tied on the wrist",
    answer: "RAKHI",
    decoys: ["U", "N", "M"],
    hint: "Starts with 'R' (5 letters)"
  },
  {
    id: "fest_4",
    category: "Festivals",
    clue: "The festival celebrating the victory of good over evil with the burning of Ravan",
    answer: "DUSSEHRA",
    decoys: ["K", "M", "B"],
    hint: "Starts with 'D' (8 letters)"
  },

  // City Life
  {
    id: "city_1",
    category: "City Life",
    clue: "The lifeline of Mumbai on which millions of people commute daily",
    answer: "TRAIN",
    decoys: ["S", "E", "C"],
    hint: "Starts with 'T' (5 letters)"
  },
  {
    id: "city_2",
    category: "City Life",
    clue: "The three-wheeled passenger vehicle commonly used by local commuters",
    answer: "AUTO",
    decoys: ["R", "B", "Z"],
    hint: "Starts with 'A' (4 letters)"
  },
  {
    id: "city_3",
    category: "City Life",
    clue: "Red, yellow, and green lights that control traffic flow on the road",
    answer: "SIGNAL",
    decoys: ["O", "E", "K"],
    hint: "Starts with 'S' (6 letters)"
  },
  {
    id: "city_4",
    category: "City Life",
    clue: "The fast, air-conditioned electric transit train running in Delhi and Noida",
    answer: "METRO",
    decoys: ["K", "W", "V"],
    hint: "Starts with 'M' (5 letters)"
  },

  // Music & Art
  {
    id: "music_1",
    category: "Music & Art",
    clue: "Which melodious stringed musical instrument is held by Goddess Saraswati?",
    answer: "VEENA",
    decoys: ["T", "S", "W"],
    hint: "Starts with 'V' (5 letters)"
  },
  {
    id: "music_2",
    category: "Music & Art",
    clue: "Melodious beats and tune playing in the background of a song",
    answer: "MUSIC",
    decoys: ["T", "O", "Y"],
    hint: "Starts with 'M' (5 letters)"
  },
  {
    id: "music_3",
    category: "Music & Art",
    clue: "A double-headed wooden drum commonly played during devotional singing",
    answer: "DHOLAK",
    decoys: ["I", "M", "S"],
    hint: "Starts with 'D' (6 letters)"
  },
  {
    id: "music_4",
    category: "Music & Art",
    clue: "The famous pair of hand drums played by maestro Zakir Hussain",
    answer: "TABLA",
    decoys: ["Y", "G", "R"],
    hint: "Starts with 'T' (5 letters)"
  },

  // Precious Things
  {
    id: "precious_1",
    category: "Precious Things",
    clue: "A valuable yellow metal highly used for making beautiful jewelry",
    answer: "GOLD",
    decoys: ["R", "E", "U"],
    hint: "Starts with 'G' (4 letters)"
  },
  {
    id: "precious_2",
    category: "Precious Things",
    clue: "The hardest and most brilliant precious stone often set in rings",
    answer: "DIAMOND",
    decoys: ["X", "Y", "P"],
    hint: "Starts with 'D' (7 letters)"
  },
  {
    id: "precious_3",
    category: "Precious Things",
    clue: "A smooth, white, round gem harvested from ocean oysters",
    answer: "PEARL",
    decoys: ["K", "C", "Z"],
    hint: "Starts with 'P' (5 letters)"
  },
  {
    id: "precious_4",
    category: "Precious Things",
    clue: "A shiny white metal used to make anklets and traditional tableware",
    answer: "SILVER",
    decoys: ["X", "M", "O"],
    hint: "Starts with 'S' (6 letters)"
  }
];

export const PAHELI_PUZZLES: Puzzle[] = [
  // Fruits & Food
  {
    id: "paheli_food_1",
    category: "Fruits & Food",
    clue: "Red box filled with juicy sweet seeds, a delicious fruit that tastes sweet? (Pomegranate)",
    answer: "POMEGRANATE",
    decoys: ["X", "Y", "W"],
    hint: "Starts with P (11 letters)"
  },
  {
    id: "paheli_food_2",
    category: "Fruits & Food",
    clue: "Black face and yellow body, a warm nut that everyone loves in winter? (Peanut)",
    answer: "PEANUT",
    decoys: ["L", "Z", "O"],
    hint: "Starts with P (6 letters)"
  },
  
  // Nature
  {
    id: "paheli_nature_1",
    category: "Nature",
    clue: "A plate full of shining pearls, turned upside down over everyone's head? (Sky/Stars)",
    answer: "SKY",
    decoys: ["T", "P", "R"],
    hint: "Starts with S (3 letters)"
  },
  {
    id: "paheli_nature_2",
    category: "Nature",
    clue: "Solve this riddle, brother: the more you cut it, the more it grows? (Nails)",
    answer: "NAIL",
    decoys: ["E", "P", "Q"],
    hint: "Starts with N (4 letters)"
  },

  // Festivals
  {
    id: "paheli_fest_1",
    category: "Festivals",
    clue: "The festival celebrating the victory of good over evil and the burning of Ravan? (Dussehra)",
    answer: "DUSSEHRA",
    decoys: ["K", "M", "B"],
    hint: "Starts with D (8 letters)"
  },

  // City Life
  {
    id: "paheli_city_1",
    category: "City Life",
    clue: "It has four wheels and speeds down the road with a roar? (Car)",
    answer: "CAR",
    decoys: ["T", "V", "W"],
    hint: "Starts with C (3 letters)"
  },

  // Music & Art
  {
    id: "paheli_music_1",
    category: "Music & Art",
    clue: "The king of tunes, a hollow bamboo instrument played by blowing air? (Flute)",
    answer: "FLUTE",
    decoys: ["X", "M", "S"],
    hint: "Starts with F (5 letters)"
  },

  // Precious Things
  {
    id: "paheli_precious_1",
    category: "Precious Things",
    clue: "Cheaper than gold but shines no less than any other precious metal? (Silver)",
    answer: "SILVER",
    decoys: ["P", "Q", "B"],
    hint: "Starts with S (6 letters)"
  }
];

