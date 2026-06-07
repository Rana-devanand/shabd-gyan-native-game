import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { showMessage } from "react-native-flash-message";

const { width } = Dimensions.get("window");

export default function QuestScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#475569";
  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  // State tracking quest progress
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [claimedBonus, setClaimedBonus] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const loadQuestStats = async () => {
        try {
          const scoreStr = await AsyncStorage.getItem("shabdgyan_score") || "0";
          const streakStr = await AsyncStorage.getItem("shabdgyan_streak") || "0";
          const solvedIdsStr = await AsyncStorage.getItem("shabdgyan_solved_ids");
          const claimedStr = await AsyncStorage.getItem("quest_claimed_bonus") || "false";
          
          setScore(parseInt(scoreStr, 10));
          setStreak(parseInt(streakStr, 10));
          if (solvedIdsStr) {
            setSolvedCount(JSON.parse(solvedIdsStr).length);
          }
          setClaimedBonus(claimedStr === "true");
        } catch (e) {
          console.error(e);
        }
      };
      loadQuestStats();
    }, [])
  );

  // Dynamic values representing mock quests progress
  const quest1Progress = streak >= 1 ? 1 : 0; // Daily Challenge complete
  const quest2Progress = solvedCount >= 2 ? 2 : solvedCount; // Solve 2 levels
  const quest3Progress = score >= 300 ? 3 : Math.floor(score / 100) > 3 ? 3 : Math.floor(score / 100); // Earn 300 points

  const completedQuestsCount = 
    (quest1Progress >= 1 ? 1 : 0) + 
    (quest2Progress >= 2 ? 1 : 0) + 
    (quest3Progress >= 3 ? 1 : 0);

  const handleClaimChest = async () => {
    if (completedQuestsCount < 3) {
      showMessage({
        message: "Missions Incomplete! 🔒",
        description: "Pehle saare quest poore kijiye!",
        type: "warning",
      });
      return;
    }
    if (claimedBonus) {
      showMessage({
        message: "Already Claimed! 🏆",
        description: "Aapne aaj ka bonus chest pehle hi khol liya hai!",
        type: "info",
      });
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newScore = score + 500;
      setScore(newScore);
      setClaimedBonus(true);
      await AsyncStorage.setItem("shabdgyan_score", newScore.toString());
      await AsyncStorage.setItem("quest_claimed_bonus", "true");
      showMessage({
        message: "Chest Unlocked! 🎁",
        description: "Badhai ho! Aapko +500 Bonus XP mile hain!",
        type: "success",
        duration: 3000,
      });
    } catch (e) {}
  };

  return (
<SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
  <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
    
    {/* Header Title */}
    <View style={styles.header}>
      <Text style={[styles.title, { color: textColor }]}>Quest Missions ⚔️</Text>
      <Text style={[styles.subtitle, { color: subTextColor }]}>MISSION BOARD</Text>
    </View>

    {/* Narrative Banner */}
    <LinearGradient
      colors={["#4F46E5", "#3B82F6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.narrativeBanner}
    >
      <View style={styles.narrativeContent}>
        <Text style={styles.narrativeTitle}>The Devgiri Expedition 🧭</Text>
        <Text style={styles.narrativeText}>
          A hidden temple has been discovered in the ruins of Devgiri! Decipher the ancient scripts below to unlock the secret chambers.
        </Text>
      </View>
    </LinearGradient>

    {/* Quests Listing */}
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Active Quests</Text>
      
      {/* Quest 1 */}
      <View style={[styles.questCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.questHeader}>
          <View style={styles.questHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
              <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
            </View>
            <View>
              <Text style={[styles.questTitle, { color: textColor }]}>Daily Warrior</Text>
              <Text style={[styles.questDesc, { color: subTextColor }]}>Complete today's challenge</Text>
            </View>
          </View>
          <Text style={styles.questXP}>+150 XP</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressOuter}>
            <View style={[styles.progressInner, { width: `${quest1Progress * 100}%`, backgroundColor: "#3B82F6" }]} />
          </View>
          <Text style={[styles.progressText, { color: textColor }]}>{quest1Progress}/1</Text>
        </View>
        {quest1Progress >= 1 ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/")}
            style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
          >
            <Text style={styles.actionBtnText}>Go Play</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quest 2 */}
      <View style={[styles.questCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.questHeader}>
          <View style={styles.questHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
              <Ionicons name="trophy-outline" size={24} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.questTitle, { color: textColor }]}>Decipher Scroll</Text>
              <Text style={[styles.questDesc, { color: subTextColor }]}>Solve 2 puzzles in any category</Text>
            </View>
          </View>
          <Text style={styles.questXP}>+200 XP</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressOuter}>
            <View style={[styles.progressInner, { width: `${(quest2Progress / 2) * 100}%`, backgroundColor: "#10B981" }]} />
          </View>
          <Text style={[styles.progressText, { color: textColor }]}>{quest2Progress}/2</Text>
        </View>
        {quest2Progress >= 2 ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/")}
            style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
          >
            <Text style={styles.actionBtnText}>Go Solve</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quest 3 */}
      <View style={[styles.questCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.questHeader}>
          <View style={styles.questHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
              <Ionicons name="flash-outline" size={24} color="#F59E0B" />
            </View>
            <View>
              <Text style={[styles.questTitle, { color: textColor }]}>High Score Hunt</Text>
              <Text style={[styles.questDesc, { color: subTextColor }]}>Earn a total of 300 points</Text>
            </View>
          </View>
          <Text style={styles.questXP}>+300 XP</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressOuter}>
            <View style={[styles.progressInner, { width: `${(quest3Progress / 3) * 100}%`, backgroundColor: "#F59E0B" }]} />
          </View>
          <Text style={[styles.progressText, { color: textColor }]}>{quest3Progress}/3</Text>
        </View>
        {quest3Progress >= 3 ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/")}
            style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
          >
            <Text style={styles.actionBtnText}>Earn XP</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>

    {/* Bonus Quest Chest */}
    <View style={[styles.chestCard, { backgroundColor: cardBg, borderColor }]}>
      <MaterialCommunityIcons
        name={claimedBonus ? "treasure-chest" : completedQuestsCount === 3 ? "treasure-chest" : "lock"}
        size={72}
        color={claimedBonus ? "#10B981" : completedQuestsCount === 3 ? "#FBBF24" : subTextColor}
      />
      <Text style={[styles.chestTitle, { color: textColor }]}>
        {claimedBonus
          ? "Bonus Claimed! 🎉"
          : completedQuestsCount === 3
          ? "Secret Chest Ready! 🎁"
          : "Secret Chest Locked 🔒"}
      </Text>
      <Text style={[styles.chestDesc, { color: subTextColor }]}>
        {claimedBonus
          ? "New quests will arrive tomorrow!"
          : "Unlock this chest to receive a bonus +500 XP reward after completing all three quests."}
      </Text>
      <TouchableOpacity
        disabled={completedQuestsCount < 3 || claimedBonus}
        onPress={handleClaimChest}
        style={[
          styles.chestBtn,
          {
            backgroundColor: claimedBonus
              ? "rgba(16, 185, 129, 0.15)"
              : completedQuestsCount === 3
              ? "#F59E0B"
              : isDark
              ? "#072C50"
              : "#E2E8F0",
          },
        ]}
      >
        <Text
          style={[
            styles.chestBtnText,
            {
              color: claimedBonus
                ? "#10B981"
                : completedQuestsCount === 3
                ? "#FFFFFF"
                : subTextColor,
            },
          ]}
        >
          {claimedBonus ? "Claimed" : "Open Secret Chest 🔑"}
        </Text>
      </TouchableOpacity>
    </View>

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
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  header: {
    marginBottom: 20,
    marginTop: 6,
  },
  title: {
    fontSize: 28,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 2,
  },
  narrativeBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
  },
  narrativeContent: {
    gap: 6,
  },
  narrativeTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  narrativeText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 18,
  },
  section: {
    gap: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  questCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  questHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  questTitle: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
  },
  questDesc: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  questXP: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    color: "#10B981",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  progressOuter: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressInner: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    width: 30,
    textAlign: "right",
  },
  actionBtn: {
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  completedText: {
    color: "#10B981",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  chestCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  chestTitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    marginTop: 6,
  },
  chestDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "PlusJakartaSans_500Medium",
    paddingHorizontal: 10,
  },
  chestBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  chestBtnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
});
