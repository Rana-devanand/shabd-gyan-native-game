import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_DURATION_MS = 4000;

/** Maps a plain-language name to its BCP-47 locale tag. */
const LANGUAGE_TO_LOCALE: Record<string, string> = {
  hindi: "hi-IN",
  hinglish: "hi-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  marathi: "mr-IN",
  bengali: "bn-IN",
  gujarati: "gu-IN",
  punjabi: "pa-IN",
};

const DEFAULT_LOCALE = "en-IN";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the BCP-47 locale for the given language name (case-insensitive). */
function localeForLanguage(language: string): string {
  const key = language.toLowerCase().trim();
  return LANGUAGE_TO_LOCALE[key] ?? DEFAULT_LOCALE;
}

/**
 * Known female voice name fragments across Android (Google TTS) and iOS (Siri).
 * Matched case-insensitively against the voice identifier or name.
 */
const FEMALE_VOICE_HINTS = [
  // Indian female names used by Google TTS
  "aditi", "priya", "divya", "kavya", "veena", "lekha",
  // Generic female markers
  "female", "woman", "girl",
  // iOS Siri female voices
  "aarav",   // actually male — excluded below via deny-list if needed
  "rishi",   // male
];

const MALE_VOICE_HINTS = ["male", "man", "rishi", "aarav"];

function isFemaleVoice(voice: Speech.Voice): boolean {
  const haystack = `${voice.name ?? ""} ${voice.identifier ?? ""}`.toLowerCase();
  const looksFemale = FEMALE_VOICE_HINTS.some((hint) => haystack.includes(hint));
  const looksMale   = MALE_VOICE_HINTS.some((hint) => haystack.includes(hint));
  return looksFemale && !looksMale;
}

/**
 * Scores a voice so the most natural-sounding *female* option sorts first.
 *
 * Priority:
 *   1. Female  +  Cloud / WaveNet / Neural / Premium   (score 4)
 *   2. Female  +  Enhanced local                       (score 3)
 *   3. Female  +  Standard local                       (score 2)
 *   4. Any     +  Cloud / WaveNet / Neural / Premium   (score 1)
 *   5. Everything else                                 (score 0)
 */
function voiceQualityScore(voice: Speech.Voice): number {
  const name = (voice.name ?? "").toLowerCase();

  const isCloud    = ["network", "wavenet", "neural", "premium"].some((kw) => name.includes(kw));
  const isEnhanced = (voice.quality ?? "").toLowerCase() === "enhanced";
  const isFemale   = isFemaleVoice(voice);

  if (isFemale && isCloud)    return 4;
  if (isFemale && isEnhanced) return 3;
  if (isFemale)               return 2;
  if (isCloud)                return 1;
  return 0;
}

/**
 * Returns the identifier of the best available female voice for the given
 * locale, falling back to the best available voice of any gender if none
 * is detected as female.
 */
async function pickBestVoice(locale: string): Promise<string | undefined> {
  try {
    const allVoices = await Speech.getAvailableVoicesAsync();

    const localeVoices = allVoices.filter((v) =>
      v.language.toLowerCase().replace("_", "-").startsWith(locale.toLowerCase())
    );

    if (localeVoices.length === 0) return undefined;

    const ranked = [...localeVoices].sort(
      (a, b) => voiceQualityScore(b) - voiceQualityScore(a)
    );

    const best = ranked[0];
    const genderLabel = isFemaleVoice(best) ? "female" : "unknown gender";
    console.log(`[TTS] Selected voice: ${best.name} (${best.language}, ${genderLabel})`);
    return best.identifier;
  } catch (err) {
    console.warn("[TTS] Could not retrieve available voices:", err);
    return undefined;
  }
}

/** Strips extra line breaks so the speech engine reads the text smoothly. */
function sanitizeText(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** No-op initializer kept for API compatibility with other TTS adapters. */
export async function initTTS(): Promise<void> {
  console.log("[TTS] Using expo-speech — no initialization required.");
}

/**
 * Speaks the given text using the best available voice for the user's chosen
 * language (stored in AsyncStorage under `game_language`).
 *
 * @param text      - The text to speak.
 * @param onStart   - Called when speech begins.
 * @param onFinish  - Called when speech ends (including on error or stop).
 */
export async function speakText(
  text: string,
  onStart?: () => void,
  onFinish?: () => void
): Promise<void> {
  try {
    // Always stop any in-progress speech before starting a new utterance.
    await Speech.stop();

    const savedLanguage = (await AsyncStorage.getItem("game_language")) ?? "Hindi";
    const locale = localeForLanguage(savedLanguage);
    const voiceId = await pickBestVoice(locale);

    Speech.speak(sanitizeText(text), {
      language: locale,
      voice: voiceId,
      pitch: 1.1,  // Slightly higher pitch — sounds more natural for a female voice.
      rate: 0.78,  // A touch slower than default; gives space for natural intonation.
      onStart: () => onStart?.(),
      onDone: () => onFinish?.(),
      onStopped: () => onFinish?.(),
      onError: (err) => {
        console.warn("[TTS] Speech error:", err);
        onFinish?.();
      },
    });
  } catch (err) {
    console.warn("[TTS] speakText failed — falling back to silent timer:", err);

    // Simulate playback so UI state (e.g. a speaking indicator) still works.
    onStart?.();
    setTimeout(() => onFinish?.(), FALLBACK_DURATION_MS);
  }
}

/** Stops any speech currently playing. */
export async function stopSpeech(): Promise<void> {
  try {
    await Speech.stop();
  } catch (err) {
    console.warn("[TTS] stopSpeech failed:", err);
  }
}