import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { PUZZLES, PAHELI_PUZZLES } from "@/src/constants/puzzles";

export default function DifficultyScreen() {
  const { categoryName } = useLocalSearchParams<{ categoryName: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#475569";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  const [gameMode, setGameMode] = useState<"shabd" | "paheli">("shabd");
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Easy");

  useEffect(() => {
    const loadState = async () => {
      try {
        const storedMode = await AsyncStorage.getItem("shabdgyan_mode") || "shabd";
        setGameMode(storedMode as any);
        const solvedIdsStr = await AsyncStorage.getItem("shabdgyan_solved_ids");
        if (solvedIdsStr) {
          setSolvedIds(JSON.parse(solvedIdsStr));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadState();
  }, []);

  const modePuzzles = gameMode === "shabd" ? PUZZLES : PAHELI_PUZZLES;

  const getPointsRules = (mode: "shabd" | "paheli", diff: string) => {
    if (mode === "shabd") {
      switch (diff) {
        case "Easy": return { base: 100, deduction: 20, withHint: 80 };
        case "Medium": return { base: 150, deduction: 30, withHint: 120 };
        case "Hard": return { base: 200, deduction: 50, withHint: 150 };
        case "Super Hard": return { base: 300, deduction: 100, withHint: 200 };
        default: return { base: 100, deduction: 20, withHint: 80 };
      }
    } else {
      switch (diff) {
        case "Easy": return { base: 120, deduction: 30, withHint: 90 };
        case "Medium": return { base: 180, deduction: 40, withHint: 140 };
        case "Hard": return { base: 250, deduction: 60, withHint: 190 };
        case "Super Hard": return { base: 350, deduction: 100, withHint: 250 };
        default: return { base: 120, deduction: 30, withHint: 90 };
      }
    }
  };

  const points = getPointsRules(gameMode, selectedDifficulty);

  const handleStartGame = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    router.push({
      pathname: "/(authenticated)/play",
      params: { categoryName, difficulty: selectedDifficulty }
    });
  };

  const difficultyDetails: Record<string, { desc: string; color: string; icon: string }> = {
    Easy: {
      desc: "Fun & light words for a quick warmup! 🥳",
      color: "#10B981",
      icon: "happy-outline",
    },
    Medium: {
      desc: "Slightly tricky, perfect for casual players. 🧠",
      color: "#3B82F6",
      icon: "bulb-outline",
    },
    Hard: {
      desc: "Mind-bending words that challenge your vocabulary. 🔥",
      color: "#F59E0B",
      icon: "flame-outline",
    },
    "Super Hard": {
      desc: "Extreme levels for the ultimate Shabd Khel masters! ⚡",
      color: "#EF4444",
      icon: "flash-outline",
    },
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
      {/* Header back row */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerCategoryText, { color: subTextColor }]}>
          {categoryName?.toUpperCase()}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.difficultyHeaderContainer}>
          <Text style={[styles.difficultyTitleText, { color: textColor }]}>Difficulty</Text>
          <Text style={[styles.difficultySubTitleText, { color: isDark ? "#A2EBD0" : "#10B981" }]}>SELECT YOUR CHALLENGE</Text>
        </View>

        {/* 2x2 Grid of difficulties */}
        <View style={styles.difficultyGrid}>
          {[
            { id: "Easy", name: "Easy" },
            { id: "Medium", name: "Medium" },
            { id: "Hard", name: "Hard" },
            { id: "Super Hard", name: "Super-Hard" },
          ].map((diff) => {
            const isSelected = selectedDifficulty === diff.id;
            const details = difficultyDetails[diff.id];
            
            const catPuzzles = modePuzzles.filter((p) => p.category === categoryName);
            const diffIndex = ["Easy", "Medium", "Hard", "Super Hard"].indexOf(diff.id);
            const matchedPuzzle = catPuzzles[diffIndex];
            const isSolved = matchedPuzzle ? solvedIds.includes(matchedPuzzle.id) : false;

            return (
              <TouchableOpacity
                key={diff.id}
                activeOpacity={0.85}
                onPress={async () => {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (e) {}
                  setSelectedDifficulty(diff.id);
                }}
                style={[
                  styles.screenshotDifficultyCard,
                  {
                    backgroundColor: isDark ? "#05203B" : "#FFFFFF",
                    borderColor: isSelected ? details.color : borderColor,
                    borderWidth: isSelected ? 2.5 : 1.5,
                  },
                ]}
              >
                <View style={styles.screenshotIconCircleContainer}>
                  <View
                    style={[
                      styles.screenshotIconCircle,
                      {
                        borderColor: isSelected ? `${details.color}44` : isDark ? "rgba(162, 235, 208, 0.25)" : "rgba(16, 185, 129, 0.2)",
                        backgroundColor: isSelected ? `${details.color}15` : isDark ? "rgba(162, 235, 208, 0.08)" : "rgba(16, 185, 129, 0.06)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={details.icon as any}
                      size={28}
                      color={isSelected ? details.color : isDark ? "#A2EBD0" : "#10B981"}
                    />
                  </View>
                </View>
                <Text style={[styles.screenshotDiffName, { color: textColor }]}>{diff.name}</Text>
                
                {isSolved && (
                  <View style={styles.diffSolvedIndicatorBadge}>
                    <Ionicons name="checkmark-done" size={10} color="#10B981" />
                    <Text style={styles.diffSolvedIndicatorText}>SOLVED</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Difficulty Description Card */}
        <View style={[styles.descriptionCard, { backgroundColor: isDark ? "#072C50" : "#F8FAFC", borderColor }]}>
          <Text style={[styles.descriptionTitle, { color: difficultyDetails[selectedDifficulty].color, alignSelf: "center" }]}>
            {selectedDifficulty.toUpperCase()} MODE
          </Text>
          <Text style={[styles.descriptionText, { color: textColor, alignSelf: "center" }]}>
            {difficultyDetails[selectedDifficulty].desc}
          </Text>

          {/* Points Rules List */}
          <View style={[styles.rulesList, { borderTopColor: borderColor }]}>
            <View style={styles.ruleRow}>
              <Ionicons name="sparkles-outline" size={16} color={difficultyDetails[selectedDifficulty].color} />
              <Text style={[styles.ruleText, { color: textColor }]}>
                Solve without Hint: <Text style={styles.boldText}>+{points.base} XP</Text>
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <Ionicons name="help-buoy-outline" size={16} color={isDark ? "#A2EBD0" : "#10B981"} />
              <Text style={[styles.ruleText, { color: textColor }]}>
                Solve with Hint: <Text style={styles.boldText}>+{points.withHint} XP</Text> (revealing hint costs <Text style={styles.penaltyText}>-{points.deduction} XP</Text>)
              </Text>
            </View>
            <View style={styles.ruleRow}>
              <Ionicons name="refresh-outline" size={16} color="#3B82F6" />
              <Text style={[styles.ruleText, { color: textColor }]}>
                Replay practice: <Text style={styles.boldText}>+0 XP</Text> (Practice only)
              </Text>
            </View>
          </View>
        </View>

        {/* Start Game Action Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleStartGame}
          style={styles.startButtonWrapper}
        >
          <LinearGradient
            colors={["#10B981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Text style={styles.startButtonText}>CHALO KHELEIN! 🚀</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 20,
  },
  difficultyHeaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  difficultyTitleText: {
    fontSize: 32,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  difficultySubTitleText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 4,
  },
  difficultyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginVertical: 10,
  },
  screenshotDifficultyCard: {
    width: "47%",
    aspectRatio: 0.95,
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    position: "relative",
  },
  screenshotIconCircleContainer: {
    marginBottom: 10,
  },
  screenshotIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  screenshotDiffName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    textAlign: "center",
  },
  diffSolvedIndicatorBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    gap: 2,
  },
  diffSolvedIndicatorText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#10B981",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  descriptionCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 6,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  descriptionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 18,
  },
  rulesList: {
    width: "100%",
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruleText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  boldText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  penaltyText: {
    color: "#EF4444",
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  startButtonWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 1,
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
