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
    clue: "Subah uthke sabse pehle yahi garam cheez chahiye hoti hai (desi chai)",
    answer: "TEA",
    decoys: ["M", "O", "S"],
    hint: "Starts with 'T' (3 letters)"
  },
  {
    id: "food_2",
    category: "Fruits & Food",
    clue: "Garmion mein sabka favourite fruit, aam ka English naam",
    answer: "MANGO",
    decoys: ["Z", "Y", "P"],
    hint: "Starts with 'M' (5 letters)"
  },
  {
    id: "food_3",
    category: "Fruits & Food",
    clue: "Chai ke saath dip karke khane wala desi snack (parle-g type)",
    answer: "BISCUIT",
    decoys: ["O", "P", "X"],
    hint: "Starts with 'B' (7 letters)"
  },
  {
    id: "food_4",
    category: "Fruits & Food",
    clue: "Rice aur mutton/chicken se bani shahi dish jo shadi aur daawat mein milti hai",
    answer: "BIRYANI",
    decoys: ["P", "X", "O", "T"],
    hint: "Starts with 'B' (7 letters)"
  },

  // Nature
  {
    id: "nature_1",
    category: "Nature",
    clue: "Subah-subah jo aakash mein chamakta hai aur dhoop deta hai",
    answer: "SUN",
    decoys: ["R", "K", "V"],
    hint: "Starts with 'S' (3 letters)"
  },
  {
    id: "nature_2",
    category: "Nature",
    clue: "Aasmaan se girne wala paani jo sabko bheega deta hai (baarish)",
    answer: "RAIN",
    decoys: ["E", "T", "U"],
    hint: "Starts with 'R' (4 letters)"
  },
  {
    id: "nature_3",
    category: "Nature",
    clue: "Barkha rani! Is season mein sab jagah paani hi paani hota hai",
    answer: "MONSOON",
    decoys: ["T", "L", "K"],
    hint: "Starts with 'M' (7 letters)"
  },
  {
    id: "nature_4",
    category: "Nature",
    clue: "Baarish ke baad aasmaan mein dikhne wali 7 rangon ki sunder kamaan",
    answer: "RAINBOW",
    decoys: ["Z", "Q", "P"],
    hint: "Starts with 'R' (7 letters)"
  },

  // Festivals
  {
    id: "fest_1",
    category: "Festivals",
    clue: "Rang barse! Pichkari aur gujhiya wala tyohar",
    answer: "HOLI",
    decoys: ["K", "A", "E"],
    hint: "Starts with 'H' (4 letters)"
  },
  {
    id: "fest_2",
    category: "Festivals",
    clue: "Roshni ka tyohar, jismein diye jalate hain aur mithai khate hain",
    answer: "DIWALI",
    decoys: ["S", "P", "K"],
    hint: "Starts with 'D' (6 letters)"
  },
  {
    id: "fest_3",
    category: "Festivals",
    clue: "Bhai-behen ka tyohar, jismein rakhi baandhi jaati hai",
    answer: "RAKHI",
    decoys: ["U", "N", "M"],
    hint: "Starts with 'R' (5 letters)"
  },
  {
    id: "fest_4",
    category: "Festivals",
    clue: "Ravan dahan aur burai par achhai ki jeet wala tyohar (dussehra)",
    answer: "DUSSEHRA",
    decoys: ["K", "M", "B"],
    hint: "Starts with 'D' (8 letters)"
  },

  // City Life
  {
    id: "city_1",
    category: "City Life",
    clue: "Mumbai ki jaan, jis pe lakhon log roz safar karte hain",
    answer: "TRAIN",
    decoys: ["S", "E", "C"],
    hint: "Starts with 'T' (5 letters)"
  },
  {
    id: "city_2",
    category: "City Life",
    clue: "Auto wale bhaiya jis teen-pahiya gaadi se chalte hain",
    answer: "AUTO",
    decoys: ["R", "B", "Z"],
    hint: "Starts with 'A' (4 letters)"
  },
  {
    id: "city_3",
    category: "City Life",
    clue: "Red, yellow aur green lights jo sadak par traffic control karti hain",
    answer: "SIGNAL",
    decoys: ["O", "E", "K"],
    hint: "Starts with 'S' (6 letters)"
  },
  {
    id: "city_4",
    category: "City Life",
    clue: "Delhi/Noida mein chalne wali fast, ac electric train jo patariyon par chalti hai",
    answer: "METRO",
    decoys: ["K", "W", "V"],
    hint: "Starts with 'M' (5 letters)"
  },

  // Music & Art
  {
    id: "music_1",
    category: "Music & Art",
    clue: "Saraswati maa ke haath mein kaunsa surila string instrument hota hai?",
    answer: "VEENA",
    decoys: ["T", "S", "W"],
    hint: "Starts with 'V' (5 letters)"
  },
  {
    id: "music_2",
    category: "Music & Art",
    clue: "Suron ka taal, gane ke piche bajne wala dhun",
    answer: "MUSIC",
    decoys: ["T", "O", "Y"],
    hint: "Starts with 'M' (5 letters)"
  },
  {
    id: "music_3",
    category: "Music & Art",
    clue: "Bhajan aur kirtan mein bajane wali gol lakdi ki cheez",
    answer: "DHOLAK",
    decoys: ["I", "M", "S"],
    hint: "Starts with 'D' (6 letters)"
  },
  {
    id: "music_4",
    category: "Music & Art",
    clue: "Zakir Hussain sahab ka mashhoor do-pahiya drum instrument",
    answer: "TABLA",
    decoys: ["Y", "G", "R"],
    hint: "Starts with 'T' (5 letters)"
  },

  // Precious Things
  {
    id: "precious_1",
    category: "Precious Things",
    clue: "Pila metal jo bahut keemti hai aur aabhushan (jewellery) banane mein kaam aata hai",
    answer: "GOLD",
    decoys: ["R", "E", "U"],
    hint: "Starts with 'G' (4 letters)"
  },
  {
    id: "precious_2",
    category: "Precious Things",
    clue: "Sabse hard aur chamkila ratna jo angoothi (ring) mein lagta hai (heera)",
    answer: "DIAMOND",
    decoys: ["X", "Y", "P"],
    hint: "Starts with 'D' (7 letters)"
  },
  {
    id: "precious_3",
    category: "Precious Things",
    clue: "Samundar ki seep (oyster) se nikalne wala safed gol moti",
    answer: "PEARL",
    decoys: ["K", "C", "Z"],
    hint: "Starts with 'P' (5 letters)"
  },
  {
    id: "precious_4",
    category: "Precious Things",
    clue: "Safed chamkili metal jisse payal aur chandi ke bartan bante hain",
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
    clue: "Lal dabba, peele dane, jo khaye woh swad pehchane? (Anaar)",
    answer: "POMEGRANATE",
    decoys: ["X", "Y", "W"],
    hint: "Starts with P (11 letters)"
  },
  {
    id: "paheli_food_2",
    category: "Fruits & Food",
    clue: "Kala muh aur peeli deh, sardi mein sabhi ko suhaye? (Mungfali)",
    answer: "PEANUT",
    decoys: ["L", "Z", "O"],
    hint: "Starts with P (6 letters)"
  },
  
  // Nature
  {
    id: "paheli_nature_1",
    category: "Nature",
    clue: "Ek thaal motiyon se bhara, sabke sir par aundha dhara? (Aasmaan/Taare)",
    answer: "SKY",
    decoys: ["T", "P", "R"],
    hint: "Starts with S (3 letters)"
  },
  {
    id: "paheli_nature_2",
    category: "Nature",
    clue: "Ek paheli bujhu re bhai, jitna kaato utni badhai? (Nail/Nakhun)",
    answer: "NAIL",
    decoys: ["E", "P", "Q"],
    hint: "Starts with N (4 letters)"
  },

  // Festivals
  {
    id: "paheli_fest_1",
    category: "Festivals",
    clue: "Ravan dahan aur burai par achhai ki jeet wala tyohar? (dussehra)",
    answer: "DUSSEHRA",
    decoys: ["K", "M", "B"],
    hint: "Starts with D (8 letters)"
  },

  // City Life
  {
    id: "paheli_city_1",
    category: "City Life",
    clue: "Char pahiye hain uske, sadak par daude dhum-dhadaka? (Car)",
    answer: "CAR",
    decoys: ["T", "V", "W"],
    hint: "Starts with C (3 letters)"
  },

  // Music & Art
  {
    id: "paheli_music_1",
    category: "Music & Art",
    clue: "Suron ka raja, phoonk marne par bajne wala baas ka instrument? (Bansuri)",
    answer: "FLUTE",
    decoys: ["X", "M", "S"],
    hint: "Starts with F (5 letters)"
  },

  // Precious Things
  {
    id: "paheli_precious_1",
    category: "Precious Things",
    clue: "Sone se sasta hai par chamak mein kisi se kam nahi? (Chandi)",
    answer: "SILVER",
    decoys: ["P", "Q", "B"],
    hint: "Starts with S (6 letters)"
  }
];

