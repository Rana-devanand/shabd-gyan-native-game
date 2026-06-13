import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface DailyChallengeProps {
  solvedInMode: number;
  totalPuzzles: number;
  onPlay: () => void;
  completedStatus?: "not_played" | "success" | "failed";
}

export default function DailyChallenge({
  solvedInMode,
  totalPuzzles,
  onPlay,
  completedStatus = "not_played",
}: DailyChallengeProps) {
  const isCompleted = completedStatus !== "not_played";
  const isSuccess = completedStatus === "success";
  const isFailed = completedStatus === "failed";

  // Gradient Colors
  let gradientColors = ["#3b82f6", "#8b5cf6", "#ec4899"]; // Not played
  if (isSuccess) {
    gradientColors = ["#059669", "#10b981", "#34d399"]; // Success
  } else if (isFailed) {
    gradientColors = ["#b91c1c", "#dc2626", "#7f1d1d"]; // Failed (Crimson/Red)
  }

  // Icons
  let iconName: any = "play";
  if (isSuccess) {
    iconName = "checkmark-done";
  } else if (isFailed) {
    iconName = "close";
  }

  return (
    <TouchableOpacity
      activeOpacity={isCompleted ? 1.0 : 0.85}
      onPress={onPlay}
      disabled={isCompleted}
      style={styles.dailyChallengeWrapper}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dailyChallengeCard}
      >
        <View style={styles.challengeCardLeft}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
            <Text style={styles.challengeCardTitle}>
              {isSuccess 
                ? "DAILY CHALLENGE COMPLETED" 
                : isFailed 
                ? "DAILY CHALLENGE FAILED" 
                : "PLAY DAILY CHALLENGE"}
            </Text>
            {!isCompleted && (
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>+50 XP</Text>
              </View>
            )}
          </View>
          <Text style={styles.challengeCardSubtitle}>
            {isSuccess
              ? "You got 50 XP today! 🎉"
              : isFailed
              ? "Challenge failed! Come back tomorrow. 🔒"
              : solvedInMode === totalPuzzles
              ? "All Puzzles Solved! Replay anytime!"
              : "A new word is waiting for you!"}
          </Text>
        </View>
        <View style={styles.challengeCardRight}>
          <LinearGradient
            colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
            style={[styles.playIconCircle, !isCompleted && { paddingLeft: 4 }]}
          >
            <Ionicons
              name={iconName}
              size={28}
              color="#FFFFFF"
            />
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  dailyChallengeWrapper: {
    marginBottom: 26,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  dailyChallengeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  challengeCardLeft: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 10,
  },
  challengeCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  challengeCardSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  challengeCardRight: {
    justifyContent: "center",
    alignItems: "center",
  },
  playIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  xpBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  xpBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
