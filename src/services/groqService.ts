import { Puzzle } from "../constants/puzzles";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── API Keys ─────────────────────────────────────────────────────────────────
const GROQ_KEYS = [
  process.env.EXPO_PUBLIC_GROQ_API_KEY,
  process.env.EXPO_PUBLIC_GROQ1_API_KEY,
  process.env.EXPO_PUBLIC_GROQ2_API_KEY,
  process.env.EXPO_PUBLIC_GROQ3_API_KEY,
  process.env.EXPO_PUBLIC_GROQ4_API_KEY,
  process.env.EXPO_PUBLIC_GROQ5_API_KEY,
].filter(Boolean) as string[];

let currentKeyIndex = 0;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function callAIApi(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const keysCount = GROQ_KEYS.length;
  let lastError: Error | null = null;

  // 1. Try all Groq keys
  if (keysCount > 0) {
    for (let attempt = 0; attempt < keysCount; attempt++) {
      const activeKey = GROQ_KEYS[currentKeyIndex];
      try {
        console.log(`[GroqService] Calling Groq API using Key[${currentKeyIndex}]...`);
        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user",   content: userPrompt   },
            ],
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
        });

        if (response.status === 429) {
          throw new Error("Rate limit (HTTP 429).");
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const resBody = await response.json();
        const content = resBody.choices?.[0]?.message?.content;
        if (!content) throw new Error("No content returned from Groq.");
        return content;
      } catch (err: any) {
        console.warn(`[GroqService] Groq key ${currentKeyIndex} failed: ${err.message}`);
        lastError = err;
        // Rotate key for next attempt
        currentKeyIndex = (currentKeyIndex + 1) % keysCount;
      }
    }
  }

  // 2. Fall back to Gemini API
  try {
    const geminiKey = process.env.EXPO_PUBLIC_GEMINI1_API_KEY;
    if (!geminiKey) {
      throw new Error("No Gemini API key configured.");
    }
    console.log("[GroqService] 🌟 Groq keys exhausted or failed. Falling back to Gemini 1.5 Flash API...");
    const url = `${GEMINI_API_URL}?key=${geminiKey}`;
    const payload = {
      contents: [
        {
          parts: [
            {
              text: userPrompt
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: systemPrompt
          }
        ]
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: temperature,
        maxOutputTokens: Math.max(maxTokens, 2048)
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText}`);
    }

    const resBody = await response.json();
    const content = resBody.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("No content returned from Gemini API.");
    }
    return content;
  } catch (err: any) {
    console.error(`[GroqService] Gemini fallback failed: ${err.message}`);
    throw lastError || err;
  }
}

// ─── Answer history (in-memory + persisted) ───────────────────────────────────
const STORAGE_KEY_USED_ANSWERS = "groq_used_answers_v2";
const MAX_HISTORY = 60;

let usedAnswersCache: string[] = [];
let historyCacheLoaded = false;

async function loadUsedAnswers(): Promise<void> {
  if (historyCacheLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_USED_ANSWERS);
    usedAnswersCache = raw ? JSON.parse(raw) : [];
  } catch {
    usedAnswersCache = [];
  }
  historyCacheLoaded = true;
}

async function saveUsedAnswer(answer: string): Promise<void> {
  usedAnswersCache = usedAnswersCache.filter((a) => a !== answer);
  usedAnswersCache.push(answer);
  if (usedAnswersCache.length > MAX_HISTORY) {
    usedAnswersCache = usedAnswersCache.slice(-MAX_HISTORY);
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY_USED_ANSWERS, JSON.stringify(usedAnswersCache));
  } catch {
    // non-fatal
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────
const VALID_CATEGORIES = [
  "Fruits & Food",
  "Nature",
  "Festivals",
  "City Life",
  "Music & Art",
  "Precious Things",
];

// ─── Language config ──────────────────────────────────────────────────────────
function getLanguageConfig(language: string, country: string): {
  displayLang: string;
  scriptNote: string;
  answerLangRule: string;
  commonWordsToAvoid: string;
} {
  const lang = language.toLowerCase().trim();

  if (lang === "hindi" || lang === "hinglish") {
    return {
      displayLang: "Hinglish (Hindi written in Roman/Latin script — DO NOT use Devanagari)",
      scriptNote:
        "Write ALL text — clue, hint, answer, story, question — in Roman script (e.g., 'Aam', 'Paani', 'Diwali'). Never use Devanagari (Hindi) script.",
      answerLangRule:
        "The answer MUST be a common Hindi/Hinglish word written in UPPERCASE Roman script (e.g., 'AAM', 'PAANI', 'SITARA', 'MITHAI'). Do NOT use English words as the answer unless the concept has no Hindi equivalent.",
      commonWordsToAvoid:
        "AAM, PAANI, CHAI, SITARA, CHAND, SURYA, PANI, ALOO, ROTI, DOODH, PHOOL, NADI, HAWA, PATANG",
    };
  }

  if (lang === "tamil") {
    return {
      displayLang: "Tamil written in Roman/Latin script (Tanglish) — DO NOT use Tamil script",
      scriptNote:
        "Write ALL text — clue, hint, answer — in Roman script (e.g., 'Manga', 'Vanam', 'Kovil'). Never use Tamil Unicode script.",
      answerLangRule:
        "The answer MUST be a common Tamil word written in UPPERCASE Roman script (e.g., 'MANGA', 'VANAM', 'THANNI', 'PAAL'). Do NOT use English words unless no Tamil equivalent exists.",
      commonWordsToAvoid:
        "MANGA, THANNI, PAAL, CHAND, SURYAN, NATCHATHIRAM, KOVIL, VANAM",
    };
  }

  if (lang === "telugu") {
    return {
      displayLang: "Telugu written in Roman/Latin script — DO NOT use Telugu script",
      scriptNote:
        "Write ALL text in Roman script (e.g., 'Mamidi', 'Neeru', 'Nallu'). Never use Telugu Unicode script.",
      answerLangRule:
        "The answer MUST be a common Telugu word written in UPPERCASE Roman script (e.g., 'MAMIDI', 'NEERU', 'PALU', 'CHANDRA'). Do NOT use English words unless no Telugu equivalent exists.",
      commonWordsToAvoid:
        "MAMIDI, NEERU, PALU, CHANDRA, SURYA, VAYU, AGNI",
    };
  }

  if (lang === "marathi") {
    return {
      displayLang: "Marathi written in Roman/Latin script — DO NOT use Devanagari",
      scriptNote:
        "Write ALL text in Roman script (e.g., 'Amba', 'Pani', 'Tara'). Never use Devanagari script.",
      answerLangRule:
        "The answer MUST be a common Marathi word in UPPERCASE Roman script (e.g., 'AMBA', 'PANI', 'TARA', 'UKAD'). Do NOT use English words unless no Marathi equivalent exists.",
      commonWordsToAvoid:
        "AMBA, PANI, TARA, CHANDRA, SURYA, VAYU, PHOOL",
    };
  }

  if (lang === "bengali") {
    return {
      displayLang: "Bengali written in Roman/Latin script — DO NOT use Bengali script",
      scriptNote:
        "Write ALL text in Roman script (e.g., 'Aam', 'Jol', 'Tara'). Never use Bengali Unicode script.",
      answerLangRule:
        "The answer MUST be a common Bengali word in UPPERCASE Roman script (e.g., 'AAM', 'JOL', 'TARA', 'MAACH'). Do NOT use English words unless no Bengali equivalent exists.",
      commonWordsToAvoid:
        "AAM, JOL, TARA, CHAND, SURJO, HAWA, MAACH",
    };
  }

  if (lang === "gujarati") {
    return {
      displayLang: "Gujarati written in Roman/Latin script — DO NOT use Gujarati script",
      scriptNote:
        "Write ALL text in Roman script (e.g., 'Keri', 'Pani', 'Taro'). Never use Gujarati Unicode script.",
      answerLangRule:
        "The answer MUST be a common Gujarati word in UPPERCASE Roman script (e.g., 'KERI', 'PANI', 'TARO', 'DUDH'). Do NOT use English words unless no Gujarati equivalent exists.",
      commonWordsToAvoid:
        "KERI, PANI, TARO, CHAND, SURYA, DUDH",
    };
  }

  if (lang === "punjabi") {
    return {
      displayLang: "Punjabi written in Roman/Latin script — DO NOT use Gurmukhi script",
      scriptNote:
        "Write ALL text in Roman script (e.g., 'Amb', 'Paani', 'Tara'). Never use Gurmukhi script.",
      answerLangRule:
        "The answer MUST be a common Punjabi word in UPPERCASE Roman script (e.g., 'AMB', 'PAANI', 'TARA', 'LASSI'). Do NOT use English words unless no Punjabi equivalent exists.",
      commonWordsToAvoid:
        "AMB, PAANI, TARA, CHAND, DHOL, LASSI",
    };
  }

  return {
    displayLang: "English",
    scriptNote: "Write ALL text — clue, hint, answer — in English.",
    answerLangRule:
      "The answer MUST be a single English word in UPPERCASE (e.g., 'MANGO', 'RIVER', 'TEMPLE'). It must be a word well known to a person from " + country + " aged 14-35.",
    commonWordsToAvoid:
      "MANGO, RAIN, STAR, BOOK, FIRE, MOON, TREE, WIND, GOLD, FISH, DRUM, SALT, KITE, ROAD, CHAI",
  };
}

// ─── Blocklist ────────────────────────────────────────────────────────────────
function buildBlocklistInstruction(usedAnswers: string[]): string {
  if (usedAnswers.length === 0) return "";
  const recent = usedAnswers.slice(-30).join(", ");
  return `
CRITICAL — FORBIDDEN ANSWERS LIST:
The following words have already been used as answers in earlier puzzles.
You MUST NOT use any of them, their plurals, or closely related forms:
[${recent}]
If you were about to pick one of the above, STOP immediately and choose a
completely different, more creative word before writing anything else.
`;
}

// ─── Creativity nudge ─────────────────────────────────────────────────────────
function buildCreativityNudge(attemptIndex: number, commonWordsToAvoid: string): string {
  const nudges = [
    `Avoid the most obvious choices. Do NOT use: ${commonWordsToAvoid}. Pick something unexpected but still commonly known.`,
    "Think of words related to household objects, kitchen tools, or daily rituals that people use but rarely see in word puzzles.",
    "Focus on words from festivals, traditional clothing, music instruments, or regional crafts of this culture.",
    "Consider words from sports, transportation, or street food that are well-known but rarely used in word games.",
    "Choose a word related to nature — but NOT rain, wind, moon, star, or sun. Think rivers, soil, minerals, or insects.",
    "Think about professions, tools, or materials specific to this culture.",
    "Pick a word from local culture: a traditional game, a fabric, a spice, or a type of music.",
    "Think of words that describe textures, sounds, or feelings — less common but widely understood.",
  ];
  return nudges[attemptIndex % nudges.length];
}

// ─── SHABD PROMPT ─────────────────────────────────────────────────────────────
function getShabdSystemPrompt(
  language: string,
  country: string,
  category: string | undefined,
  difficulty: string | undefined,
  usedAnswers: string[],
  attemptIndex: number
): string {
  const langConfig = getLanguageConfig(language, country);
  const { displayLang, scriptNote, answerLangRule, commonWordsToAvoid } = langConfig;

  const categoryRule = category
    ? `- Must be EXACTLY the category: "${category}" (Do not select any other category)`
    : `- Must be exactly one of: ${JSON.stringify(VALID_CATEGORIES)}\n- Pick the most specific match`;

  const difficultyRule = difficulty
    ? `- Must match difficulty level: "${difficulty}".
      * "Easy": Answer word length 3-5 letters. Clue must be extremely simple and direct.
      * "Medium": Answer word length 5-7 letters. Clue can be slightly tricky.
      * "Hard": Answer word length 6-9 letters. Clue must be clever, indirect, and challenging.
      * "Super Hard": Answer word length 7-12 letters. Clue must be highly challenging, cryptic, or very poetic.`
    : "";

  const blocklist       = buildBlocklistInstruction(usedAnswers);
  const creativityNudge = buildCreativityNudge(attemptIndex, commonWordsToAvoid);

  return `You are an expert word puzzle creator for a mobile game called Lexara.

Your job: Create a word scramble puzzle where the player reads a clue and unscrambles letters to find ONE specific word.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE: ${displayLang}
SCRIPT RULE: ${scriptNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

${blocklist}

UNIQUENESS DIRECTIVE: ${creativityNudge}

STRICT RULES FOR THE ANSWER:
- ${answerLangRule}
- Must be 3-12 letters long (adjust based on difficulty)
- Must be a word a person from ${country} aged 14-35 knows well
- No spaces or special characters
- MUST NOT be in the FORBIDDEN ANSWERS list above

STRICT RULES FOR THE CLUE:
- Written entirely in ${displayLang}
- Must describe the answer so specifically that ONLY ONE word fits
- Must reference real cultural/everyday context from ${country}
- Must NOT mention the answer word or any direct translation/synonym of it
- Must be 10-20 words long
- Bad clue: "Ek phal hai" (too vague — REJECTED)
- Good clue for AAM: "Garmi ke mausam mein sabse zyada pasand kiya jaane wala meetha peela ya lal phal jo India mein har jagah milta hai." (clearly AAM/MANGO)

STRICT RULES FOR THE HINT:
- Written entirely in ${displayLang}
- Must describe a UNIQUE PHYSICAL or SENSORY property of the answer
- Must NOT reveal the first letter, last letter, or letter count — EVER
- Must be a completely different angle from the clue — NOT a rephrasing of it
- Must be specific enough that ONLY the correct answer fits
- Bad hint: "W se shuru hota hai" — FORBIDDEN
- Bad hint: "Ek prakar ka phal hai" — too generic, REJECTED
- Good hint for AAM: "Iske andar ek bada beej hota hai, bahar ka chilka peela ya hara hota hai, aur iska ras bahut meetha aur sugandh bhari hoti hai."

STRICT RULES FOR DECOYS:
- Exactly 3 single UPPERCASE letters
- NONE of them must appear ANYWHERE in the answer word — not even once
- These are extra scramble letters, so they must be completely absent from the answer

STRICT RULES FOR CATEGORY:
${categoryRule}

${difficultyRule ? `STRICT RULES FOR DIFFICULTY:\n${difficultyRule}` : ""}

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "category": "${category || "One of the valid categories"}",
  "clue": "10-20 word clue in ${displayLang}, culturally specific to ${country}, one clear answer",
  "answer": "UPPERCASE_SINGLE_WORD_IN_${displayLang.toUpperCase()}_NOT_IN_FORBIDDEN_LIST",
  "decoys": ["X", "Y", "Z"],
  "hint": "Sensory/physical description in ${displayLang} from a different angle — zero letter hints"
}`;
}

// ─── PAHELI PROMPT ────────────────────────────────────────────────────────────
function getPaheliSystemPrompt(
  language: string,
  country: string,
  category: string | undefined,
  difficulty: string | undefined,
  usedAnswers: string[],
  attemptIndex: number
): string {
  const langConfig = getLanguageConfig(language, country);
  const { displayLang, scriptNote, answerLangRule, commonWordsToAvoid } = langConfig;

  const categoryRule = category
    ? `- Must be EXACTLY the category: "${category}" (Do not select any other category)`
    : `- Must be exactly one of: ${JSON.stringify(VALID_CATEGORIES)}\n- Match the riddle subject to the most accurate category`;

  const difficultyRule = difficulty
    ? `- Must match difficulty level: "${difficulty}".
      * "Easy": Answer word length 3-5 letters. Riddle must be very simple.
      * "Medium": Answer word length 5-7 letters. Riddle can be moderately tricky.
      * "Hard": Answer word length 6-9 letters. Riddle must be clever and indirect.
      * "Super Hard": Answer word length 7-12 letters. Riddle must be cryptic or very poetic.`
    : "";

  const blocklist       = buildBlocklistInstruction(usedAnswers);
  const creativityNudge = buildCreativityNudge(attemptIndex, commonWordsToAvoid);

  return `You are an expert riddle creator for a mobile game called Lexara.

Your job: Create a traditional-style riddle where the player solves it and types the answer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE: ${displayLang}
SCRIPT RULE: ${scriptNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

${blocklist}

UNIQUENESS DIRECTIVE: ${creativityNudge}

STRICT RULES FOR THE ANSWER:
- ${answerLangRule}
- Must be 3-12 letters long (adjust based on difficulty)
- Must be the ONE AND ONLY logical answer to the riddle
- No spaces or special characters
- MUST NOT be in the FORBIDDEN ANSWERS list above

STRICT RULES FOR THE RIDDLE (clue):
- Written entirely in ${displayLang}
- Must be a proper RIDDLE: poetic, metaphorical, from the object's point of view OR through comparisons
- The riddle must have EXACTLY ONE correct answer — zero ambiguity
- Must NOT contain the answer word or a direct translation/synonym of it
- Must be 15-25 words
- Must reflect the culture, daily life, food, or environment of ${country}
- Every line must point to the SAME answer — internal consistency is mandatory

STRICT RULES FOR THE HINT:
- Written entirely in ${displayLang}
- Must describe the answer from a completely DIFFERENT angle than the riddle
- Must reveal a SPECIFIC physical, functional, or cultural property
- Must NOT give away the answer directly or reveal letter positions
- Bad hint: "S se shuru hota hai" — FORBIDDEN
- The hint alone must narrow it down to EXACTLY the one correct answer

STRICT RULES FOR DECOYS:
- Exactly 3 single UPPERCASE letters
- NONE of them must appear ANYWHERE in the answer word — not even once

STRICT RULES FOR CATEGORY:
${categoryRule}

${difficultyRule ? `STRICT RULES FOR DIFFICULTY:\n${difficultyRule}` : ""}

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "category": "${category || "One of the valid categories"}",
  "clue": "15-25 word riddle in ${displayLang}, poetic, one clear answer",
  "answer": "UPPERCASE_SINGLE_WORD_IN_${displayLang.toUpperCase()}_NOT_IN_FORBIDDEN_LIST",
  "decoys": ["X", "Y", "Z"],
  "hint": "Different-angle clue in ${displayLang} using physical/functional/cultural property — no letter hints"
}`;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function sanitizeDecoys(answer: string, decoys: string[]): string[] {
  const answerLetters = new Set(answer.toUpperCase().split(""));
  const safeFallbacks = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .filter((l) => !answerLetters.has(l));

  const cleaned: string[] = [];
  const used = new Set<string>();

  for (const d of decoys) {
    const l = d?.toUpperCase()?.trim();
    if (l && l.length === 1 && !answerLetters.has(l) && !used.has(l)) {
      cleaned.push(l);
      used.add(l);
    }
  }
  for (const f of safeFallbacks) {
    if (cleaned.length >= 3) break;
    if (!used.has(f)) { cleaned.push(f); used.add(f); }
  }
  return cleaned.slice(0, 3);
}

function validateParsed(parsed: any, usedAnswers: string[]): void {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Response is not a JSON object.");
  }

  const answer = parsed.answer?.trim()?.toUpperCase();
  if (!answer || answer.length === 0) throw new Error("Missing or empty 'answer'.");
  if (!parsed.clue  || parsed.clue.trim().length  < 10) throw new Error("Clue missing or too short.");
  if (!parsed.hint  || parsed.hint.trim().length  < 10) throw new Error("Hint missing or too short.");
  if (!parsed.category) throw new Error("Category missing.");
  if (answer.length < 3 || answer.length > 12) throw new Error(`Answer "${answer}" outside length range 3-12.`);
  if (/\s/.test(answer)) throw new Error(`Answer "${answer}" contains spaces.`);

  if (usedAnswers.includes(answer)) {
    throw new Error(
      `Answer "${answer}" is in the used-answer history. Model ignored the blocklist. Retrying.`
    );
  }

  if (parsed.clue.toUpperCase().includes(answer)) {
    throw new Error(`Clue literally contains the answer "${answer}". Rejected.`);
  }

  const badHintPatterns = [
    /starts with/i,
    /first letter/i,
    /\d+ letters/i,
    /letter count/i,
    /ends with/i,
    /it is a [a-z]+ letter/i,
    /contains the letter/i,
    /se shuru/i,
    /aksharon/i,
    /se khatam/i,
    /pehla aksar/i,
  ];
  for (const pat of badHintPatterns) {
    if (pat.test(parsed.hint)) {
      throw new Error(`Hint reveals letter info: "${parsed.hint}". Rejected.`);
    }
  }

  const clueWords = new Set(parsed.clue.toLowerCase().split(/\s+/));
  const hintWords  = parsed.hint.toLowerCase().split(/\s+/);
  const overlap    = hintWords.filter((w: string) => w.length > 4 && clueWords.has(w));
  if (overlap.length > 5) {
    throw new Error(
      `Hint overlaps too much with clue (shared: ${overlap.join(", ")}). Rejected.`
    );
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generatePuzzle(
  mode: "shabd" | "paheli",
  category?: string,
  difficulty?: string
): Promise<Puzzle> {
  let userLanguage = "Hindi";
  let userCountry  = "India";
  try {
    const sl = await AsyncStorage.getItem("game_language");
    const sc = await AsyncStorage.getItem("user_country");
    if (sl) userLanguage = sl;
    if (sc) userCountry  = sc;
  } catch (e) {
    console.warn("[GroqService] AsyncStorage read failed:", e);
  }

  await loadUsedAnswers();

  const langConfig = getLanguageConfig(userLanguage, userCountry);
  console.log(
    `[GroqService] 🚀 mode=${mode} | lang=${userLanguage} (${langConfig.displayLang}) | cat=${category || "random"} | diff=${difficulty || "default"} | blocked=${usedAnswersCache.length}`
  );

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      console.log(`[GroqService] Generation attempt=${retry + 1}`);

      const systemPrompt =
        mode === "shabd"
          ? getShabdSystemPrompt(userLanguage, userCountry, category, difficulty, usedAnswersCache, retry)
          : getPaheliSystemPrompt(userLanguage, userCountry, category, difficulty, usedAnswersCache, retry);

      const catInst  = category  ? ` for category "${category}"` : "";
      const diffInst = difficulty ? ` at difficulty "${difficulty}"` : "";

      const userPrompt =
        mode === "shabd"
          ? `Generate one UNIQUE word scramble puzzle${catInst}${diffInst}.
Language: ${langConfig.displayLang}.
Script: ${langConfig.scriptNote}
The answer MUST be in ${langConfig.displayLang}.
The clue and hint MUST be written in ${langConfig.displayLang}.
The answer must NOT be in the forbidden list.
Context: ${userCountry}.`
          : `Generate one UNIQUE riddle (paheli)${catInst}${diffInst}.
Language: ${langConfig.displayLang}.
Script: ${langConfig.scriptNote}
The answer MUST be in ${langConfig.displayLang}.
The riddle and hint MUST be written in ${langConfig.displayLang}.
The answer must NOT be in the forbidden list.
Context: ${userCountry}.`;

      const temperature = Math.min(0.80 + retry * 0.10, 1.0);
      const content = await callAIApi(systemPrompt, userPrompt, temperature, 450);

      const cleanJson = content
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i,    "")
        .replace(/```$/m,       "")
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleanJson);
      } catch {
        throw new Error(`JSON parse failed: ${cleanJson.slice(0, 120)}`);
      }

      validateParsed(parsed, usedAnswersCache);

      const answer = parsed.answer.trim().toUpperCase();

      const matchedCategory = VALID_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : VALID_CATEGORIES[Math.floor(Math.random() * VALID_CATEGORIES.length)];

      const safeDecoys = sanitizeDecoys(answer, Array.isArray(parsed.decoys) ? parsed.decoys : []);

      const puzzle: Puzzle = {
        id:       `groq_${mode}_${Date.now()}`,
        category: matchedCategory,
        clue:     parsed.clue.trim(),
        answer,
        decoys:   safeDecoys,
        hint:     parsed.hint.trim(),
      };

      await saveUsedAnswer(answer);

      console.log(
        `[GroqService] ✅ answer=${answer} | lang=${userLanguage} | cat=${matchedCategory} | history=${usedAnswersCache.length}`
      );
      return puzzle;

    } catch (err: any) {
      console.warn(`[GroqService] Attempt ${retry + 1} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate a valid unique puzzle.");
}

// ─── Dev utility ──────────────────────────────────────────────────────────────
export async function clearPuzzleHistory(): Promise<void> {
  usedAnswersCache    = [];
  historyCacheLoaded  = false;
  await AsyncStorage.removeItem(STORAGE_KEY_USED_ANSWERS);
  console.log("[GroqService] 🗑️ Puzzle history cleared.");
}

export interface StoryQuestion {
  story: string;
  question: string;
  answer: string;
  hint: string;
}

// ─── STORY QUESTION PROMPT ────────────────────────────────────────────────────
/**
 * The key fix: the model is told to LOCK THE ANSWER FIRST, then reverse-engineer
 * the story and question around it. This guarantees the question-answer pair is
 * 100% consistent instead of loosely matched.
 */
function getStoryQuestionSystemPrompt(
  displayLang: string,
  scriptNote: string,
  answerLangRule: string,
  userCountry: string
): string {
  return `You are a master storyteller and puzzle designer for a mobile game called Lexara.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE: ${displayLang}
SCRIPT RULE: ${scriptNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL — ANSWER-FIRST APPROACH:
You MUST follow these steps IN ORDER. Do not skip any step:

  STEP 1 — PICK THE ANSWER WORD FIRST.
    - Choose a single concrete noun or concept that is well-known in ${userCountry}.
    - ${answerLangRule}
    - The answer must be something that can be described through a story scene
      (a physical object, food, place, animal, instrument, tool, etc.).
    - Do NOT pick abstract words like "love", "time", "hope" — they are too vague.

  STEP 2 — BUILD THE STORY AROUND THE ANSWER.
    - Write a 120-180 word mystery or narrative story set in ${userCountry}.
    - The story MUST contain at least 3 clear, concrete clues that all point
      exclusively to your chosen answer word.
    - Embed the clues naturally inside the story events — do not state them directly.
    - The story must be engaging, vivid, and culturally rich.
    - Do NOT mention the answer word anywhere in the story.

  STEP 3 — WRITE THE QUESTION ABOUT THE ANSWER.
    - The question MUST ask specifically and directly about the answer word you chose in Step 1.
    - The question must be answerable with ONLY that one answer word — zero ambiguity.
    - Bad question: "Kaun si cheez sabse zyada important hai?" (too vague — any word fits)
    - Good question for SITAAR: "Us musafir ne kaunsa saaz bajaya jisme taaro ki awaaz
      door tak sunai deti thi?" (only SITAAR fits)
    - The question MUST reference specific events, objects, or details from the story.
    - A reader who reads the story carefully should be able to answer it with 100% confidence.

  STEP 4 — WRITE THE HINT.
    - Describe a unique physical, sensory, or functional property of the answer.
    - Must NOT reveal letters, letter count, or positions.
    - Must be a completely different angle from the story clues.
    - Must narrow down to ONLY the answer word — no other word fits.

STRICT RULES:
- Everything (story, question, hint, answer) MUST be written in ${displayLang}.
- The question MUST have the answer as its ONLY correct answer. If you cannot guarantee
  this, go back to Step 1 and choose a different, more concrete answer word.
- The answer MUST be a single word (or max 2-word phrase) in UPPERCASE.
- Do NOT use abstract, emotional, or multi-meaning words as the answer.

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "story": "120-180 word story in ${displayLang} with embedded clues pointing to the answer",
  "question": "A direct, specific question in ${displayLang} that has ONLY ONE possible answer",
  "answer": "UPPERCASE_ANSWER_WORD_IN_${displayLang.toUpperCase()}",
  "hint": "Physical/sensory/functional hint in ${displayLang} — no letter hints"
}`;
}

export async function generateStoryAndQuestion(): Promise<StoryQuestion> {
  let userLanguage = "Hindi";
  let userCountry  = "India";
  try {
    const sl = await AsyncStorage.getItem("game_language");
    const sc = await AsyncStorage.getItem("user_country");
    if (sl) userLanguage = sl;
    if (sc) userCountry  = sc;
  } catch (e) {
    console.warn("[GroqService] AsyncStorage read failed:", e);
  }

  const langConfig  = getLanguageConfig(userLanguage, userCountry);
  const { displayLang, scriptNote, answerLangRule } = langConfig;

  console.log(`[GroqService] 🚀 Generating AI Kahani story in ${displayLang}...`);

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      const systemPrompt = getStoryQuestionSystemPrompt(
        displayLang,
        scriptNote,
        answerLangRule,
        userCountry
      );

      const userPrompt = `Follow the 4-step ANSWER-FIRST approach strictly.
Step 1: Pick a concrete, well-known answer word from daily life in ${userCountry}.
Step 2: Write a rich 120-180 word story in ${displayLang} with 3+ clues pointing only to that answer.
Step 3: Write a specific question in ${displayLang} that has ONLY that answer word as its answer.
Step 4: Write a physical/sensory hint in ${displayLang}.
Language: ${displayLang}. Context: ${userCountry}.`;

      const content = await callAIApi(systemPrompt, userPrompt, 0.75 + retry * 0.1, 700);

      const cleanJson = content
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i,    "")
        .replace(/```$/m,       "")
        .trim();

      const parsed: StoryQuestion = JSON.parse(cleanJson);

      if (!parsed.story    || parsed.story.length    < 50)  throw new Error("Generated story is too short or missing.");
      if (!parsed.question || parsed.question.length < 10)  throw new Error("Generated question is too short or missing.");
      if (!parsed.answer)                                    throw new Error("Generated answer is missing.");
      if (!parsed.hint) {
        parsed.hint = "Read the story details carefully to find the answer!";
      }

      parsed.answer = parsed.answer.trim().toUpperCase();

      // Guard: reject if the question is too generic (less than 6 words)
      const questionWordCount = parsed.question.trim().split(/\s+/).length;
      if (questionWordCount < 6) {
        throw new Error(`Question too vague or short (${questionWordCount} words): "${parsed.question}"`);
      }

      console.log(`[GroqService] ✅ Story generated. Lang=${userLanguage} | Answer: ${parsed.answer}`);
      return parsed;

    } catch (err: any) {
      console.warn(`[GroqService] Story gen attempt ${retry + 1} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error("Could not generate a story puzzle.");
}

// ─── STORY CHAPTER PROMPT ─────────────────────────────────────────────────────
function getStoryChapterSystemPrompt(
  chapterId: number,
  title: string,
  category: string,
  difficulty: string,
  displayLang: string,
  scriptNote: string,
  answerLangRule: string,
  userCountry: string
): string {
  return `You are a master storyteller and puzzle developer designing Chapter ${chapterId} of a progressive 50-chapter narrative adventure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE: ${displayLang}
SCRIPT RULE: ${scriptNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chapter: ${chapterId} — "${title}"
Category: ${category}
Difficulty: ${difficulty}

CRITICAL — ANSWER-FIRST APPROACH (follow IN ORDER):

  STEP 1 — PICK THE ANSWER WORD FIRST.
    - Choose a single concrete word that fits the chapter title "${title}" and category "${category}".
    - ${answerLangRule}
    - Difficulty letter-count rule:
        * "Easy":       3-5 letters
        * "Medium":     5-7 letters
        * "Hard":       6-9 letters
        * "Super Hard": 7-12 letters
    - The word must be a physical object, food, animal, place, instrument, or tool —
      NOT an abstract idea.

  STEP 2 — BUILD THE STORY AROUND THE ANSWER.
    - Write a 120-180 word mystery story for Chapter ${chapterId} ("${title}") set in ${userCountry}.
    - The story MUST embed at least 3 concrete, specific clues that all point ONLY to your answer.
    - Weave the clues into the narrative naturally — do not list them.
    - The story must match the chapter title, category, and feel like part of a quest.
    - Do NOT mention the answer word in the story.

  STEP 3 — WRITE THE QUESTION.
    - The question MUST ask directly and specifically about the answer word from Step 1.
    - It MUST reference a specific detail, object, or event from the story.
    - The answer must be the ONLY possible correct answer to the question.
    - Bad: "Wahan kya tha?" (too vague)
    - Good for SITAR: "Jo saaz is musafir ne us raat sunsaan haveli mein bajaya, uska naam kya tha?" 

  STEP 4 — WRITE THE HINT.
    - Describe a physical, sensory, or functional property of the answer.
    - Must NOT reference letters, letter count, or positions.
    - Must be a completely different angle from the story clues.

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "story": "120-180 word story in ${displayLang}",
  "question": "Specific, unambiguous question in ${displayLang} with only ONE correct answer",
  "answer": "UPPERCASE_WORD",
  "hint": "Physical/sensory hint in ${displayLang} — no letter hints"
}`;
}

export async function generateStoryChapterPuzzle(
  chapterId: number,
  title: string,
  category: string,
  difficulty: string
): Promise<StoryQuestion> {
  let userLanguage = "Hindi";
  let userCountry  = "India";
  try {
    const sl = await AsyncStorage.getItem("game_language");
    const sc = await AsyncStorage.getItem("user_country");
    if (sl) userLanguage = sl;
    if (sc) userCountry  = sc;
  } catch (e) {
    console.warn("[GroqService] AsyncStorage read failed:", e);
  }

  const langConfig  = getLanguageConfig(userLanguage, userCountry);
  const { displayLang, scriptNote, answerLangRule } = langConfig;

  console.log(`[GroqService] 🚀 Generating AI Chapter ${chapterId} (${title}) in ${displayLang}...`);

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      const systemPrompt = getStoryChapterSystemPrompt(
        chapterId, title, category, difficulty,
        displayLang, scriptNote, answerLangRule, userCountry
      );

      const userPrompt = `Follow the 4-step ANSWER-FIRST approach strictly.
Chapter ${chapterId}: "${title}" | Category: ${category} | Difficulty: ${difficulty} | Country: ${userCountry} | Language: ${displayLang}.
Step 1: Pick a concrete answer word matching the chapter theme and difficulty letter count.
Step 2: Write a 120-180 word story with 3+ clues pointing exclusively to that word.
Step 3: Write a specific question referencing the story that has ONLY that word as the answer.
Step 4: Write a physical/sensory hint.`;

      const content = await callAIApi(systemPrompt, userPrompt, 0.75 + retry * 0.1, 700);

      const cleanJson = content
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i,    "")
        .replace(/```$/m,       "")
        .trim();

      const parsed: StoryQuestion = JSON.parse(cleanJson);

      if (!parsed.story    || parsed.story.length    < 50)  throw new Error("Generated story too short.");
      if (!parsed.question || parsed.question.length < 10)  throw new Error("Generated question too short.");
      if (!parsed.answer)                                    throw new Error("Generated answer missing.");
      if (!parsed.hint)    parsed.hint = "Read the story details carefully!";

      parsed.answer = parsed.answer.trim().toUpperCase();

      const questionWordCount = parsed.question.trim().split(/\s+/).length;
      if (questionWordCount < 6) {
        throw new Error(`Question too vague (${questionWordCount} words): "${parsed.question}"`);
      }

      console.log(`[GroqService] ✅ AI Chapter ${chapterId} generated successfully. Answer: ${parsed.answer}`);
      return parsed;

    } catch (err: any) {
      console.warn(`[GroqService] Chapter ${chapterId} puzzle gen attempt ${retry + 1} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error(`Could not generate a story chapter puzzle for chapter ${chapterId}.`);
}

// ─── DYNAMIC CHAPTER PROMPT ───────────────────────────────────────────────────
function getDynamicChapterSystemPrompt(
  chapterId: number,
  targetDifficulty: string,
  displayLang: string,
  scriptNote: string,
  answerLangRule: string,
  userCountry: string
): string {
  return `You are a master storyteller and puzzle developer designing Chapter ${chapterId} of a progressive 50-chapter narrative adventure to find the legendary "Golden Quill".

━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE: ${displayLang}
SCRIPT RULE: ${scriptNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target Difficulty: ${targetDifficulty}

CRITICAL — ANSWER-FIRST APPROACH (follow IN ORDER):

  STEP 1 — PICK THE ANSWER WORD FIRST.
    - Choose a single concrete word related to daily life, culture, or nature of ${userCountry}.
    - ${answerLangRule}
    - Difficulty letter-count rule:
        * "Easy":       3-5 letters
        * "Medium":     5-7 letters
        * "Hard":       6-9 letters
        * "Super Hard": 7-12 letters
    - The word must be a physical object, food, animal, place, instrument, or tool.
    - Do NOT use abstract words (love, hope, time, peace, etc.).

  STEP 2 — CHOOSE A CHAPTER THEME THAT FITS THE ANSWER.
    - Pick a creative English chapter title (e.g. "The Whispering Dunes").
    - Pick a Roman-script chapter title in ${displayLang} (e.g. "Chapter ${chapterId}: Reet Ki Khushboo").
    - Pick the most fitting category from: "Fruits & Food", "Nature", "Festivals", "City Life", "Music & Art", "Precious Things".

  STEP 3 — BUILD THE STORY AROUND THE ANSWER.
    - Write a 120-180 word mystery/narrative story set in ${userCountry}.
    - Embed at least 3 concrete, specific clues that all point ONLY to the answer word.
    - The story must feel like Chapter ${chapterId} of an epic quest for the Golden Quill.
    - Do NOT mention the answer word in the story.

  STEP 4 — WRITE THE QUESTION.
    - The question MUST ask directly about the answer word.
    - It MUST reference a specific detail or object from the story.
    - The answer must be the ONLY possible correct answer — zero ambiguity.
    - Bad: "Wahan kya mila?" (too vague — any word fits)
    - Good for DHOL: "Us gaon ke darwaze par sunai dene wala woh bada taal-wad saaz kaunsa tha jisme do taraf se bajaya jaata hai?"

  STEP 5 — WRITE THE HINT.
    - Describe a unique physical, sensory, or functional property of the answer.
    - Must NOT reveal letters, letter count, or positions.
    - Must be a completely different angle from the story clues.

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "title": "Creative chapter title in English",
  "hindi_title": "Chapter ${chapterId}: Roman script title in ${displayLang}",
  "category": "One of the 6 valid categories",
  "difficulty": "${targetDifficulty}",
  "narrative": "120-180 word story in ${displayLang} with 3+ embedded clues",
  "question": "Specific, unambiguous question in ${displayLang} with only ONE correct answer",
  "answer": "UPPERCASE_WORD",
  "hint": "Physical/sensory hint in ${displayLang} — no letter hints"
}`;
}

export interface AIDynamicChapter {
  title: string;
  hindi_title: string;
  narrative: string;
  question: string;
  answer: string;
  hint: string;
  category: string;
  difficulty: string;
}

export async function generateDynamicChapter(chapterId: number): Promise<AIDynamicChapter> {
  let userLanguage = "Hindi";
  let userCountry  = "India";
  try {
    const sl = await AsyncStorage.getItem("game_language");
    const sc = await AsyncStorage.getItem("user_country");
    if (sl) userLanguage = sl;
    if (sc) userCountry  = sc;
  } catch (e) {
    console.warn("[GroqService] AsyncStorage read failed:", e);
  }

  const langConfig  = getLanguageConfig(userLanguage, userCountry);
  const { displayLang, scriptNote, answerLangRule } = langConfig;

  let targetDifficulty = "Easy";
  if (chapterId > 10 && chapterId <= 25) targetDifficulty = "Medium";
  else if (chapterId > 25 && chapterId <= 40) targetDifficulty = "Hard";
  else if (chapterId > 40) targetDifficulty = "Super Hard";

  console.log(`[GroqService] 🚀 Generating dynamic AI Chapter ${chapterId} (Target Diff: ${targetDifficulty}) in ${displayLang}...`);

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      const systemPrompt = getDynamicChapterSystemPrompt(
        chapterId, targetDifficulty,
        displayLang, scriptNote, answerLangRule, userCountry
      );

      const userPrompt = `Follow the 5-step ANSWER-FIRST approach strictly.
Chapter ${chapterId} of the Golden Quill quest. Difficulty: ${targetDifficulty}. Country: ${userCountry}. Language: ${displayLang}.
Step 1: Pick a concrete answer word matching the difficulty letter count.
Step 2: Choose a chapter title and category that fits the answer.
Step 3: Write 120-180 word story with 3+ exclusive clues.
Step 4: Write a question referencing the story with ONLY ONE correct answer.
Step 5: Write a physical/sensory hint.`;

      const content = await callAIApi(systemPrompt, userPrompt, 0.75 + retry * 0.1, 750);

      const cleanJson = content
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i,    "")
        .replace(/```$/m,       "")
        .trim();

      const parsed = JSON.parse(cleanJson);

      if (!parsed.title)                                      parsed.title = `Chapter ${chapterId}`;
      if (!parsed.hindi_title)                                parsed.hindi_title = `Chapter ${chapterId}: Path to Quill`;
      if (!parsed.narrative || parsed.narrative.length < 50)  throw new Error("Narrative too short.");
      if (!parsed.question  || parsed.question.length  < 10)  throw new Error("Question too short.");
      if (!parsed.answer)                                      throw new Error("Answer missing.");
      if (!parsed.hint)                                        parsed.hint = "Observe the details carefully.";

      // Guard: reject vague questions
      const questionWordCount = parsed.question.trim().split(/\s+/).length;
      if (questionWordCount < 6) {
        throw new Error(`Question too vague (${questionWordCount} words): "${parsed.question}"`);
      }

      const matchedCategory = VALID_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : VALID_CATEGORIES[Math.floor(Math.random() * VALID_CATEGORIES.length)];

      parsed.category  = matchedCategory;
      parsed.difficulty = targetDifficulty;
      parsed.answer    = parsed.answer.trim().toUpperCase();

      console.log(`[GroqService] ✅ Dynamic Chapter ${chapterId} generated. Title: ${parsed.title} | Answer: ${parsed.answer}`);
      return parsed as AIDynamicChapter;

    } catch (err: any) {
      console.warn(`[GroqService] Dynamic Chapter ${chapterId} gen attempt ${retry + 1} failed: ${err.message}`);
      lastError = err;
    }
  }

  // ─── Fallback ─────────────────────────────────────────────────────────────
  const fallbacks: Record<number, AIDynamicChapter> = {
    1: {
      title: "The Golden Brew",
      hindi_title: "Chapter 1: Search for the Divine Drink",
      narrative: "The elders of Shabdpur Village tell you that to reach the Golden Quill, you must first drink a warm sacred brew at dawn. Decipher this drink to begin your quest!",
      question: "Woh kaun sa garam peya jaane wala paaniya hai jise subah subah doodh, patti aur adrak ke saath banaya jaata hai?",
      answer: "CHAI",
      hint: "Iska rang halka bhoora hota hai, isme patti ki khushboo aur adrak ki teekhi mehak hoti hai.",
      category: "Fruits & Food",
      difficulty: "Easy",
    },
    2: {
      title: "Forest of Echoes",
      hindi_title: "Chapter 2: The Echoing Forest",
      narrative: "The path through the Forest of Echoes is dry. To move forward, you must bring rain down from the sky to quench the thirst of the land.",
      question: "Woh kaun si prakrutik ghatna hai jisme badal se paani ki boondein zameen par girti hain aur sukhe jungle ko hariyali milti hai?",
      answer: "BAARISH",
      hint: "Aasman se girti hai, chhata kholne par bhi bheeg jaate hain, aur zameen par tapakne ki awaaz aati hai.",
      category: "Nature",
      difficulty: "Easy",
    },
  };

  const fallback = fallbacks[chapterId] || {
    title: `Sanctuary Step ${chapterId}`,
    hindi_title: `Chapter ${chapterId}: Sacred Gate`,
    narrative: `You enter the ancient vault of Shabdpur at level ${chapterId}. The stone door requires you to solve the riddle of the local city lights.`,
    question: "Woh kaun si cheez hai jo raat mein sadkon par roshni karti hai aur musafiron ko raasta dikhati hai?",
    answer: "DIYA",
    hint: "Mitti se bana hota hai, tel aur baati se jalta hai, aur hawaon mein bhi thoda hilta rehta hai.",
    category: "City Life",
    difficulty: targetDifficulty,
  };

  console.log(`[GroqService] ⚠️ Using local fallback for Chapter ${chapterId}.`);
  return fallback;
}