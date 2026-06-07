import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import * as Haptics from "expo-haptics";
import { showMessage } from "react-native-flash-message";

import { PUZZLES, CATEGORIES, PAHELI_PUZZLES, Puzzle } from "@/src/constants/puzzles";
import { generatePuzzle } from "@/src/services/groqService";

const { width } = Dimensions.get("window");
const TILE_SIZE = (width - 80) / 5;

export default function PlayScreen() {
  const { categoryName, difficulty, dynamic } = useLocalSearchParams<{ categoryName: string; difficulty: string; dynamic?: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#475569";
  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";
  const bgGradients = isDark ? ["#021122", "#0b203c", "#021122"] : ["#F8FAFC", "#F1F5F9", "#E2E8F0"];
  const clueGradients = isDark ? ["#0A1D37", "#21103E"] : ["#E0F2FE", "#EFF6FF"];
  const clueTextColor = isDark ? "#FFFFFF" : "#0F172A";
  const clueDifficultyColor = isDark ? "#60A5FA" : "#2563EB";
  const hintBg = isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)";
  const hintBorder = isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)";
  const bottomBg = isDark ? "rgba(2, 17, 34, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const bottomBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";

  // Game Stats
  const [loading, setLoading] = useState(true);
  const [fetchingGroq, setFetchingGroq] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<"shabd" | "paheli">("shabd");
  const [dynamicPuzzle, setDynamicPuzzle] = useState<Puzzle | null>(null);
  const [loadedPuzzle, setLoadedPuzzle] = useState<Puzzle | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  // Gameplay State
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [scrambledLetters, setScrambledLetters] = useState<
    Array<{ letter: string; tapped: boolean; index: number }>
  >([]);
  const [selectedLetters, setSelectedLetters] = useState<
    Array<{ letter: string; scrambledIndex: number; originalScrambledIndex: number } | null>
  >([]);
  const [showHint, setShowHint] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Load progress
  useEffect(() => {
    const loadState = async () => {
      try {
        const storedMode = await AsyncStorage.getItem("shabdgyan_mode") || "shabd";
        setGameMode(storedMode as any);

        const scoreStr = await AsyncStorage.getItem("shabdgyan_score");
        const streakStr = await AsyncStorage.getItem("shabdgyan_streak");
        const solvedIdsStr = await AsyncStorage.getItem("shabdgyan_solved_ids");

        if (scoreStr) setScore(parseInt(scoreStr, 10) || 0);
        if (streakStr) setStreak(parseInt(streakStr, 10) || 0);
        if (solvedIdsStr) {
          setSolvedIds(JSON.parse(solvedIdsStr) || []);
        }

        // Load dynamic Groq puzzle if requested
        if (dynamic === "true") {
          const cacheKey = storedMode === "shabd" ? "groq_shabd_puzzle" : "groq_paheli_puzzle";
          const dynamicStr = await AsyncStorage.getItem(cacheKey);
          if (dynamicStr) {
            setDynamicPuzzle(JSON.parse(dynamicStr));
          } else {
            // Local fallback to prevent getting stuck
            const localFallback = storedMode === "shabd" ? PUZZLES[0] : PAHELI_PUZZLES[0];
            setDynamicPuzzle(localFallback);
          }
        }
      } catch (error) {
        console.error("Error loading play stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadState();
  }, []);

  const modePuzzles = gameMode === "shabd" ? PUZZLES : PAHELI_PUZZLES;
  const catPuzzles = modePuzzles.filter((p) => p.category === categoryName);
  const diffIndex = ["Easy", "Medium", "Hard", "Super Hard"].indexOf(difficulty);

  // Set the default static fallback level immediately
  useEffect(() => {
    const fallback = catPuzzles[diffIndex] || modePuzzles[0];
    setLoadedPuzzle(fallback);
  }, [categoryName, difficulty, gameMode]);

  // Dynamically load a fresh puzzle for this category from Groq in the background
  useEffect(() => {
    if (loading) return;
    if (dynamic === "true") return;

    let isMounted = true;
    const fetchCategoryPuzzle = async () => {
      setFetchingGroq(true);
      try {
        console.log(`[PlayScreen] Fetching category puzzle dynamically for category: ${categoryName}, difficulty: ${difficulty}`);
        const puzzle = await generatePuzzle(gameMode, categoryName, difficulty);
        if (isMounted) {
          setLoadedPuzzle(puzzle);
        }
      } catch (e) {
        console.warn(`[PlayScreen] Failed to generate Groq puzzle for category, keeping local fallback:`, e);
      } finally {
        if (isMounted) {
          setFetchingGroq(false);
        }
      }
    };

    fetchCategoryPuzzle();
    return () => {
      isMounted = false;
    };
  }, [loading, categoryName, gameMode, difficulty]);

  const matchedPuzzle = dynamic === "true" ? dynamicPuzzle : loadedPuzzle;

  // Automatically start the puzzle when matchedPuzzle changes
  useEffect(() => {
    if (matchedPuzzle) {
      startPuzzle(matchedPuzzle);
    }
  }, [matchedPuzzle]);

  // Initialize a puzzle play state
  const startPuzzle = async (puzzle: Puzzle) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) { }

    setActivePuzzle(puzzle);
    setIsCorrect(false);
    setShowHint(false);

    // Prepare letters: answer letters + decoy letters
    const answerArr = puzzle.answer.toUpperCase().split("");
    const decoyArr = puzzle.decoys.map((d) => d.toUpperCase());
    const combined = [...answerArr, ...decoyArr];

    // Scramble combined letters
    const scrambled = combined
      .map((letter, index) => ({ letter, tapped: false, index }))
      .sort(() => Math.random() - 0.5);

    setScrambledLetters(scrambled);
    setSelectedLetters(new Array(puzzle.answer.length).fill(null));
  };

  // Tap a scrambled tile
  const handleTapScrambled = async (
    tile: { letter: string; tapped: boolean; index: number },
    tileIdx: number
  ) => {
    if (tile.tapped || isCorrect) return;

    // Find the first empty slot
    const emptyIdx = selectedLetters.findIndex((item) => item === null);
    if (emptyIdx === -1) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) { }

    // Update scrambled list to show this tile is tapped
    const newScrambled = [...scrambledLetters];
    newScrambled[tileIdx].tapped = true;
    setScrambledLetters(newScrambled);

    // Update selected letters slots
    const newSelected = [...selectedLetters];
    newSelected[emptyIdx] = {
      letter: tile.letter,
      scrambledIndex: tile.index,
      originalScrambledIndex: tileIdx,
    };
    setSelectedLetters(newSelected);
  };

  // Tap a selected slot to remove the letter
  const handleRemoveSelected = async (slotIdx: number) => {
    const slotItem = selectedLetters[slotIdx];
    if (!slotItem || isCorrect) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) { }

    // Set scrambled tile to untapped
    const newScrambled = [...scrambledLetters];
    newScrambled[slotItem.originalScrambledIndex].tapped = false;
    setScrambledLetters(newScrambled);

    // Empty this slot
    const newSelected = [...selectedLetters];
    newSelected[slotIdx] = null;
    setSelectedLetters(newSelected);
  };

  // Reset current puzzle tiles
  const handleResetPuzzle = async () => {
    if (!activePuzzle || isCorrect) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) { }

    // Set all scrambled tiles back to untapped
    const resetScrambled = scrambledLetters.map((item) => ({ ...item, tapped: false }));
    setScrambledLetters(resetScrambled);
    setSelectedLetters(new Array(activePuzzle.answer.length).fill(null));
  };

  // Auto-fill the correct answer into slots
  const handleSeeAnswer = async () => {
    if (!activePuzzle || isCorrect) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) { }

    const correctWord = activePuzzle.answer.toUpperCase();
    const correctLetters = correctWord.split("");

    const tempScrambled = scrambledLetters.map((s) => ({ ...s, tapped: false }));
    const newSelected: Array<{ letter: string; scrambledIndex: number; originalScrambledIndex: number } | null> = [];

    for (let i = 0; i < correctLetters.length; i++) {
      const letter = correctLetters[i];
      const foundIdx = tempScrambled.findIndex((tile) => tile.letter === letter && !tile.tapped);
      if (foundIdx !== -1) {
        tempScrambled[foundIdx].tapped = true;
        newSelected.push({
          letter: tempScrambled[foundIdx].letter,
          scrambledIndex: tempScrambled[foundIdx].index,
          originalScrambledIndex: foundIdx,
        });
      } else {
        newSelected.push(null);
      }
    }

    setScrambledLetters(tempScrambled);
    setSelectedLetters(newSelected);
  };

  // Delete letters one by one from right to left (Backspace)
  const handleBackspace = async () => {
    if (isCorrect || !activePuzzle) return;

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
      const newScrambled = [...scrambledLetters];
      newScrambled[slotItem.originalScrambledIndex].tapped = false;
      setScrambledLetters(newScrambled);

      const newSelected = [...selectedLetters];
      newSelected[lastFilledIdx] = null;
      setSelectedLetters(newSelected);
    }
  };

  // Explicitly validate user answer
  const handleSubmitAnswer = () => {
    if (selectedLetters.some((item) => item === null)) {
      showMessage({
        message: "Word Incomplete ⚠️",
        description: "Pehle saare letter slots fill kijiye!",
        type: "warning",
      });
      return;
    }
    checkAnswer(selectedLetters);
  };

  // Check if current input matches the answer
  const checkAnswer = async (
    newSelected: Array<{ letter: string; scrambledIndex: number; originalScrambledIndex: number } | null>
  ) => {
    if (newSelected.some((item) => item === null)) return;

    const userWord = newSelected.map((item) => item?.letter).join("").toUpperCase();
    const correctWord = activePuzzle?.answer.toUpperCase();

    if (userWord === correctWord && activePuzzle) {
      setIsCorrect(true);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) { }

      // Update storage and states
      const puzzleId = activePuzzle.id;
      const alreadySolved = solvedIds.includes(puzzleId);
      const updatedSolved = alreadySolved ? solvedIds : [...solvedIds, puzzleId];

      if (!alreadySolved) {
        setSolvedIds(updatedSolved);
        await AsyncStorage.setItem("shabdgyan_solved_ids", JSON.stringify(updatedSolved));

        // Add 100 Points
        const newScore = score + 100;
        setScore(newScore);
        await AsyncStorage.setItem("shabdgyan_score", newScore.toString());

        // Increment Streak
        const newStreak = streak + 1;
        setStreak(newStreak);
        await AsyncStorage.setItem("shabdgyan_streak", newStreak.toString());

        // Update Max Streak
        const maxStreakStr = await AsyncStorage.getItem("shabdgyan_max_streak");
        const maxStreak = parseInt(maxStreakStr || "0", 10);
        if (newStreak > maxStreak) {
          await AsyncStorage.setItem("shabdgyan_max_streak", newStreak.toString());
        }

        // Save solve history
        const historyStr = await AsyncStorage.getItem("shabdgyan_history");
        const history = historyStr ? JSON.parse(historyStr) : [];
        const solvedItem = {
          id: puzzleId,
          word: activePuzzle.answer,
          clue: activePuzzle.clue,
          category: activePuzzle.category,
          points: 100,
          solvedAt: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        };
        await AsyncStorage.setItem("shabdgyan_history", JSON.stringify([solvedItem, ...history]));
      }
    } else {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) { }
      showMessage({
        message: "Opps! Galat Jawab ❌",
        description: "Tiles ko sahi order mein jamayein!",
        type: "danger",
        duration: 1500,
      });
    }
  };

  // Launch Next Unsolved Level
  const handlePlayNext = async () => {
    if (!activePuzzle) return;

    if (dynamic === "true") {
      setActivePuzzle(null);
      router.replace("/(authenticated)/(tabs)");
      return;
    }

    setLoadingNext(true);
    setFetchingGroq(true);
    try {
      console.log(`[PlayScreen] Fetching NEXT category puzzle dynamically for category: ${categoryName}, difficulty: ${difficulty}`);
      const puzzle = await generatePuzzle(gameMode, categoryName, difficulty);
      setLoadedPuzzle(puzzle);
      // startPuzzle will trigger automatically via useEffect because loadedPuzzle updates matchedPuzzle
    } catch (e) {
      console.warn(`[PlayScreen] Failed to generate next Groq puzzle, falling back:`, e);

      const currentIdx = modePuzzles.findIndex((p) => p.id === activePuzzle.id);
      let nextPuzzle = modePuzzles.slice(currentIdx + 1).find((p) => !solvedIds.includes(p.id) && p.category === categoryName);

      if (!nextPuzzle) {
        nextPuzzle = modePuzzles.find((p) => !solvedIds.includes(p.id) && p.category === categoryName);
      }

      if (!nextPuzzle) {
        nextPuzzle = modePuzzles.find((p) => !solvedIds.includes(p.id));
      }

      if (nextPuzzle) {
        setLoadedPuzzle(nextPuzzle);
      } else {
        setActivePuzzle(null);
        showMessage({
          message: "Congratulations! 🎉",
          description: "Aapne saare puzzles solve kar liye hain!",
          type: "success",
          duration: 3500,
        });
      }
    } finally {
      setLoadingNext(false);
      setFetchingGroq(false);
    }
  };

  // Beautiful loader component inside PlayScreen for encapsulation
  const BeautifulLoader = () => {
    const spinValue = useRef(new Animated.Value(0)).current;
    const pulseValue = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.0,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 0.6,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);

    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <LinearGradient
        colors={["#021122", "#0b203c", "#021122"]}
        style={styles.loaderContainer}
      >
        <SafeAreaView style={styles.loaderContent}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialCommunityIcons name="brain" size={64} color="#A2EBD0" />
          </Animated.View>

          <Animated.View style={[styles.loaderTextBox, { opacity: pulseValue }]}>
            <Text style={styles.loaderText}>GENERATING PUZZLE...</Text>
            <Text style={styles.loaderSubText}>Aapke liye sawal taiyar kiya ja raha hai</Text>
          </Animated.View>

          <ActivityIndicator size="small" color="#A2EBD0" style={{ marginTop: 20 }} />
        </SafeAreaView>
      </LinearGradient>
    );
  };

  if (loading || fetchingGroq || (dynamic === "true" && !dynamicPuzzle) || !activePuzzle) {
    return <BeautifulLoader />;
  }

  const answerLength = activePuzzle?.answer?.length || 5;
  const slotWidth = Math.min(54, (width - 48 - (answerLength * 6)) / answerLength);
  const slotHeight = slotWidth * 1.15;
  const slotFontSize = Math.max(16, slotWidth * 0.5);

  return (
    <LinearGradient
      colors={bgGradients}
      style={styles.modalContainer}
    >
      <SafeAreaView style={styles.modalSafeArea}>

        {/* Fullscreen Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[
              styles.headerCircleBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                borderWidth: 1
              }
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>

          <View style={styles.modalHeaderTitleBox}>
            <Text style={[styles.modalHeaderCategory, { color: clueDifficultyColor }]}>{activePuzzle.category.toUpperCase()}</Text>
            <Text style={[styles.modalHeaderTitle, { color: textColor }]}>UNSCRAMBLE WORD</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[
              styles.headerCircleBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                borderWidth: 1
              }
            ]}
          >
            <Ionicons name="close" size={20} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Stats row below header title */}
        <View style={styles.headerStatsRow}>
          <View style={styles.statsContainerLeft}>
            <View style={[styles.headerStatPill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }]}>
              <FontAwesome5 name="trophy" size={11} color="#FBBF24" />
              <Text style={[styles.headerStatText, { color: isDark ? "#FFFFFF" : "#334155" }]}>{score} XP</Text>
            </View>
            <View style={[styles.headerStatPill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }]}>
              <MaterialCommunityIcons name="fire" size={13} color="#EF4444" />
              <Text style={[styles.headerStatText, { color: isDark ? "#FFFFFF" : "#334155" }]}>{streak} Streak</Text>
            </View>
          </View>

          <View style={styles.statsContainerRight}>
            {/* See Answer Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSeeAnswer}
              disabled={isCorrect}
              style={[
                styles.headerStatPill,
                {
                  borderColor: isDark ? "#8B5CF6" : "#7C3AED",
                  backgroundColor: isDark ? "rgba(139, 92, 246, 0.08)" : "rgba(124, 58, 237, 0.05)"
                }
              ]}
            >
              <Ionicons name="eye-outline" size={13} color={isDark ? "#C084FC" : "#7C3AED"} />
              <Text style={[styles.headerStatText, { color: isDark ? "#C084FC" : "#7C3AED" }]}>Answer</Text>
            </TouchableOpacity>

            {/* Hint Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { }
                setShowHint(!showHint);
              }}
              style={[
                styles.headerStatPill,
                { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" },
                showHint && { borderColor: "#FBBF24", backgroundColor: "rgba(251, 191, 36, 0.12)" }
              ]}
            >
              <MaterialCommunityIcons name="lightbulb-on" size={13} color="#FBBF24" />
              <Text style={[styles.headerStatText, { color: isDark ? "#FFFFFF" : "#334155" }]}>Hint</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>

          {/* Clue Card */}
          <View style={[styles.clueCard, { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", borderWidth: 1 }]}>
            <LinearGradient
              colors={clueGradients}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.clueCardGradient}
            >
              <Text style={[styles.clueText, { color: clueTextColor }]}>"{activePuzzle.clue}"</Text>
              <Text style={[styles.clueMetaText, { color: subTextColor }]}>
                Difficulty: <Text style={{ color: clueDifficultyColor, fontWeight: "bold" }}>{difficulty}</Text> • {activePuzzle.answer.length} letters
              </Text>
            </LinearGradient>
          </View>

          {/* Answer slots section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: subTextColor }]}>YOUR ANSWER</Text>
            <Text style={[styles.sectionMeta, { color: subTextColor }]}>{selectedLetters.filter(x => x !== null).length}/{activePuzzle.answer.length}</Text>
          </View>

          {/* Letter Slots */}
          <View style={styles.slotsContainer}>
            {selectedLetters.map((slot, idx) => (
              <TouchableOpacity
                key={`slot_${idx}`}
                activeOpacity={0.7}
                onPress={() => handleRemoveSelected(idx)}
                style={[
                  styles.slotBox,
                  {
                    width: slotWidth,
                    height: slotHeight,
                    borderWidth: 1,
                  },
                  slot
                    ? {
                      borderColor: isDark ? "#A2EBD0" : "#10B981",
                      backgroundColor: isDark ? "rgba(162, 235, 208, 0.12)" : "rgba(16, 185, 129, 0.08)"
                    }
                    : {
                      borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.12)",
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                    },
                ]}
              >
                <Text
                  style={[
                    styles.slotLetter,
                    {
                      fontSize: slotFontSize,
                      color: slot ? (isDark ? "#A2EBD0" : "#065F46") : textColor
                    }
                  ]}
                >
                  {slot ? slot.letter : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hint Disclosure */}
          {showHint && (
            <View style={{ alignItems: "center", marginVertical: 6 }}>
              <View style={[styles.hintTextBubble, { backgroundColor: hintBg, borderColor: hintBorder, borderWidth: 1 }]}>
                <Text style={styles.hintBubbleTitle}>Hint Details:</Text>
                <Text style={[styles.hintBubbleText, { color: textColor }]}>{activePuzzle.hint}</Text>
              </View>
            </View>
          )}

          {/* Letter Tiles Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: subTextColor }]}>LETTER TILES</Text>
            <Text style={[styles.sectionMeta, { color: subTextColor }]}>Tap to insert</Text>
          </View>

          {/* Scrambled letters tiles pool */}
          <View style={styles.scrambledTilesGrid}>
            {scrambledLetters.map((tile, idx) => (
              <TouchableOpacity
                key={`tile_${tile.index}_${idx}`}
                activeOpacity={0.8}
                onPress={() => handleTapScrambled(tile, idx)}
                disabled={tile.tapped || isCorrect}
                style={[
                  styles.tileButton,
                  { borderWidth: 1 },
                  tile.tapped
                    ? {
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"
                    }
                    : { backgroundColor: "#8B5CF6", borderColor: "#A78BFA" },
                ]}
              >
                <Text
                  style={[
                    styles.tileLetter,
                    {
                      color: tile.tapped
                        ? (isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)")
                        : "#FFFFFF"
                    },
                  ]}
                >
                  {tile.letter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>

        {/* Bottom Actions Fixed Container */}
        <View style={styles.bottomActionsContainer}>
          {/* Submit Answer Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmitAnswer}
            disabled={isCorrect}
            style={[styles.submitButton, isCorrect && styles.submitButtonDisabled]}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.submitButtonText}>SUBMIT ANSWER</Text>
          </TouchableOpacity>

          {/* Action Row */}
          <View style={styles.modalActionRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBackspace}
              disabled={isCorrect}
              style={[styles.modalActionBtn, styles.backspaceActionBtn]}
            >
              <Ionicons name="backspace-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalActionBtnText}>Delete Letter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleResetPuzzle}
              disabled={isCorrect}
              style={[styles.modalActionBtn, styles.resetActionBtn]}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalActionBtnText}>Clear Board</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Victory Celebration Overlay */}
        {isCorrect && (
          <View style={styles.victoryOverlay}>
            <View style={styles.victoryCard}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.victoryGradient}
              >
                <FontAwesome5 name="check-circle" size={48} color="#FFFFFF" style={styles.victoryIcon} />
                <Text style={styles.victoryTitle}>Sahi Jawab! 🎉</Text>
                <Text style={styles.victoryPoints}>+100 XP Earned</Text>

                <View style={styles.solvedWordDetails}>
                  <Text style={styles.solvedWordLabel}>Correct Word:</Text>
                  <Text style={styles.solvedWordText}>{activePuzzle.answer.toUpperCase()}</Text>
                  <Text style={styles.solvedWordClue}>"{activePuzzle.clue}"</Text>
                </View>

                <View style={styles.victoryActionRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePlayNext}
                    disabled={loadingNext}
                    style={styles.nextPuzzleButton}
                  >
                    {loadingNext ? (
                      <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 6 }} />
                    ) : (
                      <>
                        <Text style={styles.nextPuzzleButtonText}>
                          {dynamic === "true" ? "Back to Hub" : "Next Level"}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#10B981" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.back()}
                    style={styles.backToDashboardButton}
                  >
                    <Text style={styles.backToDashboardButtonText}>Close Hub</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        )}

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerCategoryText: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.0,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  levelsStepSection: {
    gap: 18,
  },
  stepTitleContainer: {
    marginBottom: 6,
  },
  stepTitleText: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  puzzleDetailCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  puzzleDetailGradientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  puzzleDetailLevelText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  puzzleDetailDiffTag: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  puzzleDetailBody: {
    padding: 20,
    gap: 12,
  },
  puzzleDetailClueLabel: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
  },
  puzzleDetailClueText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  puzzleDetailStatsRow: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 6,
  },
  puzzleStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  puzzleStatText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
  },
  puzzlePlayBtn: {
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  puzzlePlayBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.5,
  },
  noPuzzleCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  noPuzzleTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginTop: 6,
  },
  noPuzzleDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  modalContainer: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalCloseButton: {
    padding: 2,
  },
  modalHeaderTitleBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderCategory: {
    fontSize: 10,
    color: "#60A5FA",
    fontWeight: "bold",
    letterSpacing: 1.2,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  modalHeaderTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 1.0,
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginTop: 2,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  clueCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  clueCardGradient: {
    paddingVertical: 20,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  clueLabel: {
    fontSize: 11,
    color: "#93C5FD",
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginBottom: 8,
  },
  clueText: {
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  slotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 14,
  },
  slotBox: {
    width: 44,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  slotLetter: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  hintTextBubble: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
    alignItems: "center",
  },
  hintBubbleTitle: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginBottom: 4,
  },
  hintBubbleText: {
    color: "#FFFFFF",
    fontSize: 13,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 18,
  },
  revealHintButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  revealHintText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  scrambledTilesContainer: {
    marginVertical: 18,
    gap: 10,
  },
  poolTitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  scrambledTilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  tileButton: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tileLetter: {
    fontSize: 26,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetActionBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  backspaceActionBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  submitButton: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 22,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "rgba(59, 130, 246, 0.4)",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  modalActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  victoryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 999,
  },
  victoryCard: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  victoryGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  victoryIcon: {
    marginBottom: 14,
  },
  victoryTitle: {
    fontSize: 26,
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 1.0,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  victoryPoints: {
    fontSize: 18,
    color: "#FBBF24",
    fontWeight: "bold",
    marginTop: 4,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  solvedWordDetails: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  solvedWordLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
  },
  solvedWordText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    marginVertical: 4,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  solvedWordClue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    fontFamily: "PlusJakartaSans_400Regular",
  },
  victoryActionRow: {
    width: "100%",
    gap: 10,
  },
  nextPuzzleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
  },
  nextPuzzleButtonText: {
    color: "#10B981",
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  backToDashboardButton: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  backToDashboardButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  loaderContainer: {
    flex: 1,
  },
  loaderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  loaderTextBox: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 30,
  },
  loaderText: {
    color: "#A2EBD0",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 2.0,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  loaderSubText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_400Regular",
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
  },
  statsContainerLeft: {
    flexDirection: "row",
    gap: 10,
  },
  statsContainerRight: {
    flexDirection: "row",
    gap: 10,
  },
  headerStatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  headerStatText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  cluePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(162, 235, 208, 0.12)",
    borderColor: "rgba(162, 235, 208, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  cluePillText: {
    color: "#A2EBD0",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.0,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  clueMetaText: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 10,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.8,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  sectionMeta: {
    color: "#94A3B8",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  bottomActionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(2, 17, 34, 0.95)",
  },
});
