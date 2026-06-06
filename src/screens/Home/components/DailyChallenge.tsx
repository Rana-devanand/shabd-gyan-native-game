import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface DailyChallengeProps {
  solvedInMode: number;
  totalPuzzles: number;
  onPlay: () => void;
}

export default function DailyChallenge({
  solvedInMode,
  totalPuzzles,
  onPlay,
}: DailyChallengeProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPlay}
      style={styles.dailyChallengeWrapper}
    >
      <LinearGradient
        colors={["#3b82f6", "#8b5cf6", "#ec4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dailyChallengeCard}
      >
        <View style={styles.challengeCardLeft}>
          <Text style={styles.challengeCardTitle}>PLAY DAILY CHALLENGE</Text>
          <Text style={styles.challengeCardSubtitle}>
            {solvedInMode === totalPuzzles
              ? "All Puzzles Solved! Replay anytime!"
              : "Naya word aapka intezar kar raha hai!"}
          </Text>
        </View>
        <View style={styles.challengeCardRight}>
          <LinearGradient
            colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
            style={styles.playIconCircle}
          >
            <Ionicons name="play" size={28} color="#FFFFFF" />
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
    paddingLeft: 4,
  },
});
