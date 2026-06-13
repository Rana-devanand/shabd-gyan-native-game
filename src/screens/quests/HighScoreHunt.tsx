import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
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
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { showMessage } from "react-native-flash-message";
import { generatePuzzle } from "@/src/services/groqService";
import { Puzzle } from "@/src/constants/puzzles";
import { awardXP } from "@/src/utils/xpHelper";
import { Audio } from "expo-av";
import { useMusic } from "@/src/context/MusicContext";
import { saveQuestStatus, savePlayedQuiz, recordAdWatched } from "@/src/services/databaseService";
import { useRewardedAd, TestIds } from "react-native-google-mobile-ads";

const AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : "ca-app-pub-4526433011293142/7471565982";

const { width } = Dimensions.get("window");

export default function HighScoreHuntScreen() {
  const router = useRouter();

  // Screen Phase: "intro" | "playing" | "results"
  const [phase, setPhase] = useState<"intro" | "playing" | "results">("intro");

  // Game States
  const [loading, setLoading] = useState(true);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [nextPuzzle, setNextPuzzle] = useState<Puzzle | null>(null); // Pre-fetched next puzzle
  const [scrambledLetters, setScrambledLetters] = useState<
    Array<{ letter: string; tapped: boolean; index: number }>
  >([]);
  const [selectedLetters, setSelectedLetters] = useState<
    Array<{ letter: string; scrambledIndex: number; originalScrambledIndex: number } | null>
  >([]);

  // Tally & Timers
  const [timeLeft, setTimeLeft] = useState(30);
  const [sessionXP, setSessionXP] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Hint State
  const [hintsRemaining, setHintsRemaining] = useState(5);
  const [showHint, setShowHint] = useState(false);
  const [showHintAdModal, setShowHintAdModal] = useState(false);
  const [hintAdTimeLeft, setHintAdTimeLeft] = useState(30);
  const [usedHint, setUsedHint] = useState(false);
  const hintAdTimerRef = useRef<any>(null);

  // Real Rewarded Ad Hook
  const [isRealAdShowing, setIsRealAdShowing] = useState(false);
  const { isLoaded, isClosed, load, show, reward } = useRewardedAd(AD_UNIT_ID);

  // Load real ad on mount
  useEffect(() => {
    load();
  }, [load]);

  // Handle real ad state transitions
  useEffect(() => {
    if (isClosed) {
      setIsRealAdShowing(false);
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
      setUsedHint(true);
      await recordAdWatched("rewarded", "hint_reveal");
      showMessage({
        message: "Hint Unlocked! 💡",
        description: "You watched the full ad. +1 Hint awarded & revealed!",
        type: "success",
      });
    } catch (e) {
      console.warn("[HighScoreHunt] Failed to award hint after ad:", e);
    }
  };

  // References
  const timerRef = useRef<any>(null);

  const { soundEnabled } = useMusic();
  const tickSoundRef = useRef<Audio.Sound | null>(null);
  const bgMusicRef = useRef<Audio.Sound | null>(null);

  // Load and play ticking and background music during gameplay
  useEffect(() => {
    let active = true;

    const startAudio = async () => {
      if (!soundEnabled) return;
      try {
        // Stop/unload existing first just in case
        if (tickSoundRef.current) {
          try { await tickSoundRef.current.unloadAsync(); } catch (e) {}
        }
        if (bgMusicRef.current) {
          try { await bgMusicRef.current.unloadAsync(); } catch (e) {}
        }

        // Load tick-tick sound
        const { sound: tickSound } = await Audio.Sound.createAsync(
          require("../../../assets/game_music/clock_tick_tick.mp3"),
          { shouldPlay: true, isLooping: true, volume: 0.3 }
        );
        if (active) {
          tickSoundRef.current = tickSound;
        } else {
          await tickSound.unloadAsync();
        }

        // Load background clock music
        const { sound: bgMusic } = await Audio.Sound.createAsync(
          require("../../../assets/game_music/clock_based_musix.mp3"),
          { shouldPlay: true, isLooping: true, volume: 0.3 }
        );
        if (active) {
          bgMusicRef.current = bgMusic;
        } else {
          await bgMusic.unloadAsync();
        }
      } catch (err) {
        console.warn("Error starting countdown audio:", err);
      }
    };

    if (phase === "playing" && !loading) {
      startAudio();
    }

    return () => {
      active = false;
      const cleanup = async () => {
        if (tickSoundRef.current) {
          try {
            await tickSoundRef.current.stopAsync();
            await tickSoundRef.current.unloadAsync();
          } catch (e) {}
          tickSoundRef.current = null;
        }
        if (bgMusicRef.current) {
          try {
            await bgMusicRef.current.stopAsync();
            await bgMusicRef.current.unloadAsync();
          } catch (e) {}
          bgMusicRef.current = null;
        }
      };
      cleanup();
    };
  }, [phase, loading, soundEnabled]);

  // Check if already completed today on mount
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      const status = await AsyncStorage.getItem("quest_high_score_hunt_status");
      if (status === "completed" || status === "played") {
        if (isMounted) {
          router.replace("/(authenticated)/(tabs)/quest");
          showMessage({
            message: "Quest Already Played Today! 🔒",
            description: "You have already completed or attempted this daily quest today. Please try again tomorrow!",
            type: "warning",
          });
        }
        return;
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
        if (isMounted) {
          setHintsRemaining(hintsVal);
        }
      } catch (err) {
        console.warn("[HighScoreHunt] Failed to load hints:", err);
      }
    };
    checkStatus();

    return () => {
      isMounted = false;
      if (hintAdTimerRef.current) clearInterval(hintAdTimerRef.current);
    };
  }, []);

  // pre-fetch puzzle helper
  const preFetchNextPuzzle = async () => {
    try {
      const mode = Math.random() > 0.5 ? "shabd" : "paheli";
      const p = await generatePuzzle(mode, undefined, "Hard");
      setNextPuzzle(p);
    } catch (e) {
      // fallback pre-fetch
      const fallback: Puzzle = {
        id: "hsh_fallback_" + Math.random(),
        category: "City Life",
        clue: "A large motor vehicle carrying passengers by road, especially one serving the public on a fixed route.",
        answer: "BUS",
        decoys: ["Z", "P", "F"],
        hint: "Public transportation on wheels.",
      };
      setNextPuzzle(fallback);
    }
  };

  // Start the game after clicking "Start Hunt"
  const startGame = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch(e){}
    setPhase("playing");
    setLoading(true);
    try {
      const first = await generatePuzzle("shabd", undefined, "Hard");
      setCurrentPuzzle(first);
      initScrambled(first);
      setLoading(false);
      // Begin pre-fetching the second puzzle in background
      preFetchNextPuzzle();
    } catch (e) {
      const fallback: Puzzle = {
        id: "hsh_first_" + Date.now(),
        category: "Fruits & Food",
        clue: "A cooling dairy beverage, commonly churned with water, spices, and sometimes roasted cumin.",
        answer: "CHAAS",
        decoys: ["W", "G", "V"],
        hint: "Indian salted buttermilk consumed in summer.",
      };
      setCurrentPuzzle(fallback);
      initScrambled(fallback);
      setLoading(false);
      preFetchNextPuzzle();
    }
  };

  // Timer countdown loop
  useEffect(() => {
    if (phase !== "playing" || loading || showHintAdModal || isRealAdShowing) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishGame(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, loading, showHintAdModal, isRealAdShowing]);

  const initScrambled = (p: Puzzle) => {
    const answerArr = p.answer.toUpperCase().split("");
    const decoyArr = p.decoys.map((d) => d.toUpperCase());
    const combined = [...answerArr, ...decoyArr];

    const scrambled = combined
      .map((letter, index) => ({ letter, tapped: false, index }))
      .sort(() => Math.random() - 0.5);

    setScrambledLetters(scrambled);
    setSelectedLetters(new Array(p.answer.length).fill(null));
  };

  // Move to next question, adding remaining time
  const handleSolveCorrect = async () => {
    setShowHint(false);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    const remaining = timeLeft;
    const addedTime = 30 + remaining;
    setTimeLeft(addedTime);

    setSessionXP((prev) => prev + 130);
    setSolvedCount((prev) => prev + 1);

    showMessage({
      message: `Correct! 🎉 +130 XP`,
      description: `Remaining ${remaining}s added! Timer is now ${addedTime}s!`,
      type: "success",
      duration: 2500,
    });

    // Advance to pre-fetched puzzle
    if (nextPuzzle) {
      const next = nextPuzzle;
      setCurrentPuzzle(next);
      initScrambled(next);
      setNextPuzzle(null);
      // Pre-fetch another in the background
      preFetchNextPuzzle();
    } else {
      setLoading(true);
      try {
        const fresh = await generatePuzzle("shabd", undefined, "Hard");
        setCurrentPuzzle(fresh);
        initScrambled(fresh);
        setLoading(false);
        preFetchNextPuzzle();
      } catch (e) {
        const fallback: Puzzle = {
          id: "hsh_fallback_sol_" + Date.now(),
          category: "Nature",
          clue: "A large body of water surrounded by land.",
          answer: "LAKE",
          decoys: ["Y", "O", "P"],
          hint: "Smaller than an ocean, freshwater body.",
        };
        setCurrentPuzzle(fallback);
        initScrambled(fallback);
        setLoading(false);
        preFetchNextPuzzle();
      }
    }
  };

  const handleSolveIncorrect = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}

    setSessionXP((prev) => prev - 50);

    showMessage({
      message: "Incorrect Answer ❌ -50 XP",
      description: "Arrange the tiles in the correct order and submit again!",
      type: "danger",
      duration: 1500,
    });
  };

  const finishGame = async (isTimeUp: boolean = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("results");

    if (isTimeUp && soundEnabled) {
      try {
        const { sound: goSound } = await Audio.Sound.createAsync(
          require("../../../assets/game_music/game_over_music.mp3"),
          { shouldPlay: true, isLooping: false, volume: 0.5 }
        );
        goSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            goSound.unloadAsync().catch(() => {});
          }
        });
      } catch (err) {
        console.warn("Error playing game over sound:", err);
      }
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Update high_score_hunt status to completed
      await AsyncStorage.setItem("quest_high_score_hunt_status", "completed");
      await saveQuestStatus("high_score_hunt", "completed", sessionXP);
      
      await savePlayedQuiz({
        puzzleId: "high_score_hunt_" + Date.now(),
        category: "High Score Hunt",
        difficulty: "Hard",
        mode: "quests",
        question: `Solved ${solvedCount} puzzles in High Score Hunt.`,
        answer: "HUNT_COMPLETED",
        usedHint: usedHint,
        revealedAnswer: false,
        coinsEarned: sessionXP,
        userAnswer: "HUNT_COMPLETED"
      });

      // Commit session XP (it can be negative or positive, but capped at total score >= 0 by xpHelper)
      if (sessionXP !== 0) {
        await awardXP(sessionXP, "high_score_hunt_completed");
      }
    } catch (e) {}
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
      
      // Auto-unlock the hint and track usage
      setShowHint(true);
      setUsedHint(true);

      // Log ad watch to database
      await recordAdWatched("rewarded", "hint_reveal");

      showMessage({
        message: "Hint Unlocked! 💡",
        description: "You watched the full ad. +1 Hint awarded & revealed!",
        type: "success",
      });
    } catch (e) {
      console.warn("[HighScoreHunt] Failed to award hint after ad:", e);
    }
  };

  const handleTapScrambled = async (
    tile: { letter: string; tapped: boolean; index: number },
    tileIdx: number
  ) => {
    if (tile.tapped || loading) return;

    const emptyIdx = selectedLetters.findIndex((item) => item === null);
    if (emptyIdx === -1) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) { }

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

  const handleRemoveSelected = async (slotIdx: number) => {
    const slotItem = selectedLetters[slotIdx];
    if (!slotItem || loading) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) { }

    // Set scrambled tile to untapped using its permanent index identifier
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
    if (loading || !currentPuzzle) return;

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
    } catch (e) { }

    const slotItem = selectedLetters[lastFilledIdx];
    if (slotItem) {
      // Set scrambled tile to untapped using its permanent index identifier
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
    if (!currentPuzzle || loading) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) { }

    const resetScrambled = scrambledLetters.map((item) => ({ ...item, tapped: false }));
    setScrambledLetters(resetScrambled);
    setSelectedLetters(new Array(currentPuzzle.answer.length).fill(null));
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

  const handleSubmit = () => {
    if (selectedLetters.some((item) => item === null)) {
      showMessage({
        message: "Word Incomplete ⚠️",
        description: "Please fill all letter slots first!",
        type: "warning",
      });
      return;
    }

    const userWord = selectedLetters.map((item) => item?.letter).join("").toUpperCase();
    const correctWord = currentPuzzle?.answer.toUpperCase();

    if (userWord === correctWord) {
      handleSolveCorrect();
    } else {
      handleSolveIncorrect();
    }
  };

  // ─── 1. INTRO/GUIDE VIEW ──────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <LinearGradient colors={["#1E1B4B", "#0F0E26"]} style={styles.container}>
        <SafeAreaView style={[styles.safeArea, { justifyContent: "center" }]}>
          <View style={styles.guideCard}>
            <View style={styles.guideIconOuter}>
              <Ionicons name="flash" size={56} color="#FBBF24" />
            </View>
            <Text style={styles.guideTitle}>High Score Hunt ⚡</Text>
            <Text style={styles.guideSubtitle}>RULES & GUIDANCE</Text>

            <View style={styles.rulesList}>
              <View style={styles.ruleRow}>
                <Ionicons name="time" size={20} color="#FBBF24" />
                <Text style={styles.ruleText}>
                  Start with a <Text style={{ fontWeight: "bold", color: "#FFFFFF" }}>30-second</Text> base timer per question.
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Ionicons name="add-circle" size={20} color="#10B981" />
                <Text style={styles.ruleText}>
                  Solving correctly auto-advances and adds your remaining time directly to the next question.
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Ionicons name="trophy" size={20} color="#F59E0B" />
                <Text style={styles.ruleText}>
                  Each correct answer grants <Text style={{ fontWeight: "bold", color: "#10B981" }}>+130 XP</Text>.
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Ionicons name="remove-circle" size={20} color="#EF4444" />
                <Text style={styles.ruleText}>
                  Incorrect submissions deduct <Text style={{ fontWeight: "bold", color: "#EF4444" }}>-50 XP</Text> from your score.
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Ionicons name="log-out" size={20} color="#3B82F6" />
                <Text style={styles.ruleText}>
                  You can end the hunt manually at any time to lock in your gained XP!
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={startGame} style={styles.startBtn}>
              <Text style={styles.startBtnText}>Start Hunt Challenge</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── 2. RESULTS VIEW ──────────────────────────────────────────────────────
  if (phase === "results") {
    return (
      <LinearGradient colors={["#0F1E19", "#08120E"]} style={styles.container}>
        <SafeAreaView style={[styles.safeArea, { justifyContent: "center" }]}>
          <View style={styles.guideCard}>
            <View style={[styles.guideIconOuter, { backgroundColor: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.3)" }]}>
              <FontAwesome5 name="fire-alt" size={48} color="#10B981" />
            </View>
            <Text style={styles.guideTitle}>Hunt Summary! 🏆</Text>
            <Text style={[styles.guideSubtitle, { color: "#10B981" }]}>QUEST COMPLETE</Text>

            <View style={styles.resultsPanel}>
              <View style={styles.resultItem}>
                <Text style={styles.resultItemLabel}>Questions Solved</Text>
                <Text style={[styles.resultItemValue, { color: "#FFFFFF" }]}>{solvedCount}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultItemLabel}>XP Gained</Text>
                <Text style={[styles.resultItemValue, { color: sessionXP >= 0 ? "#10B981" : "#EF4444" }]}>
                  {sessionXP >= 0 ? `+${sessionXP}` : sessionXP} XP
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.replace("/(authenticated)/(tabs)/quest")}
              style={[styles.startBtn, { backgroundColor: "#10B981" }]}
            >
              <Text style={styles.startBtnText}>Return to Quest Board</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── 3. PLAYING VIEW ──────────────────────────────────────────────────────
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const answerLength = currentPuzzle?.answer.length || 5;
  const slotWidth = Math.min(54, (width - 48 - (answerLength * 6)) / answerLength);
  const slotHeight = slotWidth * 1.15;
  const slotFontSize = Math.max(16, slotWidth * 0.5);

  return (
    <LinearGradient colors={["#1E1B4B", "#0F0E26"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setShowEndConfirm(true)} style={styles.exitBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>HighScore Hunt ⚡</Text>
            <View style={styles.scoreTallyBox}>
              <Text style={styles.solvedCountText}>Solved: {solvedCount} • </Text>
              <Text style={[styles.scoreXPText, { color: sessionXP >= 0 ? "#10B981" : "#EF4444" }]}>
                {sessionXP >= 0 ? `+${sessionXP}` : sessionXP} XP
              </Text>
            </View>
          </View>
          <View style={[styles.timerPill, timeLeft < 10 && styles.timerPillUrgent]}>
            <Ionicons name="time-outline" size={14} color={timeLeft < 10 ? "#EF4444" : "#FBBF24"} />
            <Text style={[styles.timerText, timeLeft < 10 && styles.timerTextUrgent]}>
              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </Text>
          </View>
        </View>

        {loading || !currentPuzzle ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color="#FBBF24" />
            <Text style={styles.loaderText}>LOADING NEXT PUZZLE...</Text>
          </View>
        ) : (
          <>
            {/* Clue Card */}
            <View style={styles.clueCard}>
              <LinearGradient colors={["#2D2766", "#1C1844"]} style={styles.clueGradient}>
                <Text style={styles.clueQuote}>"{currentPuzzle.clue}"</Text>
                <View style={styles.cardDivider} />
                <Text style={styles.clueMeta}>Letters: {currentPuzzle.answer.length} • Category: {currentPuzzle.category}</Text>
              </LinearGradient>
            </View>

            {/* Answer Slots */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>YOUR TENTATIVE ANSWER</Text>
              <Text style={styles.sectionMeta}>{selectedLetters.filter(x => x !== null).length}/{currentPuzzle.answer.length}</Text>
            </View>

            <View style={styles.slotsRow}>
              {selectedLetters.map((slot, idx) => (
                <TouchableOpacity
                  key={`slot_${idx}`}
                  activeOpacity={0.7}
                  onPress={() => handleRemoveSelected(idx)}
                  style={[
                    styles.slot,
                    { width: slotWidth, height: slotHeight },
                    slot ? styles.slotFilled : styles.slotEmpty
                  ]}
                >
                  <Text style={[styles.slotLetter, { fontSize: slotFontSize }]}>
                    {slot ? slot.letter : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hint Disclosure */}
            {showHint && currentPuzzle && (
              <View style={{ alignItems: "center", marginVertical: 10, paddingHorizontal: 16 }}>
                <View style={[styles.hintTextBubble, { backgroundColor: "rgba(251, 191, 36, 0.12)", borderColor: "rgba(251, 191, 36, 0.25)", borderWidth: 1, padding: 14, borderRadius: 14, width: "100%" }]}>
                  <Text style={{ color: "#FBBF24", fontWeight: "bold", fontSize: 13, marginBottom: 4 }}>Hint Details:</Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 18 }}>{currentPuzzle.hint}</Text>
                </View>
              </View>
            )}

            {/* Scrambled letter tiles pool */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>LETTER POOL</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={styles.sectionMeta}>Tap tiles</Text>
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
                  onPress={() => handleTapScrambled(tile, idx)}
                  disabled={tile.tapped || loading}
                  style={[
                    styles.tile,
                    tile.tapped ? styles.tileTapped : styles.tileActive
                  ]}
                >
                  <Text style={[styles.tileLetter, tile.tapped && styles.tileLetterTapped]}>
                    {tile.letter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Submit Toggles */}
            <View style={styles.footerActionContainer}>
              {hintsRemaining > 0 ? (
                <TouchableOpacity
                  onPress={async () => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { }
                    if (!showHint) {
                      const newHints = Math.max(0, hintsRemaining - 1);
                      setHintsRemaining(newHints);
                      await AsyncStorage.setItem("shabdgyan_hints_remaining", String(newHints));
                      setShowHint(true);
                      setUsedHint(true);
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
                      setIsRealAdShowing(true);
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

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSubmit}
                style={styles.submitBtn}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>SUBMIT RESOLVE</Text>
              </TouchableOpacity>

              <View style={styles.rowActions}>
                <TouchableOpacity onPress={handleBackspace} style={[styles.actionButton, { backgroundColor: "#D97706" }]}>
                  <Ionicons name="backspace-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResetPuzzle} style={[styles.actionButton, { backgroundColor: "#4B5563" }]}>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* End Hunt Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showEndConfirm}
          onRequestClose={() => setShowEndConfirm(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Ionicons name="exit" size={48} color="#FBBF24" />
              <Text style={styles.modalTitle}>End Quest Hunt? ⚡</Text>
              <Text style={styles.modalDesc}>
                You can end this challenge now. The <Text style={{ fontWeight: "bold", color: "#10B981" }}>{sessionXP} XP</Text> you have earned will be saved. Do you want to end the hunt?
              </Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity onPress={() => setShowEndConfirm(false)} style={[styles.modalBtn, styles.modalBtnCancel]}>
                  <Text style={styles.modalBtnCancelText}>Keep Playing</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  setShowEndConfirm(false);
                  await finishGame();
                }} style={[styles.modalBtn, styles.modalBtnConfirm, { backgroundColor: "#10B981" }]}>
                  <Text style={styles.modalBtnConfirmText}>End & Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Sponsored Rewarded Ad Modal for Hints */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showHintAdModal}
          onRequestClose={() => {}}
        >
          <View style={styles.modalBackdrop}>
            <LinearGradient colors={["#0B0F19", "#1E1B4B"]} style={styles.adContent}>
              <View style={styles.adHeader}>
                <View style={styles.adBadge}>
                  <Text style={styles.adBadgeText}>SPONSORED AD FOR HINT</Text>
                </View>
              </View>

              <View style={styles.adVideoBody}>
                <LinearGradient colors={["#10B981", "#059669"]} style={styles.mockVideoCard}>
                  <MaterialCommunityIcons name="lightbulb-on" size={64} color="#FFFFFF" style={{ marginBottom: 12 }} />
                  <Text style={styles.mockVideoTitle}>Need a Hint?</Text>
                  <Text style={styles.mockVideoSub}>Watch this short ad to get a free hint and crack the puzzle!</Text>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 20 }} />
                </LinearGradient>
              </View>

              <View style={styles.adFooter}>
                <Text style={styles.adInstruction}>Watch fully to earn your hint...</Text>
                {hintAdTimeLeft > 0 ? (
                  <View style={styles.adCountBox}>
                    <Text style={styles.adCountText}>Hint unlocks in {hintAdTimeLeft}s</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={closeHintAdAndReward} style={styles.adCloseBtn}>
                    <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.adCloseBtnText}>Claim Hint</Text>
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
  loaderCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 1,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
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
  scoreTallyBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  solvedCountText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  scoreXPText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  timerPillUrgent: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  timerText: {
    color: "#FBBF24",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  timerTextUrgent: {
    color: "#EF4444",
  },
  guideCard: {
    backgroundColor: "#1E1B4B",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  guideIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  guideTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontWeight: "900",
    textAlign: "center",
  },
  guideSubtitle: {
    color: "#FBBF24",
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 2.5,
    textAlign: "center",
  },
  rulesList: {
    width: "100%",
    gap: 12,
    marginVertical: 14,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  ruleText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 18,
    flex: 1,
  },
  startBtn: {
    width: "100%",
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  cancelBtn: {
    paddingVertical: 8,
    marginTop: 4,
  },
  cancelBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  resultsPanel: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 16,
    gap: 12,
    marginVertical: 14,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultItemLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  resultItemValue: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  clueCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
  },
  clueGradient: {
    padding: 20,
    gap: 12,
  },
  clueQuote: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 22,
    fontStyle: "italic",
    textAlign: "center",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
  },
  clueMeta: {
    color: "#94A3B8",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1.5,
  },
  sectionMeta: {
    color: "#94A3B8",
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  slotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 24,
  },
  slot: {
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  slotEmpty: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "#1E293B",
  },
  slotFilled: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
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
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
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
  footerActionContainer: {
    gap: 12,
    marginBottom: 16,
  },
  submitBtn: {
    width: "100%",
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  rowActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#1E293B",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  modalDesc: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 19,
    textAlign: "center",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalBtnConfirm: {
    backgroundColor: "#EF4444",
  },
  modalBtnCancelText: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  modalBtnConfirmText: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
  },
  revealBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  revealBtnText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  hintTextBubble: {
    width: "100%",
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
