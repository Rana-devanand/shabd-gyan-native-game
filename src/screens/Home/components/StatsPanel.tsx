import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StatsPanelProps {
  score: number;
  solvedInMode: number;
  totalPuzzles: number;
  textColor: string;
  subTextColor: string;
  cardBg: string;
  borderColor: string;
}

export default function StatsPanel({
  score,
  solvedInMode,
  totalPuzzles,
  textColor,
  subTextColor,
  cardBg,
  borderColor,
}: StatsPanelProps) {
  return (
    <View style={styles.statsRow}>
      <View style={[styles.statPanel, { backgroundColor: cardBg, borderWidth: 1, borderColor }]}>
        <Ionicons name="trophy-outline" size={24} color="#FBBF24" />
        <Text style={[styles.statPanelValue, { color: textColor }]}>{score}</Text>
        <Text style={[styles.statPanelLabel, { color: subTextColor }]}>POINTS</Text>
      </View>
      <View style={[styles.statPanel, { backgroundColor: cardBg, borderWidth: 1, borderColor }]}>
        <Ionicons name="checkmark-done-circle-outline" size={24} color="#10B981" />
        <Text style={[styles.statPanelValue, { color: textColor }]}>
          {solvedInMode} <Text style={styles.slashTotal}>/ {totalPuzzles}</Text>
        </Text>
        <Text style={[styles.statPanelLabel, { color: subTextColor }]}>SOLVED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  statPanel: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statPanelValue: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 4,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  slashTotal: {
    fontSize: 14,
    opacity: 0.5,
  },
  statPanelLabel: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
