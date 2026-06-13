import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { showMessage } from "react-native-flash-message";
import { awardXP, getXPLevel } from "../utils/xpHelper";
import QuestCard from "../components/QuestCard";
import { syncTodayQuests } from "../services/databaseService";
import { supabase } from "../Supabase/client";

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

  // Score & Streak
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [questTotalEarned, setQuestTotalEarned] = useState(0);

  // Quest Statuses
  const [dailyWarriorStatus, setDailyWarriorStatus] = useState<string>("not_started");
  const [decipherScrollStatus, setDecipherScrollStatus] = useState<string>("not_started");
  const [highScoreHuntStatus, setHighScoreHuntStatus] = useState<string>("not_started");
  const [claimedBonus, setClaimedBonus] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const loadQuestStats = async () => {
        try {
          const scoreStr = await AsyncStorage.getItem("shabdgyan_score") || "0";
          const streakStr = await AsyncStorage.getItem("shabdgyan_streak") || "0";
          const todayStr = new Date().toISOString().split("T")[0];
          const lastPlayedDate = await AsyncStorage.getItem("quest_last_played_date");

          let q1Status = "not_started";
          let q2Status = "not_started";
          let q3Status = "not_started";
          let claimed = false;

          if (lastPlayedDate === todayStr) {
            q1Status = await AsyncStorage.getItem("quest_daily_warrior_status") || "not_started";
            q2Status = await AsyncStorage.getItem("quest_decipher_scroll_status") || "not_started";
            q3Status = await AsyncStorage.getItem("quest_high_score_hunt_status") || "not_started";
            claimed = (await AsyncStorage.getItem("quest_claimed_bonus")) === "true";
          } else {
            // New day! Reset statuses to not_started
            await AsyncStorage.setItem("quest_last_played_date", todayStr);
            await AsyncStorage.setItem("quest_daily_warrior_status", "not_started");
            await AsyncStorage.setItem("quest_decipher_scroll_status", "not_started");
            await AsyncStorage.setItem("quest_high_score_hunt_status", "not_started");
            await AsyncStorage.setItem("quest_claimed_bonus", "false");
          }

          // Sync daily quests from Supabase in background
          try {
            const syncedQuests = await syncTodayQuests();
            q1Status = syncedQuests.daily_warrior;
            q2Status = syncedQuests.decipher_scroll;
            q3Status = syncedQuests.high_score_hunt;
          } catch (err) {
            console.warn("[Quest] Failed to sync quests from Supabase:", err);
          }

          // Fetch quest XP total from Supabase points table (authoritative source)
          let questTotal = 0;
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: questPoints } = await supabase
                .from("points")
                .select("points")
                .eq("user_id", session.user.id)
                .in("reason", [
                  "daily_quest_completed",
                  "high_score_hunt_completed",
                  "secret_chest_bonus",
                  "decipher_scroll_completed",
                  "story_quest_completed",
                ]);
              if (questPoints && questPoints.length > 0) {
                questTotal = questPoints.reduce((sum, row) => sum + (row.points || 0), 0);
                // Keep AsyncStorage in sync
                await AsyncStorage.setItem("shabdgyan_quest_total_earned", String(questTotal));
              } else {
                // No quest XP in DB yet — use AsyncStorage fallback
                const cached = await AsyncStorage.getItem("shabdgyan_quest_total_earned");
                questTotal = parseInt(cached || "0", 10);
              }
            }
          } catch (err) {
            console.warn("[Quest] Failed to fetch quest XP from Supabase:", err);
            const cached = await AsyncStorage.getItem("shabdgyan_quest_total_earned");
            questTotal = parseInt(cached || "0", 10);
          }

          setScore(parseInt(scoreStr, 10));
          setStreak(parseInt(streakStr, 10));
          setQuestTotalEarned(questTotal);
          setDailyWarriorStatus(q1Status);
          setDecipherScrollStatus(q2Status);
          setHighScoreHuntStatus(q3Status);
          setClaimedBonus(claimed);
        } catch (e) {
          console.error(e);
        }
      };
      loadQuestStats();
    }, [])
  );

  const completedQuestsCount =
    (dailyWarriorStatus === "completed" ? 1 : 0) +
    (decipherScrollStatus === "completed" ? 1 : 0) +
    (highScoreHuntStatus === "completed" ? 1 : 0);

  const isChestUnlocked = score >= 500 && completedQuestsCount === 3;

  const handleClaimChest = async () => {
    if (score < 500) {
      showMessage({
        message: "Chest Locked! 🔒",
        description: "Reach 500 XP to unlock the secret chest!",
        type: "danger",
      });
      return;
    }
    if (completedQuestsCount < 3) {
      showMessage({
        message: "Missions Incomplete! 🔒",
        description: "Please complete all active quests first!",
        type: "warning",
      });
      return;
    }
    if (claimedBonus) {
      showMessage({
        message: "Already Claimed! 🏆",
        description: "You have already opened today's bonus chest!",
        type: "info",
      });
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Secret chest will give the random xp in between 50-100
      const randomXp = Math.floor(Math.random() * (100 - 50 + 1)) + 50;
      const newTotalScore = await awardXP(randomXp, "secret_chest_bonus");
      setScore(newTotalScore);
      setClaimedBonus(true);
      await AsyncStorage.setItem("quest_claimed_bonus", "true");

      showMessage({
        message: "Chest Unlocked! 🎁",
        description: `Congratulations! You received +${randomXp} Bonus XP!`,
        type: "success",
        duration: 3500,
      });
    } catch (e) {}
  };

  // 2. Normal Active Quest Board
  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header Title */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: textColor }]}>Quest Missions</Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>MISSION BOARD</Text>
          </View>
          <LinearGradient
            colors={["#0D9488", "#0F766E"]}
            style={styles.statsBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.statsBadgeLabel}>TOTAL EARNED</Text>
            <Text style={styles.statsBadgeText}>{questTotalEarned} XP</Text>
          </LinearGradient>
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
              A mysterious temple has been discovered in the ruins of Devgiri! Decipher the ancient scrolls below to unlock the hidden chambers.
            </Text>
          </View>
        </LinearGradient>

        {/* Quests Listing */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Active Quests</Text>
          
          <QuestCard
            title="Daily Warrior"
            description="Complete today's challenge"
            xp={80}
            progress={dailyWarriorStatus === "completed" ? 1 : 0}
            progressLabel={`${dailyWarriorStatus === "completed" ? 1 : 0}/1`}
            status={dailyWarriorStatus}
            iconName="calendar-outline"
            color="#3B82F6"
            cardBg={cardBg}
            borderColor={borderColor}
            textColor={textColor}
            subTextColor={subTextColor}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(authenticated)/quests/daily-warrior");
            }}
            actionText="Go Play"
            locked={false}
          />

          <QuestCard
            title="Decipher Scroll"
            description="Solve today's scroll riddle"
            xp={100}
            progress={decipherScrollStatus === "completed" ? 1 : 0}
            progressLabel={`${decipherScrollStatus === "completed" ? 1 : 0}/1`}
            status={decipherScrollStatus}
            iconName="trophy-outline"
            color="#10B981"
            cardBg={cardBg}
            borderColor={borderColor}
            textColor={textColor}
            subTextColor={subTextColor}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(authenticated)/quests/decipher-scroll");
            }}
            actionText="Go Solve"
            locked={false}
          />

          <QuestCard
            title="High Score Hunt"
            description="Survive the speed scramble challenge"
            xp={130}
            progress={highScoreHuntStatus === "completed" ? 1 : 0}
            progressLabel={`${highScoreHuntStatus === "completed" ? 1 : 0}/1`}
            status={highScoreHuntStatus}
            iconName="flash-outline"
            color="#F59E0B"
            cardBg={cardBg}
            borderColor={borderColor}
            textColor={textColor}
            subTextColor={subTextColor}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(authenticated)/quests/high-score-hunt");
            }}
            actionText="Earn XP"
            locked={false}
          />
        </View>

        {/* Bonus Quest Chest */}
        <View style={[styles.chestCard, { backgroundColor: cardBg, borderColor }]}>
          <MaterialCommunityIcons
            name={claimedBonus ? "treasure-chest" : isChestUnlocked ? "treasure-chest" : "lock"}
            size={72}
            color={claimedBonus ? "#10B981" : isChestUnlocked ? "#FBBF24" : subTextColor}
          />
          <Text style={[styles.chestTitle, { color: textColor }]}>
            {score < 500
              ? "Secret Chest Locked 🔒"
              : claimedBonus
              ? "Bonus Claimed! 🎉"
              : isChestUnlocked
              ? "Secret Chest Ready! 🎁"
              : "Secret Chest Locked 🔒"}
          </Text>
          <Text style={[styles.chestDesc, { color: subTextColor }]}>
            {score < 500
              ? "Reach 500 XP and complete all 3 daily quests to unlock the secret bonus chest!"
              : claimedBonus
              ? "New quests will arrive tomorrow!"
              : isChestUnlocked
              ? "Open this chest to receive a random bonus XP reward (50 to 100 XP)!"
              : "Complete all 3 daily quests to unlock the secret bonus chest."}
          </Text>
          <TouchableOpacity
            disabled={!isChestUnlocked || claimedBonus}
            onPress={handleClaimChest}
            style={[
              styles.chestBtn,
              {
                backgroundColor: claimedBonus
                  ? "rgba(16, 185, 129, 0.15)"
                  : isChestUnlocked
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
                    : isChestUnlocked
                    ? "#FFFFFF"
                    : subTextColor,
                },
              ]}
            >
              {score < 500
                ? "Locked (Needs 500 XP)"
                : claimedBonus
                ? "Claimed"
                : isChestUnlocked
                ? "Open Secret Chest 🔑"
                : "Locked (Complete 3 Quests)"}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 6,
  },
  statsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsBadgeLabel: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
  },
  statsBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 1,
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
  lockedContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    justifyContent: "flex-start",
  },
  lockedCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    marginTop: 10,
    gap: 16,
  },
  lockVisual: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  glowOuter: {
    justifyContent: "center",
    alignItems: "center",
  },
  lockedCardTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    textAlign: "center",
  },
  lockedCardDesc: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 15,
  },
  progressSection: {
    width: "100%",
    gap: 8,
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  progressCount: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  progressBarOuter: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    borderRadius: 4,
  },
  lockedPlayBtn: {
    width: "100%",
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  lockedPlayBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
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
    alignItems: "flex-start",
  },
  questHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
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
    marginTop: 2,
    lineHeight: 16,
  },
  questXP: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    color: "#10B981",
    textAlign: "right",
  },
  questFooter: {
    width: "100%",
  },
  actionBtn: {
    paddingVertical: 10,
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
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  badgeFailed: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  badgeTextCompleted: {
    color: "#10B981",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  badgeTextFailed: {
    color: "#EF4444",
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
