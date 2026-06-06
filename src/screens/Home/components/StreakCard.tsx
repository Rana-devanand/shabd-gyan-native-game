import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface StreakCardProps {
  streak: number;
  isDark: boolean;
  textColor: string;
  subTextColor: string;
  cardBg: string;
  borderColor: string;
}

export default function StreakCard({
  streak,
  isDark,
  textColor,
  subTextColor,
  cardBg,
  borderColor,
}: StreakCardProps) {
  return (
    <View style={[styles.streakCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.streakHeader}>
        <View style={styles.streakHeaderLeft}>
          <MaterialCommunityIcons name="fire" size={24} color="#EF4444" />
          <Text style={[styles.streakTitle, { color: textColor }]}>
            {streak} Day Streak
          </Text>
        </View>
        <Text style={[styles.streakSubtext, { color: subTextColor }]}>
          {streak > 0 ? "Bohot achhe! Kal firse khele!" : "Keep the flame burning!"}
        </Text>
      </View>

      {/* Visual Indicators for 7 Days */}
      <View style={styles.daysContainer}>
        {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => {
          const isActive = streak > idx;
          return (
            <View key={day + idx} style={styles.dayWrapper}>
              <LinearGradient
                colors={isActive ? ["#EF4444", "#F59E0B"] : [isDark ? "#072C50" : "#E2E8F0", isDark ? "#072C50" : "#E2E8F0"]}
                style={styles.dayFlameCircle}
              >
                <MaterialCommunityIcons
                  name={isActive ? "fire" : "fire-off"}
                  size={16}
                  color={isActive ? "#FFFFFF" : isDark ? "#2D3748" : "#94A3B8"}
                />
              </LinearGradient>
              <Text style={[styles.dayLetter, { color: isActive ? "#FBBF24" : subTextColor }]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  streakCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  streakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  streakHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  streakSubtext: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayWrapper: {
    alignItems: "center",
    gap: 6,
  },
  dayFlameCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayLetter: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
