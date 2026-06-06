import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import * as Haptics from "expo-haptics";
import { showMessage } from "react-native-flash-message";

import { PUZZLES, CATEGORIES, PAHELI_PUZZLES, Puzzle } from "@/src/constants/puzzles";

const { width } = Dimensions.get("window");

export default function PlayScreen() {
  const { categoryName, difficulty } = useLocalSearchParams<{ categoryName: string; difficulty: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#475569";
  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  // Game Stats
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<"shabd" | "paheli">("shabd");

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
  const matchedPuzzle = catPuzzles[diffIndex];

  // Initialize a puzzle play state
  const startPuzzle = async (puzzle: Puzzle) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

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
    } catch (e) {}

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

    // Check if the puzzle is complete
    checkAnswer(newSelected);
  };

  // Tap a selected slot to remove the letter
  const handleRemoveSelected = async (slotIdx: number) => {
    const slotItem = selectedLetters[slotIdx];
    if (!slotItem || isCorrect) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

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
    } catch (e) {}

    // Set all scrambled tiles back to untapped
    const resetScrambled = scrambledLetters.map((item) => ({ ...item, tapped: false }));
    setScrambledLetters(resetScrambled);
    setSelectedLetters(new Array(activePuzzle.answer.length).fill(null));
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
      } catch (e) {}

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
      } catch (e) {}
      showMessage({
        message: "Opps! Galat Jawab ❌",
        description: "Tiles ko sahi order mein jamayein!",
        type: "danger",
        duration: 1500,
      });
    }
  };

  // Launch Next Unsolved Level
  const handlePlayNext = () => {
    if (!activePuzzle) return;

    const currentIdx = modePuzzles.findIndex((p) => p.id === activePuzzle.id);
    let nextPuzzle = modePuzzles.slice(currentIdx + 1).find((p) => !solvedIds.includes(p.id));

    if (!nextPuzzle) {
      nextPuzzle = modePuzzles.find((p) => !solvedIds.includes(p.id));
    }

    if (nextPuzzle) {
      startPuzzle(nextPuzzle);
    } else {
      setActivePuzzle(null);
      showMessage({
        message: "Congratulations! 🎉",
        description: "Aapne saare puzzles solve kar liye hain!",
        type: "success",
        duration: 3500,
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isPuzzleSolved = matchedPuzzle ? solvedIds.includes(matchedPuzzle.id) : false;

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
          {categoryName?.toUpperCase()} • {difficulty?.toUpperCase()}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.levelsStepSection}>
          <View style={styles.stepTitleContainer}>
            <Text style={[styles.stepTitleText, { color: textColor }]}>Level Board 🎮</Text>
          </View>

          {matchedPuzzle ? (
            <View style={[styles.puzzleDetailCard, { backgroundColor: cardBg, borderColor }]}>
              <LinearGradient
                colors={
                  CATEGORIES.find((c) => c.name === categoryName)?.gradient || [
                    "#4F46E5",
                    "#06B6D4",
                  ]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.puzzleDetailGradientHeader}
              >
                <Text style={styles.puzzleDetailLevelText}>
                  LEVEL {diffIndex + 1}
                </Text>
                <Text style={styles.puzzleDetailDiffTag}>
                  {difficulty?.toUpperCase()}
                </Text>
              </LinearGradient>

              <View style={styles.puzzleDetailBody}>
                <Text style={[styles.puzzleDetailClueLabel, { color: subTextColor }]}>Hinglish Clue:</Text>
                <Text style={[styles.puzzleDetailClueText, { color: textColor }]}>
                  "{matchedPuzzle.clue}"
                </Text>

                <View style={styles.puzzleDetailStatsRow}>
                  <View style={styles.puzzleStatItem}>
                    <Ionicons name="sparkles" size={16} color="#FBBF24" />
                    <Text style={[styles.puzzleStatText, { color: textColor }]}>100 Points Reward</Text>
                  </View>
                  <View style={styles.puzzleStatItem}>
                    <Ionicons name="checkbox" size={16} color={isPuzzleSolved ? "#10B981" : subTextColor} />
                    <Text style={[styles.puzzleStatText, { color: textColor }]}>
                      {isPuzzleSolved ? "Solved ✅" : "Unsolved 🔒"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => startPuzzle(matchedPuzzle)}
                  style={styles.puzzlePlayBtn}
                >
                  <Text style={styles.puzzlePlayBtnText}>
                    {isPuzzleSolved ? "REPLAY LEVEL 🔄" : "CHALO KHELEIN! 🚀"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.noPuzzleCard, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="lock-closed" size={48} color={subTextColor} />
              <Text style={[styles.noPuzzleTitle, { color: textColor }]}>No Puzzle Found 🔒</Text>
              <Text style={[styles.noPuzzleDesc, { color: subTextColor }]}>
                Is mode mein abhi koi paheli available nahi hai! Jald hi hum naye levels add karenge.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Gameplay Fullscreen Overlay Modal */}
      {activePuzzle && (
        <Modal
          visible={activePuzzle !== null}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setActivePuzzle(null)}
        >
          <LinearGradient
            colors={["#021122", "#0b203c", "#021122"]}
            style={styles.modalContainer}
          >
            <SafeAreaView style={styles.modalSafeArea}>
              
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActivePuzzle(null)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close-circle-outline" size={32} color="#94A3B8" />
                </TouchableOpacity>

                <View style={styles.modalHeaderTitleBox}>
                  <Text style={styles.modalHeaderCategory}>{activePuzzle.category.toUpperCase()}</Text>
                  <Text style={styles.modalHeaderTitle}>UNSCRAMBLE WORD</Text>
                </View>
                
                <View style={{ width: 32 }} />
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Clue Card */}
                <View style={styles.clueCard}>
                  <LinearGradient
                    colors={["rgba(59, 130, 246, 0.15)", "rgba(139, 92, 246, 0.15)"]}
                    style={styles.clueCardGradient}
                  >
                    <Text style={styles.clueLabel}>Hinglish Clue 💡</Text>
                    <Text style={styles.clueText}>"{activePuzzle.clue}"</Text>
                  </LinearGradient>
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
                        slot
                          ? { borderColor: "#60A5FA", backgroundColor: "rgba(30, 58, 138, 0.7)" }
                          : { borderColor: "rgba(255, 255, 255, 0.15)", borderStyle: "dashed" },
                      ]}
                    >
                      <Text style={styles.slotLetter}>{slot ? slot.letter : ""}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Hint Disclosure */}
                {showHint ? (
                  <View style={styles.hintTextBubble}>
                    <Text style={styles.hintBubbleTitle}>Hint Details:</Text>
                    <Text style={styles.hintBubbleText}>{activePuzzle.hint}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                      setShowHint(true);
                    }}
                    style={styles.revealHintButton}
                  >
                    <MaterialCommunityIcons name="lightbulb-on" size={18} color="#FBBF24" />
                    <Text style={styles.revealHintText}>Reveal Hint</Text>
                  </TouchableOpacity>
                )}

                {/* Scrambled letters tiles pool */}
                <View style={styles.scrambledTilesContainer}>
                  <Text style={styles.poolTitle}>Letter Tiles (Tap to insert):</Text>
                  <View style={styles.scrambledTilesGrid}>
                    {scrambledLetters.map((tile, idx) => (
                      <TouchableOpacity
                        key={`tile_${tile.index}_${idx}`}
                        activeOpacity={0.8}
                        onPress={() => handleTapScrambled(tile, idx)}
                        disabled={tile.tapped || isCorrect}
                        style={[
                          styles.tileButton,
                          tile.tapped
                            ? { backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.05)" }
                            : { backgroundColor: "rgba(255, 255, 255, 0.12)", borderColor: "#818CF8" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tileLetter,
                            { opacity: tile.tapped ? 0.15 : 1.0, color: tile.tapped ? "#475569" : "#FFFFFF" },
                          ]}
                        >
                          {tile.letter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Action Row */}
                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleResetPuzzle}
                    disabled={isCorrect}
                    style={[styles.modalActionBtn, styles.resetActionBtn]}
                  >
                    <Ionicons name="refresh" size={18} color="#FFFFFF" />
                    <Text style={styles.modalActionBtnText}>Clear Board</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setActivePuzzle(null)}
                    style={[styles.modalActionBtn, styles.giveUpActionBtn]}
                  >
                    <Ionicons name="exit-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalActionBtnText}>Go Back</Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>

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
                          style={styles.nextPuzzleButton}
                        >
                          <Text style={styles.nextPuzzleButtonText}>Next Level</Text>
                          <Ionicons name="arrow-forward" size={18} color="#10B981" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setActivePuzzle(null)}
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
        </Modal>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
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
    width: 50,
    height: 50,
    borderRadius: 12,
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
    fontSize: 22,
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
  giveUpActionBtn: {
    backgroundColor: "#dc2626",
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
});
