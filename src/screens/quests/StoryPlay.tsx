import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { showMessage } from "react-native-flash-message";
import { generateStoryAndQuestion, StoryQuestion, generateDynamicChapter } from "@/src/services/groqService";
import { awardXP } from "@/src/utils/xpHelper";
import { savePlayedQuiz, recordAdWatched, fetchUserStoryChapter, saveUserStoryChapter, markUserStoryChapterSolved } from "@/src/services/databaseService";
import { speakText, stopSpeech } from "../../utils/ttsHelper";
import { useRewardedAd, TestIds } from "react-native-google-mobile-ads";

const AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : "ca-app-pub-4526433011293142/7471565982";

const { width } = Dimensions.get("window");

export default function StoryPlayScreen() {
  const router = useRouter();
  const { chapterId, chapterTitle, chapterHindiTitle, category, difficulty } = useLocalSearchParams<{
    chapterId?: string;
    chapterTitle?: string;
    chapterHindiTitle?: string;
    category?: string;
    difficulty?: string;
  }>();

  // Theme support
  const textColor = "#FFFFFF"; // Premium dark-themed backdrop
  const subTextColor = "#94A3B8";

  // Game States
  const [loading, setLoading] = useState(true);
  const [storyPuzzle, setStoryPuzzle] = useState<StoryQuestion | null>(null);
  const [scrambledLetters, setScrambledLetters] = useState<
    Array<{ letter: string; tapped: boolean; index: number }>
  >([]);
  const [selectedLetters, setSelectedLetters] = useState<
    Array<{ letter: string; scrambledIndex: number; originalScrambledIndex: number } | null>
  >([]);

  // Phase: "solving" | "solved" | "revealed"
  const [phase, setPhase] = useState<"solving" | "solved" | "revealed">("solving");
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Ad Simulator States
  const [showAdModal, setShowAdModal] = useState(false);
  const [adTimeLeft, setAdTimeLeft] = useState(30);
  const [adMuted, setAdMuted] = useState(false);
  const adTimerRef = useRef<any>(null);

  // Hint State
  const [hintsRemaining, setHintsRemaining] = useState(5);
  const [showHint, setShowHint] = useState(false);
  const [showHintAdModal, setShowHintAdModal] = useState(false);
  const [hintAdTimeLeft, setHintAdTimeLeft] = useState(30);
  const hintAdTimerRef = useRef<any>(null);

  // Real Rewarded Ad Hook
  const { isLoaded, isClosed, load, show, reward } = useRewardedAd(AD_UNIT_ID);

  // Load real ad on mount
  useEffect(() => {
    load();
  }, [load]);

  // Handle real ad state transitions
  useEffect(() => {
    if (isClosed) {
      if (reward) {
        awardHintFromRealAd();
      } else {
        showMessage({
          message: "Ad Closed Early ⚠️",
          description: "Watch the full ad to unlock the hint.",
          type: "warning",
        });
      }
      load(); // Reload next ad
    }
  }, [isClosed, reward, load]);

  const awardHintFromRealAd = async () => {
    try {
      const newHints = hintsRemaining + 1;
      setHintsRemaining(newHints);
      await AsyncStorage.setItem("shabdgyan_hints_remaining", String(newHints));
      setShowHint(true);
      await recordAdWatched("rewarded", "hint_reveal");
      showMessage({
        message: "Hint Unlocked! 💡",
        description: "You watched the full ad. +1 Hint awarded & revealed!",
        type: "success",
      });
    } catch (e) {
      console.warn("[StoryPlay] Failed to award hint after ad:", e);
    }
  };

  // Text-to-Speech State
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);

  // Fetch AI story or Chapter on mount
  useEffect(() => {
    let isMounted = true;
    const fetchStoryOrChapter = async () => {
      setLoading(true);
      try {
        if (chapterId) {
          const numId = Number(chapterId);
          console.log(`[StoryPlay] Loading Chapter ${numId}...`);
          
          // Try fetching existing chapter from Supabase or local cache
          let chRecord = await fetchUserStoryChapter(numId);
          
          if (!chRecord) {
            console.log(`[StoryPlay] Chapter ${numId} not generated yet. Generating dynamically now...`);
            const generated = await generateDynamicChapter(numId);
            
            // Save to database
            chRecord = await saveUserStoryChapter({
              chapter_id: numId,
              title: generated.title,
              hindi_title: generated.hindi_title,
              narrative: generated.narrative,
              puzzle_id: `story_ch_${chapterId}`,
              category: generated.category,
              difficulty: generated.difficulty,
              question: generated.question,
              answer: generated.answer,
              hint: generated.hint,
              language: "Hindi"
            });
          }

          if (isMounted && chRecord) {
            const storyPuzzleData: StoryQuestion = {
              story: chRecord.narrative,
              question: chRecord.question,
              answer: chRecord.answer,
              hint: chRecord.hint,
            };
            setStoryPuzzle(storyPuzzleData);
            initScrambled(chRecord.answer);
            if (chRecord.solved) {
              setPhase("solved");
            } else {
              setPhase("solving");
            }
            setLoading(false);
          }
        } else {
          // Dynamic AI Story Mode
          console.log("[StoryPlay] Requesting new AI story from Groq...");
          const result = await generateStoryAndQuestion();
          if (isMounted) {
            setStoryPuzzle(result);
            initScrambled(result.answer);
            setPhase("solving");
            setLoading(false);
          }
        }
      } catch (e) {
        console.warn("[StoryPlay] Data fetch/generation failed, loading local fallback...", e);
        const fallback: StoryQuestion = {
          story: "A merchant in Old Delhi's spices bazaar claims to have a chest containing the key to Devgiri's vault. He will only barter it for the ground root that turns curry bright yellow. The merchant gives you a bag of letters containing the name of this spice.",
          question: "Arrange the letter tiles to identify this spice.",
          answer: "TURMERIC",
          hint: "A yellow spice commonly used in Indian curries, starting with T.",
        };
        if (isMounted) {
          setStoryPuzzle(fallback);
          initScrambled(fallback.answer);
          setPhase("solving");
          setLoading(false);
        }
      }

      // Load hints remaining and weekly reset
      try {
        const hintsStr = await AsyncStorage.getItem("shabdgyan_hints_remaining");
        const lastResetStr = await AsyncStorage.getItem("shabdgyan_hints_last_reset");
        const now = Date.now();
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

        let hintsVal = 5;
        if (hintsStr) {
          hintsVal = parseInt(hintsStr, 10);
        }

        if (lastResetStr) {
          const lastReset = parseInt(lastResetStr, 10);
          if (now - lastReset >= ONE_WEEK) {
            hintsVal = 5;
            await AsyncStorage.setItem("shabdgyan_hints_remaining", "5");
            await AsyncStorage.setItem("shabdgyan_hints_last_reset", String(now));
          }
        } else {
          await AsyncStorage.setItem("shabdgyan_hints_last_reset", String(now));
          if (!hintsStr) {
            await AsyncStorage.setItem("shabdgyan_hints_remaining", "5");
          }
        }
        setHintsRemaining(hintsVal);
      } catch (err) {
        console.warn("[StoryPlay] Failed to load hints:", err);
      }
    };
    fetchStoryOrChapter();

    return () => {
      isMounted = false;
      if (adTimerRef.current) clearInterval(adTimerRef.current);
      if (hintAdTimerRef.current) clearInterval(hintAdTimerRef.current);
      stopSpeech().catch(() => {});
    };
  }, [chapterId]);

  const initScrambled = (answer: string) => {
    const answerArr = answer.toUpperCase().split("");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const decoyArr: string[] = [];

    // Add 3 random decoy letters
    while (decoyArr.length < 3) {
      const char = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      if (!answerArr.includes(char) && !decoyArr.includes(char)) {
        decoyArr.push(char);
      }
    }

    const combined = [...answerArr, ...decoyArr];
    const scrambled = combined
      .map((letter, index) => ({ letter, tapped: false, index }))
      .sort(() => Math.random() - 0.5);

    setScrambledLetters(scrambled);
    setSelectedLetters(new Array(answer.length).fill(null));
  };

  const handleTapTile = async (
    tile: { letter: string; tapped: boolean; index: number },
    tileIdx: number
  ) => {
    if (tile.tapped || phase !== "solving" || loading) return;

    const emptyIdx = selectedLetters.findIndex((item) => item === null);
    if (emptyIdx === -1) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const newScrambled = [...scrambledLetters];
    newScrambled[tileIdx].tapped = true;
    setScrambledLetters(newScrambled);

    const newSelected = [...selectedLetters];
    newSelected[emptyIdx] = {
      letter: tile.letter,
      scrambledIndex: tile.index,
      originalScrambledIndex: tileIdx,
    };
    setSelectedLetters(newSelected);
  };

  const handleRemoveTile = async (slotIdx: number) => {
    const slotItem = selectedLetters[slotIdx];
    if (!slotItem || phase !== "solving" || loading) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    // Set scrambled tile to untapped using permanent index identifier
    const newScrambled = scrambledLetters.map((tile) => {
      if (tile.index === slotItem.scrambledIndex) {
        return { ...tile, tapped: false };
      }
      return tile;
    });
    setScrambledLetters(newScrambled);

    const newSelected = [...selectedLetters];
    newSelected[slotIdx] = null;
    setSelectedLetters(newSelected);
  };

  const handleBackspace = async () => {
    if (phase !== "solving" || loading) return;

    let lastFilledIdx = -1;
    for (let i = selectedLetters.length - 1; i >= 0; i--) {
      if (selectedLetters[i] !== null) {
        lastFilledIdx = i;
        break;
      }
    }

    if (lastFilledIdx === -1) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const slotItem = selectedLetters[lastFilledIdx];
    if (slotItem) {
      // Set scrambled tile to untapped using permanent index identifier
      const newScrambled = scrambledLetters.map((tile) => {
        if (tile.index === slotItem.scrambledIndex) {
          return { ...tile, tapped: false };
        }
        return tile;
      });
      setScrambledLetters(newScrambled);

      const newSelected = [...selectedLetters];
      newSelected[lastFilledIdx] = null;
      setSelectedLetters(newSelected);
    }
  };

  const handleResetPuzzle = async () => {
    if (phase !== "solving" || loading || !storyPuzzle) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}

    // Set all scrambled tiles back to untapped
    const resetScrambled = scrambledLetters.map((item) => ({ ...item, tapped: false }));
    setScrambledLetters(resetScrambled);
    setSelectedLetters(new Array(storyPuzzle.answer.length).fill(null));
  };

  // Shuffle scrambled letters pool with ease-in-out layout animation
  const handleShuffle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    // Configure layout animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setScrambledLetters((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const handleSubmit = async () => {
    if (!storyPuzzle) return;

    if (selectedLetters.some((item) => item === null)) {
      showMessage({
        message: "Word Incomplete ⚠️",
        description: "Please fill all letter slots first!",
        type: "warning",
      });
      return;
    }

    const userWord = selectedLetters.map((item) => item?.letter).join("").toUpperCase();
    const correctWord = storyPuzzle.answer.toUpperCase();

    if (userWord === correctWord) {
      setPhase("solved");
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (chapterId) {
          const numId = Number(chapterId);
          await markUserStoryChapterSolved(numId);
          await awardXP(50, "story_chapter_solved", `story_ch_${chapterId}`);
          await savePlayedQuiz({
            puzzleId: `story_ch_${chapterId}`,
            category: category || "Story Chapter",
            difficulty: difficulty || "Medium",
            mode: "story_chapter",
            question: storyPuzzle.story + " " + storyPuzzle.question,
            answer: storyPuzzle.answer,
            usedHint: showHint,
            revealedAnswer: false,
            coinsEarned: 50,
            userAnswer: storyPuzzle.answer
          });
        } else {
          // Dynamic AI Story Mode
          await awardXP(50, "ai_story_solved", "ai_story_" + storyPuzzle.answer);
          await savePlayedQuiz({
            puzzleId: "ai_story_" + storyPuzzle.answer,
            category: "AI Story",
            difficulty: "Hard",
            mode: "story",
            question: storyPuzzle.story + " " + storyPuzzle.question,
            answer: storyPuzzle.answer,
            usedHint: showHint,
            revealedAnswer: false,
            coinsEarned: 50,
            userAnswer: storyPuzzle.answer
          });
        }
      } catch (e) {
        console.warn("[StoryPlay] XP/Quiz save failed:", e);
      }

      showMessage({
        message: "Correct Answer! 🎉",
        description: "Mystery Decoded! You earned +50 XP!",
        type: "success",
        duration: 3500,
      });
    } else {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
      showMessage({
        message: "Incorrect Answer ❌",
        description: "Arrange the tiles in the correct order and submit again!",
        type: "danger",
        duration: 1800,
      });
    }
  };

  // Ad Simulator Actions
  const startAdSimulation = () => {
    setShowAdModal(true);
    setAdTimeLeft(30);
    adTimerRef.current = setInterval(() => {
      setAdTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(adTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closeAdAndReveal = () => {
    if (adTimeLeft > 0) return;
    setShowAdModal(false);
    setPhase("revealed");

    if (storyPuzzle) {
      if (chapterId) {
        const numId = Number(chapterId);
        markUserStoryChapterSolved(numId).catch(() => {});
        savePlayedQuiz({
          puzzleId: `story_ch_${chapterId}`,
          category: category || "Story Chapter",
          difficulty: difficulty || "Medium",
          mode: "story_chapter",
          question: storyPuzzle.story + " " + storyPuzzle.question,
          answer: storyPuzzle.answer,
          usedHint: showHint,
          revealedAnswer: true,
          coinsEarned: 0,
          userAnswer: ""
        }).catch(() => {});
      } else {
        savePlayedQuiz({
          puzzleId: "ai_story_" + storyPuzzle.answer,
          category: "AI Story",
          difficulty: "Hard",
          mode: "story",
          question: storyPuzzle.story + " " + storyPuzzle.question,
          answer: storyPuzzle.answer,
          usedHint: showHint,
          revealedAnswer: true,
          coinsEarned: 0,
          userAnswer: ""
        }).catch(() => {});
      }
    }

    // Automatically arrange the correct word into slots to visual-feedback the solution
    if (storyPuzzle) {
      const correctArr = storyPuzzle.answer.toUpperCase().split("");
      const resolvedSlots = correctArr.map((letter, idx) => ({
        letter,
        scrambledIndex: idx,
        originalScrambledIndex: idx,
      }));
      setSelectedLetters(resolvedSlots);
    }

    showMessage({
      message: "Answer Revealed! 💡",
      description: "You have watched the full ad. The answer is now revealed (0 XP awarded).",
      type: "info",
      duration: 3500,
    });
  };

  // Start the Hint Ad Simulation Timer
  const startHintAdSimulation = () => {
    setShowHintAdModal(true);
    setHintAdTimeLeft(30);
    if (hintAdTimerRef.current) {
      clearInterval(hintAdTimerRef.current);
    }
    hintAdTimerRef.current = setInterval(() => {
      setHintAdTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(hintAdTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Close the ad modal, award +1 hint, log it, and reveal the hint
  const closeHintAdAndReward = async () => {
    if (hintAdTimeLeft > 0) return;
    setShowHintAdModal(false);

    try {
      const newHints = hintsRemaining + 1;
      setHintsRemaining(newHints);
      await AsyncStorage.setItem("shabdgyan_hints_remaining", String(newHints));
      
      // Auto-unlock the hint
      setShowHint(true);

      // Log ad watch to database
      await recordAdWatched("rewarded", "hint_reveal");

      showMessage({
        message: "Hint Unlocked! 💡",
        description: "You watched the full ad. +1 Hint awarded & revealed!",
        type: "success",
      });
    } catch (e) {
      console.warn("[StoryPlay] Failed to award hint after ad:", e);
    }
  };

  const handleAbandon = async () => {
    setShowExitConfirm(false);
    await stopSpeech();
    router.replace("/(authenticated)/(tabs)/story");
  };

  const handleToggleSpeech = async () => {
    if (isPlayingSpeech) {
      await stopSpeech();
      setIsPlayingSpeech(false);
    } else if (storyPuzzle) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}

      let combinedText = storyPuzzle.story;
      try {
        const gameLang = (await AsyncStorage.getItem("game_language")) || "Hindi";
        const lang = gameLang.toLowerCase().trim();
        let prefix = " . . . Tricky Question: ";
        if (lang === "hindi") {
          prefix = " . . . कठिन प्रश्न: ";
        } else if (lang === "tamil") {
          prefix = " . . . சவாலான கேள்வி: ";
        } else if (lang === "telugu") {
          prefix = " . . . చిక్కు ప్రశ్న: ";
        } else if (lang === "marathi") {
          prefix = " . . . अवघड प्रश्न: ";
        } else if (lang === "bengali") {
          prefix = " . . . কঠিন প্রশ্ন: ";
        } else if (lang === "gujarati") {
          prefix = " . . . અઘરો પ્રશ્ન: ";
        } else if (lang === "punjabi") {
          prefix = " . . . ਔਖਾ ਸਵਾਲ: ";
        }
        combinedText = `${storyPuzzle.story}${prefix}${storyPuzzle.question}`;
      } catch (err) {
        combinedText = `${storyPuzzle.story} . . . Tricky Question: ${storyPuzzle.question}`;
      }

      await speakText(
        combinedText,
        () => setIsPlayingSpeech(true),
        () => setIsPlayingSpeech(false)
      );
    }
  };

  // Rendering loader view
  if (loading || !storyPuzzle) {
    return (
      <LinearGradient colors={["#1E1B4B", "#0F0E26"]} style={styles.container}>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#7E57C2" />
          <Text style={styles.loaderText}>GENERATING MYSTERY STORY...</Text>
          <Text style={styles.loaderSub}>Llama is drafting an ancient Indian riddle story for you...</Text>
        </View>
      </LinearGradient>
    );
  }

  const answerLength = storyPuzzle.answer.length;
  const slotWidth = Math.min(54, (width - 48 - (answerLength * 6)) / answerLength);
  const slotHeight = slotWidth * 1.15;
  const slotFontSize = Math.max(16, slotWidth * 0.5);

  return (
    <LinearGradient colors={["#1E1B4B", "#0F0E26"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setShowExitConfirm(true)} style={styles.exitBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>AI Story Solver</Text>
            <Text style={styles.headerSubtitle}>CHAMBER CHALLENGE</Text>
          </View>
          <View style={styles.xpPill}>
            <FontAwesome5 name="award" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
            <Text style={styles.xpText}>+50 XP</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Parchment Styled Story Card */}
          <View style={styles.parchmentContainer}>
            <LinearGradient colors={["#FFFDF0", "#F7F3D7"]} style={styles.parchmentGradient}>
              <View style={[styles.parchmentHeader, { justifyContent: "space-between", width: "100%" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="document-text" size={16} color="#78350F" />
                  <Text style={styles.parchmentTitle}>ANCIENT RULING</Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleSpeech}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: "rgba(120, 53, 15, 0.06)",
                    padding: 6,
                    borderRadius: 20,
                  }}
                >
                  <Ionicons
                    name={isPlayingSpeech ? "volume-high" : "volume-medium-outline"}
                    size={16}
                    color="#78350F"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.storyText}>{storyPuzzle.story}</Text>
            </LinearGradient>
          </View>

          {/* Tricky Question Card */}
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Ionicons name="help-circle-outline" size={18} color="#7E57C2" />
              <Text style={styles.questionLabel}>TRICK QUESTION</Text>
            </View>
            <Text style={styles.questionText}>{storyPuzzle.question}</Text>
          </View>

          {/* Solved / Revealed Status banner */}
          {phase === "solved" && (
            <View style={[styles.statusBanner, styles.statusBannerWon]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.statusTitle}>Mystery Decoded!</Text>
              <Text style={styles.statusDesc}>
                The answer was <Text style={{ fontWeight: "bold" }}>{storyPuzzle.answer}</Text>. You earned +50 XP!
              </Text>
            </View>
          )}

          {phase === "revealed" && (
            <View style={[styles.statusBanner, styles.statusBannerRevealed]}>
              <Ionicons name="eye" size={24} color="#7E57C2" />
              <Text style={[styles.statusTitle, { color: "#7E57C2" }]}>Answer Revealed!</Text>
              <Text style={styles.statusDesc}>
                The correct word is: <Text style={{ fontWeight: "bold" }}>{storyPuzzle.answer}</Text> (0 XP awarded).
              </Text>
            </View>
          )}

          {/* Answer Slots */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>YOUR SOLVE ANSWER</Text>
            <Text style={styles.sectionMeta}>
              {selectedLetters.filter((x) => x !== null).length}/{answerLength}
            </Text>
          </View>

          <View style={styles.slotsRow}>
            {selectedLetters.map((slot, idx) => (
              <TouchableOpacity
                key={`slot_${idx}`}
                activeOpacity={0.7}
                disabled={phase !== "solving"}
                onPress={() => handleRemoveTile(idx)}
                style={[
                  styles.slot,
                  { width: slotWidth, height: slotHeight },
                  slot ? styles.slotFilled : styles.slotEmpty,
                ]}
              >
                <Text style={[styles.slotLetter, { fontSize: slotFontSize }]}>
                  {slot ? slot.letter : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hint Disclosure */}
          {showHint && storyPuzzle && (
            <View style={{ alignItems: "center", marginVertical: 10 }}>
              <View style={[styles.hintTextBubble, { backgroundColor: "rgba(251, 191, 36, 0.12)", borderColor: "rgba(251, 191, 36, 0.25)", borderWidth: 1, padding: 14, borderRadius: 14, width: "100%" }]}>
                <Text style={{ color: "#FBBF24", fontWeight: "bold", fontSize: 13, marginBottom: 4 }}>Hint Details:</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 18 }}>{storyPuzzle.hint}</Text>
              </View>
            </View>
          )}

          {/* Scrambled letter tiles pool */}
          {phase === "solving" && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>LETTER POOL</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={styles.sectionMeta}>Tap tiles to select</Text>
                  <TouchableOpacity
                    onPress={handleShuffle}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(126, 87, 194, 0.15)",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "rgba(126, 87, 194, 0.3)",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="shuffle-outline" size={13} color="#A78BFA" />
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: "#A78BFA", fontFamily: "PlusJakartaSans_700Bold" }}>SHUFFLE</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tilesPool}>
                {scrambledLetters.map((tile, idx) => (
                  <TouchableOpacity
                    key={`tile_${tile.index}_${idx}`}
                    activeOpacity={0.8}
                    onPress={() => handleTapTile(tile, idx)}
                    disabled={tile.tapped || loading}
                    style={[styles.tile, tile.tapped ? styles.tileTapped : styles.tileActive]}
                  >
                    <Text style={[styles.tileLetter, tile.tapped && styles.tileLetterTapped]}>
                      {tile.letter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Action Footer */}
          <View style={styles.footerContainer}>
            {phase === "solving" ? (
              <>
                <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Submit Resolve</Text>
                </TouchableOpacity>

                <View style={styles.rowActions}>
                  <TouchableOpacity onPress={handleBackspace} style={[styles.actionBtn, { backgroundColor: "#D97706" }]}>
                    <Ionicons name="backspace" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleResetPuzzle} style={[styles.actionBtn, { backgroundColor: "#4B5563" }]}>
                    <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnText}>Reset</Text>
                  </TouchableOpacity>
                </View>

                {hintsRemaining > 0 ? (
                  <TouchableOpacity
                    onPress={async () => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { }
                      if (!showHint) {
                        const newHints = Math.max(0, hintsRemaining - 1);
                        setHintsRemaining(newHints);
                        await AsyncStorage.setItem("shabdgyan_hints_remaining", String(newHints));
                        setShowHint(true);
                        showMessage({
                          message: "Hint Unlocked! 💡",
                          description: `1 hint consumed. You have ${newHints} hints left.`,
                          type: "info",
                        });
                      } else {
                        setShowHint(false);
                      }
                    }}
                    style={[styles.revealBtn, { backgroundColor: showHint ? "rgba(251, 191, 36, 0.12)" : "rgba(255, 255, 255, 0.05)", borderColor: showHint ? "#FBBF24" : "rgba(255, 255, 255, 0.15)", borderWidth: 1, marginBottom: 10 }]}
                  >
                    <MaterialCommunityIcons name="lightbulb-on" size={18} color="#FBBF24" style={{ marginRight: 6 }} />
                    <Text style={[styles.revealBtnText, { color: showHint ? "#FBBF24" : "#FFFFFF" }]}>
                      Unlock Hint ({hintsRemaining} Left)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) { }
                      if (isLoaded) {
                        show();
                      } else {
                        startHintAdSimulation();
                      }
                    }}
                    style={[styles.revealBtn, { borderColor: "#EF4444", borderWidth: 1, backgroundColor: "rgba(239, 68, 68, 0.1)", marginBottom: 10 }]}
                  >
                    <Ionicons name="play-circle-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={[styles.revealBtnText, { color: "#EF4444", fontWeight: "bold" }]}>
                      Watch Ad for Hint
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={startAdSimulation} style={styles.revealBtn}>
                  <Ionicons name="eye" size={18} color="#7E57C2" style={{ marginRight: 6 }} />
                  <Text style={styles.revealBtnText}>Reveal Answer (Watch 30s Ad)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => router.replace("/(authenticated)/(tabs)/story")}
                style={[styles.submitBtn, { backgroundColor: "#7E57C2" }]}
              >
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Return to Chambers</Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>

        {/* Abandon Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showExitConfirm}
          onRequestClose={() => setShowExitConfirm(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Ionicons name="warning" size={48} color="#D97706" />
              <Text style={styles.modalTitle}>Abandon Story? ⚠️</Text>
              <Text style={styles.modalDesc}>
                Leaving now will lose your current riddle story progression. Are you sure you want to go back to the chamber?
              </Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity onPress={() => setShowExitConfirm(false)} style={[styles.modalBtn, styles.modalBtnCancel]}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAbandon} style={[styles.modalBtn, styles.modalBtnConfirm]}>
                  <Text style={styles.modalBtnConfirmText}>Exit Chamber</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 30s Rewarded Ad Simulator Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showAdModal}
          onRequestClose={() => {}}
        >
          <View style={styles.modalBackdrop}>
            <LinearGradient colors={["#0B0F19", "#1E1B4B"]} style={styles.adContent}>
              {/* Ad Header */}
              <View style={styles.adHeader}>
                <View style={styles.adBadge}>
                  <Text style={styles.adBadgeText}>SPONSORED AD</Text>
                </View>
                <TouchableOpacity onPress={() => setAdMuted(!adMuted)} style={styles.adMuteBtn}>
                  <Ionicons name={adMuted ? "volume-mute" : "volume-high"} size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Mock Video Content */}
              <View style={styles.adVideoBody}>
                <LinearGradient colors={["#8B5CF6", "#6D28D9"]} style={styles.mockVideoCard}>
                  <MaterialCommunityIcons name="gamepad-variant" size={64} color="#FFFFFF" style={{ marginBottom: 12 }} />
                  <Text style={styles.mockVideoTitle}>Lexara Word Hub</Text>
                  <Text style={styles.mockVideoSub}>Play levels, climb leaderboards, and solve daily word scrolls!</Text>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 20 }} />
                </LinearGradient>
              </View>

              {/* Ad Footer */}
              <View style={styles.adFooter}>
                <Text style={styles.adInstruction}>Watch fully to reveal the correct solution...</Text>
                {adTimeLeft > 0 ? (
                  <View style={styles.adCountBox}>
                    <Text style={styles.adCountText}>Unlocks in {adTimeLeft}s</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={closeAdAndReveal} style={styles.adCloseBtn}>
                    <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.adCloseBtnText}>Close Ad & Reveal</Text>
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  loaderText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 1,
    marginTop: 10,
  },
  loaderSub: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#7E57C2",
    fontSize: 9,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1.5,
    fontWeight: "bold",
  },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  xpText: {
    color: "#FBBF24",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  parchmentContainer: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E6DFB8",
    marginBottom: 20,
    elevation: 3,
  },
  parchmentGradient: {
    padding: 20,
  },
  parchmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  parchmentTitle: {
    color: "#78350F",
    fontSize: 9,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  storyText: {
    color: "#4A3E25",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 22,
    fontStyle: "italic",
    textAlign: "left",
  },
  questionCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  questionLabel: {
    color: "#7E57C2",
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  questionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    lineHeight: 20,
  },
  statusBanner: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  statusBannerWon: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "#10B981",
  },
  statusBannerRevealed: {
    backgroundColor: "rgba(126, 87, 194, 0.1)",
    borderColor: "#7E57C2",
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    color: "#10B981",
  },
  statusDesc: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_500Medium",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  sectionMeta: {
    color: "#94A3B8",
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  slotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 24,
  },
  slot: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  slotEmpty: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "#1E293B",
  },
  slotFilled: {
    backgroundColor: "rgba(126, 87, 194, 0.12)",
    borderColor: "#7E57C2",
  },
  slotLetter: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontWeight: "900",
  },
  tilesPool: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 28,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  tileActive: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  tileTapped: {
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    opacity: 0.25,
  },
  tileLetter: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontWeight: "900",
  },
  tileLetterTapped: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  footerContainer: {
    gap: 12,
    marginTop: 10,
  },
  submitBtn: {
    width: "100%",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  rowActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  revealBtn: {
    width: "100%",
    backgroundColor: "rgba(126, 87, 194, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(126, 87, 194, 0.3)",
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  revealBtnText: {
    color: "#7E57C2",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#0B0F19",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalDesc: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
    lineHeight: 18,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#1E293B",
  },
  modalBtnCancelText: {
    color: "#94A3B8",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  modalBtnConfirm: {
    backgroundColor: "#EF4444",
  },
  modalBtnConfirmText: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  adContent: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 20,
    gap: 16,
    alignItems: "center",
  },
  adHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1,
  },
  adMuteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  adVideoBody: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
  },
  mockVideoCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  mockVideoTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  mockVideoSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  adFooter: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  adInstruction: {
    color: "#94A3B8",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  adCountBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  adCountText: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  adCloseBtn: {
    width: "100%",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  adCloseBtnText: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
});
