import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, useThemeMode } from "@rneui/themed";
import * as Haptics from "expo-haptics";

import { PUZZLES, CATEGORIES, PAHELI_PUZZLES, Puzzle } from "../../constants/puzzles";
import { generatePuzzle } from "../../services/groqService";
import Header from "./components/Header";
import StreakCard from "./components/StreakCard";
import StatsPanel from "./components/StatsPanel";
import DailyChallenge from "./components/DailyChallenge";
import CategoryList from "./components/CategoryList";

export default function Dashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  // Dynamic Theme-aware Colors
  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#475569";
  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  // Game Mode State: Shabd (Word Scramble) vs Paheli (Riddles)
  const [gameMode, setGameMode] = useState<"shabd" | "paheli">("shabd");

  // Profile and Game Stats State
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("Player");
  const [avatar, setAvatar] = useState("🧔🏽‍♂️");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [groqPuzzle, setGroqPuzzle] = useState<Puzzle | null>(null);
  const [groqLoading, setGroqLoading] = useState(false);

  // Active Puzzles based on gameMode
  const modePuzzles = gameMode === "shabd" ? PUZZLES : PAHELI_PUZZLES;

  // Active Categories that contain puzzles for this mode
  const activeCategories = CATEGORIES.filter(cat => 
    modePuzzles.some(p => p.category === cat.name)
  );

  const fetchGroqPuzzle = async (mode: "shabd" | "paheli", currentSolvedIds?: string[]) => {
    setGroqLoading(true);
    try {
      const puzzle = await generatePuzzle(mode);
      setGroqPuzzle(puzzle);
      const cachedKey = mode === "shabd" ? "groq_shabd_puzzle" : "groq_paheli_puzzle";
      await AsyncStorage.setItem(cachedKey, JSON.stringify(puzzle));
    } catch (e) {
      console.error("[Home] Error generating Groq puzzle, falling back:", e);
      // Fallback to first unsolved local puzzle
      const solvedList = currentSolvedIds || solvedIds;
      const unsolved = (mode === "shabd" ? PUZZLES : PAHELI_PUZZLES).find((p) => !solvedList.includes(p.id)) || (mode === "shabd" ? PUZZLES[0] : PAHELI_PUZZLES[0]);
      setGroqPuzzle(unsolved);
      const cachedKey = mode === "shabd" ? "groq_shabd_puzzle" : "groq_paheli_puzzle";
      await AsyncStorage.setItem(cachedKey, JSON.stringify(unsolved));
    } finally {
      setGroqLoading(false);
    }
  };

  // Load stats and progress when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadGameProgress = async () => {
        try {
          const storedNickname = await AsyncStorage.getItem("user_nickname");
          const storedAvatar = await AsyncStorage.getItem("user_avatar");
          const scoreStr = await AsyncStorage.getItem("shabdgyan_score");
          const streakStr = await AsyncStorage.getItem("shabdgyan_streak");
          const solvedIdsStr = await AsyncStorage.getItem("shabdgyan_solved_ids");
          const storedMode = (await AsyncStorage.getItem("shabdgyan_mode")) as "shabd" | "paheli" || "shabd";

          if (storedNickname) setNickname(storedNickname);
          if (storedAvatar) setAvatar(storedAvatar);
          if (scoreStr) setScore(parseInt(scoreStr, 10) || 0);
          if (streakStr) setStreak(parseInt(streakStr, 10) || 0);
          if (solvedIdsStr) {
            setSolvedIds(JSON.parse(solvedIdsStr) || []);
          } else {
            setSolvedIds([]);
          }
          if (storedMode) {
            setGameMode(storedMode);
          }

          // Fetch / load cached Groq puzzle
          const cachedKey = storedMode === "shabd" ? "groq_shabd_puzzle" : "groq_paheli_puzzle";
          const cachedPuzzleStr = await AsyncStorage.getItem(cachedKey);
          const solvedList = JSON.parse(solvedIdsStr || "[]");
          if (cachedPuzzleStr) {
            const cachedPuzzle = JSON.parse(cachedPuzzleStr);
            setGroqPuzzle(cachedPuzzle);

            // If the cached Groq puzzle has already been solved, fetch a fresh one
            if (solvedList.includes(cachedPuzzle.id)) {
              console.log("[Home] Cached Groq puzzle already solved. Fetching new one...");
              fetchGroqPuzzle(storedMode, solvedList);
            }
          } else {
            fetchGroqPuzzle(storedMode, solvedList);
          }
        } catch (error) {
          console.error("Error loading dashboard data:", error);
        } finally {
          setLoading(false);
        }
      };

      loadGameProgress();
    }, [gameMode])
  );

  // Play Daily Challenge Button action
  const handlePlayDailyChallenge = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (groqPuzzle) {
      router.push({
        pathname: "/(authenticated)/play",
        params: { 
          categoryName: groqPuzzle.category, 
          difficulty: "Easy",
          dynamic: "true"
        }
      });
    } else {
      const nextUnsolved = modePuzzles.find((p) => !solvedIds.includes(p.id)) || modePuzzles[0];
      if (nextUnsolved) {
        router.push({
          pathname: "/(authenticated)/play",
          params: { categoryName: nextUnsolved.category, difficulty: "Easy" }
        });
      }
    }
  };

  const handleSelectCategory = (categoryName: string) => {
    router.push({
      pathname: "/(authenticated)/difficulty",
      params: { categoryName }
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.grey4 }]}>Loading Shabdgyan Hub...</Text>
      </View>
    );
  }

  const solvedInMode = solvedIds.filter((id) => modePuzzles.some((p) => p.id === id)).length;

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header: Mode Selector & Profile Avatar */}
        <Header
          nickname={nickname}
          avatar={avatar}
          gameMode={gameMode}
          setGameMode={setGameMode}
          isDark={isDark}
          textColor={textColor}
          subTextColor={subTextColor}
          borderColor={borderColor}
          groqWord={groqPuzzle?.answer}
        />

        {/* Weekly Streak Tracker */}
        <StreakCard
          streak={streak}
          isDark={isDark}
          textColor={textColor}
          subTextColor={subTextColor}
          cardBg={cardBg}
          borderColor={borderColor}
        />

        {/* Points & Solved Puzzles Stats */}
        <StatsPanel
          score={score}
          solvedInMode={solvedInMode}
          totalPuzzles={modePuzzles.length}
          textColor={textColor}
          subTextColor={subTextColor}
          cardBg={cardBg}
          borderColor={borderColor}
        />

        {/* Premium Play Daily Challenge Card */}
        <DailyChallenge
          solvedInMode={solvedInMode}
          totalPuzzles={modePuzzles.length}
          onPlay={handlePlayDailyChallenge}
        />

        {/* Categories Vertical Selection List */}
        <CategoryList
          categories={activeCategories}
          modePuzzles={modePuzzles}
          solvedIds={solvedIds}
          isDark={isDark}
          textColor={textColor}
          onSelectCategory={handleSelectCategory}
        />

        {/* Bottom spacer */}
        <View style={{ height: 60 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 14,
    fontFamily: "PlusJakartaSans_500Medium",
  },
});
