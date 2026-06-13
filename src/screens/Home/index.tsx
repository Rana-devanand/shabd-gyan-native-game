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
import { showMessage } from "react-native-flash-message";

import { PUZZLES, CATEGORIES, PAHELI_PUZZLES, Puzzle } from "../../constants/puzzles";
import { claimDailyStreakXP } from "../../utils/xpHelper";
import { generatePuzzle } from "../../services/groqService";
import { syncUserProfile, syncSolvedPuzzles, fetchCategoryLimits } from "../../services/databaseService";
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
  const [solvedCounts, setSolvedCounts] = useState<Record<string, number>>({});
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
  const [groqPuzzle, setGroqPuzzle] = useState<Puzzle | null>(null);
  const [groqLoading, setGroqLoading] = useState(false);
  const [dailyChallengeStatus, setDailyChallengeStatus] = useState<"not_played" | "success" | "failed">("not_played");

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
          const solvedCountsStr = await AsyncStorage.getItem("shabdgyan_solved_counts");
          const limitsStr = await AsyncStorage.getItem("shabdgyan_category_limits");
          const storedMode = (await AsyncStorage.getItem("shabdgyan_mode")) as "shabd" | "paheli" || "shabd";

          if (storedNickname) setNickname(storedNickname);
          if (storedAvatar) setAvatar(storedAvatar);
          if (scoreStr) setScore(parseInt(scoreStr, 10) || 0);
          if (streakStr) setStreak(parseInt(streakStr, 10) || 0);
          let currentSolved = [];
          if (solvedIdsStr) {
            currentSolved = JSON.parse(solvedIdsStr) || [];
            setSolvedIds(currentSolved);
          } else {
            setSolvedIds([]);
          }

          let currentCounts: Record<string, Record<string, number>> = { shabd: {}, paheli: {} };
          if (solvedCountsStr) {
            currentCounts = JSON.parse(solvedCountsStr) || { shabd: {}, paheli: {} };
          }
          setSolvedCounts(currentCounts[storedMode] || {});

          if (limitsStr) {
            setCategoryLimits(JSON.parse(limitsStr) || {});
          }

          if (storedMode) {
            setGameMode(storedMode);
          }

          // Check if daily challenge was completed today
          const todayStr = new Date().toISOString().split("T")[0];
          const dailyChallengeCompletedDate = await AsyncStorage.getItem("shabdgyan_daily_challenge_completed_date");
          if (dailyChallengeCompletedDate === todayStr) {
            const status = await AsyncStorage.getItem("shabdgyan_daily_challenge_status") || "success";
            setDailyChallengeStatus(status as any);
          } else {
            setDailyChallengeStatus("not_played");
          }

          // Check and claim daily login streak reward
          try {
            const streakClaim = await claimDailyStreakXP();
            if (streakClaim.claimed) {
              showMessage({
                message: "Daily Login Streak! 🔥",
                description: `You earned +10 XP! Streak is now ${streakClaim.newStreak} days.`,
                type: "success",
                duration: 3500,
              });
              const newScoreStr = await AsyncStorage.getItem("shabdgyan_score") || "0";
              setScore(parseInt(newScoreStr, 10));
              setStreak(streakClaim.newStreak);
            }
          } catch(e){
            console.warn("[Home] Daily streak check error:", e);
          }

          // Sync from Supabase in background
          try {
            const profile = await syncUserProfile();
            if (profile) {
              if (profile.nickname) setNickname(profile.nickname);
              if (profile.avatar) setAvatar(profile.avatar);
              setScore(profile.score);
              setStreak(profile.streak);
            }

            const { solvedIds: freshSolved, counts: freshCounts } = await syncSolvedPuzzles();
            setSolvedIds(freshSolved || []);
            currentSolved = freshSolved || [];
            if (freshCounts) {
              setSolvedCounts(freshCounts[gameMode] || freshCounts[storedMode] || {});
            }

            try {
              const freshLimits = await fetchCategoryLimits();
              if (Object.keys(freshLimits).length > 0) {
                setCategoryLimits(freshLimits);
                await AsyncStorage.setItem("shabdgyan_category_limits", JSON.stringify(freshLimits));
              }
            } catch (err) {
              console.warn("[Home] Failed to sync category limits:", err);
            }
          } catch (dbErr) {
            console.warn("[Home] Database sync failed:", dbErr);
          }

          // Fetch / load cached Groq puzzle
          const cachedKey = storedMode === "shabd" ? "groq_shabd_puzzle" : "groq_paheli_puzzle";
          const cachedPuzzleStr = await AsyncStorage.getItem(cachedKey);
          if (cachedPuzzleStr) {
            const cachedPuzzle = JSON.parse(cachedPuzzleStr);
            setGroqPuzzle(cachedPuzzle);

            // If the cached Groq puzzle has already been solved, fetch a fresh one
            if (currentSolved.includes(cachedPuzzle.id)) {
              console.log("[Home] Cached Groq puzzle already solved. Fetching new one...");
              fetchGroqPuzzle(storedMode, currentSolved);
            }
          } else {
            fetchGroqPuzzle(storedMode, currentSolved);
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
    if (dailyChallengeStatus !== "not_played") {
      const isSuccess = dailyChallengeStatus === "success";
      showMessage({
        message: isSuccess ? "Challenge Completed Today! 🌟" : "Challenge Failed Today! 🔒",
        description: isSuccess 
          ? "You got 50 XP! You have already completed today's daily challenge. Come back tomorrow!" 
          : "You failed today's challenge by revealing the answer. Come back tomorrow!",
        type: isSuccess ? "info" : "danger",
      });
      return;
    }

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

  const solvedInMode = activeCategories.reduce((acc, cat) => acc + (solvedCounts[cat.name] || 0), 0);
  const totalPuzzles = activeCategories.reduce((acc, cat) => acc + (categoryLimits[cat.name] || 1000), 0);

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
          totalPuzzles={totalPuzzles}
          textColor={textColor}
          subTextColor={subTextColor}
          cardBg={cardBg}
          borderColor={borderColor}
        />

        {/* Premium Play Daily Challenge Card */}
        <DailyChallenge
          solvedInMode={solvedInMode}
          totalPuzzles={totalPuzzles}
          onPlay={handlePlayDailyChallenge}
          completedStatus={dailyChallengeStatus}
        />

        {/* Categories Vertical Selection List */}
        <CategoryList
          categories={activeCategories}
          modePuzzles={modePuzzles}
          solvedCounts={solvedCounts}
          categoryLimits={categoryLimits}
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
