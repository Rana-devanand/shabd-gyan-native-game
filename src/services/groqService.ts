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

// ─── Answer history (in-memory + persisted) ───────────────────────────────────
// Tracks the last N answers so we can tell the model exactly what NOT to use.
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

// ─── Prompt helpers ───────────────────────────────────────────────────────────

/**
 * Injects the used-answer blocklist into the prompt.
 * This is the PRIMARY fix for repeated answers — the model is
 * explicitly told which words are off-limits.
 */
function buildBlocklistInstruction(usedAnswers: string[]): string {
  if (usedAnswers.length === 0) return "";
  const recent = usedAnswers.slice(-30).join(", ");
  return `
CRITICAL — FORBIDDEN ANSWERS LIST:
The following words have already been used. You MUST NOT use any of them as the answer,
and you MUST NOT use any variation, plural, or closely related word of any of them:
[${recent}]
If you were about to pick one of the above, STOP immediately and choose a completely
different, more creative, less common word before writing anything else.
`;
}

/**
 * Rotates the creativity nudge on every call so the model explores
 * different semantic spaces rather than defaulting to "safe" words.
 */
function buildCreativityNudge(attemptIndex: number): string {
  const nudges = [
    "Avoid the obvious. Do NOT use common words like MANGO, RAIN, STAR, BOOK, FIRE, MOON, TREE, WIND, GOLD, FISH, DRUM, SALT, KITE, ROAD, CHAI. Pick something unexpected.",
    "Think of words related to Indian household objects, kitchen tools, or daily rituals that people use but rarely see in puzzles.",
    "Focus on words from Indian festivals, traditional clothing, music instruments, or regional crafts.",
    "Consider words from sports, transportation, or Indian street food that are well-known but rarely used in word games.",
    "Choose a word related to nature — but NOT rain, wind, moon, star, sun, or tree. Think rivers, soil, minerals, or insects.",
    "Think about professions, tools, or materials. Avoid any word that could also be a common fruit or animal.",
    "Pick a word from Indian culture: a traditional game, a fabric, a spice, or a type of music. Avoid generic English words.",
    "Think of words that describe textures, sounds, or feelings — less common but widely understood by an Indian young adult.",
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
  const displayLang = "English";

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

  const blocklist      = buildBlocklistInstruction(usedAnswers);
  const creativityNudge = buildCreativityNudge(attemptIndex);

  return `You are an expert word puzzle creator for a mobile game called Lexara.

Your job: Create a word scramble puzzle where the player reads a clue and unscrambles letters to find ONE specific English word.

${blocklist}

UNIQUENESS DIRECTIVE: ${creativityNudge}

STRICT RULES FOR THE CLUE:
- Written in ${displayLang}
- Must describe the answer so specifically that ONLY ONE English word fits
- Must reference real cultural/everyday context from ${country}
- Must NOT mention the answer word or any direct translation of it
- Must be 10-20 words long
- Bad clue: "It is a fruit" (too vague — REJECTED)
- Good clue: "A large green fruit with sweet red pulp and black seeds, very popular in Indian summers." (clearly WATERMELON)
- The clue must make it OBVIOUS what the word is once you know it, but challenging before

STRICT RULES FOR THE HINT:
- Must describe a UNIQUE PHYSICAL or SENSORY property of the answer
- Must NOT reveal the first letter, last letter, or letter count — EVER
- Must be a completely different angle from the clue — NOT a rephrasing of it
- Must be specific enough that ONLY the correct answer fits
- Bad hint: "Starts with W, 10 letters" — FORBIDDEN, ALWAYS REJECTED
- Bad hint: "It is a type of fruit" — too generic, REJECTED
- Good hint: "Its flesh is bright red with small black seeds, and it is over 90% water" (WATERMELON)
- Good hint: "Played by striking taut skin stretched over a hollow cylinder, essential at Indian weddings" (DRUM)

STRICT RULES FOR THE ANSWER:
- Must be a single English word in UPPERCASE
- Must be a word a person from ${country} aged 14-35 knows well
- Must be 3-12 letters long (adjust based on difficulty)
- Must have EXACTLY ONE correct answer that matches the clue
- MUST NOT be in the FORBIDDEN ANSWERS list above

STRICT RULES FOR DECOYS:
- Exactly 3 single uppercase letters
- NONE of them must appear ANYWHERE in the answer word — not even once
- Check every single letter of the answer before picking decoys

STRICT RULES FOR CATEGORY:
${categoryRule}

${difficultyRule ? `STRICT RULES FOR DIFFICULTY:\n${difficultyRule}` : ""}

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "category": "${category || "One of the valid categories"}",
  "clue": "10-20 word clue in ${displayLang}, culturally specific to ${country}, one clear answer",
  "answer": "UPPERCASE_SINGLE_WORD_NOT_IN_FORBIDDEN_LIST",
  "decoys": ["X", "Y", "Z"],
  "hint": "Sensory/physical description from a different angle — zero letter hints"
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
  const displayLang = "English";

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

  const blocklist      = buildBlocklistInstruction(usedAnswers);
  const creativityNudge = buildCreativityNudge(attemptIndex);

  return `You are an expert riddle creator for a mobile game called Lexara.

Your job: Create a traditional-style riddle where the player solves it and types the English answer.

${blocklist}

UNIQUENESS DIRECTIVE: ${creativityNudge}

STRICT RULES FOR THE RIDDLE (clue):
- Must be a proper RIDDLE: poetic, metaphorical, from the object's point of view OR through comparisons
- The riddle must have EXACTLY ONE correct English answer — zero ambiguity
- Must NOT contain the answer word or a direct translation
- Must be 15-25 words
- Must reflect the culture, daily life, food, or environment of ${country}
- Every line must point to the SAME answer — internal consistency is mandatory

STRICT RULES FOR THE HINT:
- Must describe the answer from a completely DIFFERENT angle than the riddle
- Must reveal a SPECIFIC physical, functional, or cultural property
- Must NOT give away the answer directly or reveal letter positions
- Bad hint: "Starts with S" — FORBIDDEN
- Bad hint: "It comes from the sky" — too generic if riddle already said that
- The hint alone must narrow it down to EXACTLY the one correct answer

STRICT RULES FOR THE ANSWER:
- Must be a single English word in UPPERCASE
- Must be a word a typical person from ${country} aged 14-35 knows well
- Must be 3-12 letters long (adjust based on difficulty)
- Must be the ONE AND ONLY logical answer to the riddle
- MUST NOT be in the FORBIDDEN ANSWERS list above

STRICT RULES FOR DECOYS:
- Exactly 3 single uppercase letters
- NONE of them must appear ANYWHERE in the answer word — not even once

STRICT RULES FOR CATEGORY:
${categoryRule}

${difficultyRule ? `STRICT RULES FOR DIFFICULTY:\n${difficultyRule}` : ""}

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "category": "${category || "One of the valid categories"}",
  "clue": "15-25 word riddle in ${displayLang}, poetic, one clear answer",
  "answer": "UPPERCASE_SINGLE_WORD_NOT_IN_FORBIDDEN_LIST",
  "decoys": ["X", "Y", "Z"],
  "hint": "Different-angle clue using physical/functional/cultural property — no letter hints"
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

  // ── Core uniqueness check: reject if answer was already used ──────────────
  if (usedAnswers.includes(answer)) {
    throw new Error(
      `Answer "${answer}" is in the used-answer history. Model ignored the blocklist. Retrying with higher temperature.`
    );
  }

  // ── Clue must not contain the answer ─────────────────────────────────────
  if (parsed.clue.toUpperCase().includes(answer)) {
    throw new Error(`Clue literally contains the answer "${answer}". Rejected.`);
  }

  // ── Reject lazy letter-based hints ───────────────────────────────────────
  const badHintPatterns = [
    /starts with/i,
    /first letter/i,
    /\d+ letters/i,
    /letter count/i,
    /ends with/i,
    /it is a [a-z]+ letter/i,
    /contains the letter/i,
  ];
  for (const pat of badHintPatterns) {
    if (pat.test(parsed.hint)) {
      throw new Error(`Hint reveals letter info: "${parsed.hint}". Rejected.`);
    }
  }

  // ── Hint must not be a near-copy of the clue ──────────────────────────────
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
  const keysCount = GROQ_KEYS.length;
  if (keysCount === 0) throw new Error("No Groq API keys configured.");

  // Load language/country prefs
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

  // Load answer history before generating
  await loadUsedAnswers();

  console.log(
    `[GroqService] 🚀 mode=${mode} | cat=${category || "random"} | diff=${difficulty || "default"} | blocked=${usedAnswersCache.length}`
  );

  // Up to MAX_RETRIES_PER_KEY quality retries per key before rotating
  const MAX_RETRIES_PER_KEY = 2;

  for (let keyAttempt = 0; keyAttempt < keysCount; keyAttempt++) {
    const activeKey = GROQ_KEYS[currentKeyIndex];

    for (let qualityRetry = 0; qualityRetry <= MAX_RETRIES_PER_KEY; qualityRetry++) {
      const overallAttempt = keyAttempt * (MAX_RETRIES_PER_KEY + 1) + qualityRetry;

      try {
        console.log(`[GroqService] Key[${currentKeyIndex}] retry=${qualityRetry + 1}`);

        const systemPrompt =
          mode === "shabd"
            ? getShabdSystemPrompt(userLanguage, userCountry, category, difficulty, usedAnswersCache, overallAttempt)
            : getPaheliSystemPrompt(userLanguage, userCountry, category, difficulty, usedAnswersCache, overallAttempt);

        const isHinglish = userLanguage.toLowerCase() === "hindi" && userCountry.toLowerCase() === "india";
        const displayLang = isHinglish ? "Hinglish (Hindi in Roman script)" : userLanguage;

        const catInst  = category  ? ` for category "${category}"` : "";
        const diffInst = difficulty ? ` at difficulty "${difficulty}"` : "";

        const userPrompt =
          mode === "shabd"
            ? `Generate one UNIQUE word scramble puzzle${catInst}${diffInst} in ${displayLang}. The answer must NOT be in the forbidden list. Clue must point to exactly one word. Hint must reveal a physical/sensory property — no letter positions. Context: ${userCountry}.`
            : `Generate one UNIQUE riddle (paheli)${catInst}${diffInst} in ${displayLang}. The answer must NOT be in the forbidden list. Make it poetic. Hint must give a completely different angle — no letter positions. Context: ${userCountry}.`;

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
            // Raise temperature on each quality retry to break repetition
            temperature: Math.min(0.80 + qualityRetry * 0.12, 1.0),
            max_tokens: 450,
            response_format: { type: "json_object" },
          }),
        });

        if (response.status === 429) throw new Error("Rate limit (HTTP 429).");
        if (!response.ok)           throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const resBody  = await response.json();
        const content  = resBody.choices?.[0]?.message?.content;
        if (!content) throw new Error("No content returned from Groq.");

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

        // Throws if answer is duplicate, hint lazy, or clue invalid
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

        // ✅ Persist answer so next call knows not to use it
        await saveUsedAnswer(answer);

        console.log(
          `[GroqService] ✅ answer=${answer} | cat=${matchedCategory} | history=${usedAnswersCache.length}`
        );
        return puzzle;

      } catch (err: any) {
        const isRateLimit = err.message.includes("429");
        console.warn(`[GroqService] ⚠️ ${err.message}`);

        // Rate limit → skip remaining quality retries, rotate key now
        if (isRateLimit) break;

        // Last quality retry on this key → rotate key
        if (qualityRetry === MAX_RETRIES_PER_KEY) break;

        console.log(`[GroqService] 🔄 Quality retry ${qualityRetry + 2} (temp +0.12)...`);
      }
    }

    // Rotate to next key
    currentKeyIndex = (currentKeyIndex + 1) % keysCount;

    if (keyAttempt === keysCount - 1) {
      throw new Error(
        `All ${keysCount} Groq key(s) exhausted. Could not generate a valid unique puzzle.`
      );
    }
  }

  throw new Error("Generation loop terminated unexpectedly.");
}

// ─── Dev utility: wipe history from settings screen ──────────────────────────
export async function clearPuzzleHistory(): Promise<void> {
  usedAnswersCache    = [];
  historyCacheLoaded  = false;
  await AsyncStorage.removeItem(STORAGE_KEY_USED_ANSWERS);
  console.log("[GroqService] 🗑️ Puzzle history cleared.");
}