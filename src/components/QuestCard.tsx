import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface QuestCardProps {
  title: string;
  description: string;
  xp: number;
  progress: number; // 0 to 1
  progressLabel: string;
  status: "not_started" | "played" | "completed" | string;
  iconName: any;
  color: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  subTextColor: string;
  onPress: () => void;
  actionText?: string;
  locked?: boolean;
}

export default function QuestCard({
  title,
  description,
  xp,
  progress,
  progressLabel,
  status,
  iconName,
  color,
  cardBg,
  borderColor,
  textColor,
  subTextColor,
  onPress,
  actionText = "Go Play",
  locked = false,
}: QuestCardProps) {
  return (
    <View style={[styles.questCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.questHeader}>
        <View style={styles.questHeaderLeft}>
          <View style={[styles.iconBox, { backgroundColor: `${color}1A` }]}>
            <Ionicons name={iconName} size={24} color={color} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.questTitle, { color: textColor }]}>{title}</Text>
            <Text style={[styles.questDesc, { color: subTextColor }]}>{description}</Text>
          </View>
        </View>
        <Text style={styles.questXP}>+{xp} XP</Text>
      </View>
      
      <View style={styles.progressRow}>
        <View style={styles.progressOuter}>
          <View
            style={[
              styles.progressInner,
              { width: `${progress * 100}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: textColor }]}>
          {progressLabel}
        </Text>
      </View>

      {locked ? (
        <View style={styles.lockedBadge}>
          <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" />
          <Text style={styles.lockedText}>Locked (Needs 500 XP)</Text>
        </View>
      ) : status === "completed" ? (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.completedText}>Completed</Text>
        </View>
      ) : status === "played" ? (
        <View style={styles.attemptedBadge}>
          <Ionicons name="close-circle" size={16} color="#EF4444" />
          <Text style={styles.attemptedText}>Attempted</Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          style={[styles.actionBtn, { backgroundColor: color }]}
        >
          <Text style={styles.actionBtnText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
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
  },
  questXP: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    color: "#10B981",
    marginLeft: 8,
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
  attemptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  attemptedText: {
    color: "#EF4444",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  lockedText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
});
