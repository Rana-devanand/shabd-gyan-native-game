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
  AppState,
  AppStateStatus,
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
import { savePlayedQuiz, saveQuestStatus, recordAdWatched } from "@/src/services/databaseService";
import { useRewardedAd, TestIds } from "react-native-google-mobile-ads";

const AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : "ca-app-pub-4526433011293142/7471565982";

const { width } = Dimensions.get("window");

export default function DailyWarriorScreen() {
  const router = useRouter();

  // Puzzle State
  const [loading, setLoading] = useState(true);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [scrambledLetters, setScrambledLetters] = useState<
    Array<{ letter: string; tapped: boolean; index: number }>
  >([]);
  const [selectedLetters, setSelectedLetters] = useState<
    Array<{ letter: string; scrambledIndex: number; originalScrambledIndex: number } | null>
  >([]);

  // Game Settings & Timers
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

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
      console.warn("[DailyWarrior] Failed to award hint after ad:", e);
    }
  };

  // References
  const timerRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);

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

    if (!loading && !isGameOver && !isWon) {
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
  }, [loading, isGameOver, isWon, soundEnabled]);

  // Fetch puzzle from Groq
  useEffect(() => {
    let isMounted = true;
    const fetchChallenge = async () => {
      try {
        const status = await AsyncStorage.getItem("quest_daily_warrior_status");
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

        console.log("[DailyWarrior] Generating Super Hard Scramble...");
        const result = await generatePuzzle("shabd", undefined, "Super Hard");
        if (isMounted) {
          setPuzzle(result);
          initScrambled(result);
          setLoading(false);
        }
      } catch (e) {
        console.warn("[DailyWarrior] Failed to generate Groq puzzle, falling back...", e);
        // Fallback to local
        const fallback: Puzzle = {
          id: "dw_fallback_" + Date.now(),
          category: "Festivals",
          clue: "Traditional Indian stringed musical instrument featuring a long hollow neck and pumpkin gourds.",
          answer: "SITAR",
          decoys: ["Z", "Q", "X"],
          hint: "A classical string instrument popular in Hindustani music.",
        };
        if (isMounted) {
          setPuzzle(fallback);
          initScrambled(fallback);
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
        if (isMounted) {
          setHintsRemaining(hintsVal);
        }
      } catch (err) {
        console.warn("[DailyWarrior] Failed to load hints:", err);
      }
    };
    fetchChallenge();

    return () => {
      isMounted = false;
      if (hintAdTimerRef.current) clearInterval(hintAdTimerRef.current);
    };
  }, []);

  // Timer countdown loop
  useEffect(() => {
    if (loading || isGameOver || isWon || showHintAdModal || isRealAdShowing) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleGameFail("time_up");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, isGameOver, isWon, showHintAdModal, isRealAdShowing]);

  // AppState listening (Minimizing/leaving fails quest)
  useEffect(() => {
    const handleAppState = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/active/) &&
        (nextAppState === "background" || nextAppState === "inactive")
      ) {
        if (!loading && !isGameOver && !isWon) {
          console.log("[DailyWarrior] App minimized! Failing quest.");
          handleGameFail("app_minimized");
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => {
      subscription.remove();
    };
  }, [loading, isGameOver, isWon]);

  const initScrambled = (p: Puzzle) => {
    const answerArr = p.answer.toUpperCase().split("");
    const decoyArr = p.decoys.map((d) => d.toUpperCase());
    const combined = [...answerArr, ...decoyArr];

    // Scramble combined letters
    const scrambled = combined
      .map((letter, index) => ({ letter, tapped: false, index }))
      .sort(() => Math.random() - 0.5);

    setScrambledLetters(scrambled);
    setSelectedLetters(new Array(p.answer.length).fill(null));
  };

  const handleGameFail = async (reason: "time_up" | "app_minimized" | "abandoned") => {
    if (isGameOver || isWon) return;
    setIsGameOver(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Save Daily Status to Played
      await AsyncStorage.setItem("quest_daily_warrior_status", "played");
      await saveQuestStatus("daily_warrior", "played", 0);
      
      if (puzzle) {
        await savePlayedQuiz({
          puzzleId: puzzle.id,
          category: puzzle.category,
          difficulty: "Super Hard",
          mode: "quests",
          question: puzzle.clue,
          answer: puzzle.answer,
          usedHint: usedHint,
          revealedAnswer: false,
          coinsEarned: 0,
          userAnswer: ""
        });
      }
    } catch (e) {}

    if (reason === "app_minimized" || reason === "abandoned") {
      router.replace("/(authenticated)/(tabs)/quest");
      showMessage({
        message: "Quest Failed! ❌",
        description: "Minimizing or exiting the app cancels and fails the daily attempt!",
        type: "danger",
        duration: 4000,
      });
    } else {
      if (soundEnabled) {
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
      showMessage({
        message: "Time's Up! ⏰",
        description: "You could not solve the puzzle in time. Attempt lost!",
        type: "danger",
        duration: 3500,
      });
    }
  };

  const handleExitPress = () => {
    if (isGameOver || isWon) {
      router.back();
    } else {
      setShowExitModal(true);
    }
  };

  const confirmExit = async () => {
    setShowExitModal(false);
    await handleGameFail("abandoned");
  };

  const handleTapScrambled = async (
    tile: { letter: string; tapped: boolean; index: number },
    tileIdx: number
  ) => {
    if (tile.tapped || isWon || isGameOver) return;

    // Find the first empty slot
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
    if (!slotItem || isWon || isGameOver) return;

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
    if (isWon || isGameOver || !puzzle) return;

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
    if (!puzzle || isWon || isGameOver) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) { }

    const resetScrambled = scrambledLetters.map((item) => ({ ...item, tapped: false }));
    setScrambledLetters(resetScrambled);
    setSelectedLetters(new Array(puzzle.answer.length).fill(null));
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
    if (selectedLetters.some((item) => item === null)) {
      showMessage({
        message: "Word Incomplete ⚠️",
        description: "Please fill all letter slots first!",
        type: "warning",
      });
      return;
    }

    const userWord = selectedLetters.map((item) => item?.letter).join("").toUpperCase();
    const correctWord = puzzle?.answer.toUpperCase();

    if (userWord === correctWord && puzzle) {
      setIsWon(true);
      if (timerRef.current) clearInterval(timerRef.current);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Save status as completed
        await AsyncStorage.setItem("quest_daily_warrior_status", "completed");
        await saveQuestStatus("daily_warrior", "completed", 80);
        // Award +80 XP
        await awardXP(80, "daily_quest_completed", puzzle.id);
        
        await savePlayedQuiz({
          puzzleId: puzzle.id,
          category: puzzle.category,
          difficulty: "Super Hard",
          mode: "quests",
          question: puzzle.clue,
          answer: puzzle.answer,
          usedHint: usedHint,
          revealedAnswer: false,
          coinsEarned: 80,
          userAnswer: puzzle.answer
        });
      } catch (e) {}

      showMessage({
        message: "Correct Answer! 🎉",
        description: "Quest completed! You earned +80 XP!",
        type: "success",
        duration: 3000,
      });
    } else {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) { }
      showMessage({
        message: "Incorrect Answer ❌",
        description: "Arrange the tiles in the correct order and check again!",
        type: "danger",
        duration: 1500,
      });
    }
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
      console.warn("[DailyWarrior] Failed to award hint after ad:", e);
    }
  };

  const BeautifulLoader = () => {
    const spinValue = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }, []);

    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <LinearGradient colors={["#020B1E", "#0B1530"]} style={styles.container}>
        <View style={styles.loaderCenter}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialCommunityIcons name="shield-half-full" size={64} color="#3B82F6" />
          </Animated.View>
          <Text style={styles.loaderText}>LOADING WARRIOR CHALLENGE...</Text>
          <Text style={styles.loaderSubText}>Generating super hard puzzle challenge...</Text>
          <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 20 }} />
        </View>
      </LinearGradient>
    );
  };

  if (loading || !puzzle) {
    return <BeautifulLoader />;
  }

  const answerLength = puzzle.answer.length;
  const slotWidth = Math.min(54, (width - 48 - (answerLength * 6)) / answerLength);
  const slotHeight = slotWidth * 1.15;
  const slotFontSize = Math.max(16, slotWidth * 0.5);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <LinearGradient colors={["#090D1A", "#121A33"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleExitPress} style={styles.exitBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Daily Warrior 🛡️</Text>
            <Text style={styles.headerSubtitle}>QUEST LEVEL</Text>
          </View>
          <View style={[styles.timerPill, timeLeft < 15 && styles.timerPillUrgent]}>
            <Ionicons name="time-outline" size={14} color={timeLeft < 15 ? "#EF4444" : "#FBBF24"} />
            <Text style={[styles.timerText, timeLeft < 15 && styles.timerTextUrgent]}>
              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </Text>
          </View>
        </View>

        {/* Clue Card */}
        <View style={styles.clueCard}>
          <LinearGradient colors={["#131B35", "#1B264F"]} style={styles.clueGradient}>
            <Text style={styles.clueQuote}>"{puzzle.clue}"</Text>
            <View style={styles.cardDivider} />
            <Text style={styles.clueMeta}>Letters: {puzzle.answer.length} • Difficulty: Super Hard</Text>
          </LinearGradient>
        </View>

        {/* Selected Answer Slots */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR DECODED WORD</Text>
          <Text style={styles.sectionMeta}>{selectedLetters.filter(x => x !== null).length}/{puzzle.answer.length}</Text>
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

        {/* Scrambled letter tiles pool */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LETTER TILES</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={styles.sectionMeta}>Scrambled pool</Text>
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
              disabled={tile.tapped || isWon || isGameOver}
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

        {/* Hint Disclosure */}
        {showHint && puzzle && (
          <View style={{ alignItems: "center", marginVertical: 10, paddingHorizontal: 16 }}>
            <View style={[styles.hintTextBubble, { backgroundColor: "rgba(251, 191, 36, 0.12)", borderColor: "rgba(251, 191, 36, 0.25)", borderWidth: 1, padding: 14, borderRadius: 14, width: "100%" }]}>
              <Text style={{ color: "#FBBF24", fontWeight: "bold", fontSize: 13, marginBottom: 4 }}>Hint Details:</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 13, lineHeight: 18 }}>{puzzle.hint}</Text>
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Actions Button */}
        {isWon || isGameOver ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace("/(authenticated)/(tabs)/quest")}
            style={[styles.submitBtn, { backgroundColor: "#10B981" }]}
          >
            <Text style={styles.submitBtnText}>Back to Quest Hub</Text>
          </TouchableOpacity>
        ) : (
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
        )}

        {/* Game Over View */}
        {isGameOver && (
          <View style={styles.overlayOverlay}>
            <View style={styles.failCard}>
              <Ionicons name="sad-outline" size={56} color="#EF4444" />
              <Text style={styles.overlayTitle}>Time's Up / Failed! ❌</Text>
              <Text style={styles.overlayDesc}>
                You could not solve the puzzle in time, or exited the app. The daily quest attempt is lost.
              </Text>
              <TouchableOpacity
                onPress={() => router.replace("/(authenticated)/(tabs)/quest")}
                style={[styles.overlayBtn, { backgroundColor: "#EF4444" }]}
              >
                <Text style={styles.overlayBtnText}>Return to Quest Board</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Game Won View */}
        {isWon && (
          <View style={styles.overlayOverlay}>
            <View style={styles.victoryCard}>
              <FontAwesome5 name="medal" size={56} color="#FBBF24" />
              <Text style={styles.overlayTitle}>Correct Answer! 🎉</Text>
              <Text style={styles.overlayPoints}>+80 XP Earned</Text>
              <Text style={styles.overlayWord}>Word: {puzzle.answer}</Text>
              <TouchableOpacity
                onPress={() => router.replace("/(authenticated)/(tabs)/quest")}
                style={[styles.overlayBtn, { backgroundColor: "#10B981" }]}
              >
                <Text style={styles.overlayBtnText}>Return to Quest Board</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Exit Alert Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showExitModal}
          onRequestClose={() => setShowExitModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Ionicons name="warning" size={48} color="#D97706" />
              <Text style={styles.modalTitle}>Abandon Quest? ⚠️</Text>
              <Text style={styles.modalDesc}>
                Leaving now will instantly FAIL this quest challenge, and you will lose your attempt for today. Are you sure you want to exit?
              </Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity onPress={() => setShowExitModal(false)} style={[styles.modalBtn, styles.modalBtnCancel]}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmExit} style={[styles.modalBtn, styles.modalBtnConfirm]}>
                  <Text style={styles.modalBtnConfirmText}>Exit & Fail</Text>
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
    fontSize: 15,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  loaderSubText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
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
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#3B82F6",
    fontSize: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 2,
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
  clueCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 24,
  },
  clueGradient: {
    padding: 20,
    gap: 12,
  },
  clueQuote: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 24,
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
    marginBottom: 26,
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
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
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
    marginBottom: 20,
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
    backgroundColor: "#2563EB",
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
  overlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 13, 26, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  failCard: {
    width: "100%",
    backgroundColor: "#1F1625",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    gap: 16,
  },
  victoryCard: {
    width: "100%",
    backgroundColor: "#13251E",
    borderWidth: 1.5,
    borderColor: "#10B981",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    gap: 14,
  },
  overlayTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    textAlign: "center",
  },
  overlayPoints: {
    color: "#FBBF24",
    fontSize: 24,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontWeight: "900",
  },
  overlayWord: {
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  overlayDesc: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 18,
    textAlign: "center",
  },
  overlayBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  overlayBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
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
