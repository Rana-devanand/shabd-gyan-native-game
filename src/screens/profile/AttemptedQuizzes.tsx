import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, useThemeMode } from "@rneui/themed";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetchPlayedQuizzes } from "../../services/databaseService";

const { width } = Dimensions.get("window");

interface PlayedQuiz {
  id: string;
  puzzle_id: string;
  category: string;
  difficulty: string;
  mode: string;
  question: string;
  answer: string;
  used_hint: boolean;
  revealed_answer: boolean;
  coins_earned: number;
  user_answer?: string;
  played_at: string;
}

export default function AttemptedQuizzes() {
  const router = useRouter();
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  // Brand colors matching index.tsx exactly
  const BG = isDark ? "#021A30" : "#EEF2FF";
  const SURFACE = isDark ? "#05203B" : "#FFFFFF";
  const BORDER = isDark ? "#072C50" : "#E2E8F0";
  const TEXT = isDark ? "#FFFFFF" : "#0F172A";
  const TEXT_SUB = isDark ? "#8AB4D4" : "#475569";
  const ACCENT = isDark ? "#A2EBD0" : "#3360D6";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<PlayedQuiz[]>([]);

  const loadData = async () => {
    try {
      const data = await fetchPlayedQuizzes();
      setLogs(data);
    } catch (err) {
      console.error("[AttemptedQuizzes] Load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    loadData();
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getModeDetails = (modeVal: string) => {
    switch (modeVal.toLowerCase()) {
      case "shabd":
        return { label: "Shabd Mode", icon: "text", color: "#10B981" };
      case "paheli":
        return { label: "Paheli Mode", icon: "help-circle", color: "#8B5CF6" };
      case "quests":
        return { label: "Daily Quest", icon: "flash", color: "#F59E0B" };
      case "story":
        return { label: "AI Story", icon: "book", color: "#3B82F6" };
      default:
        return { label: "Quiz Play", icon: "game-controller", color: "#6B7280" };
    }
  };

  const renderItem = ({ item }: { item: PlayedQuiz }) => {
    const modeInfo = getModeDetails(item.mode);
    const isSkippedOrRevealed = item.revealed_answer;
    const isCorrectSolve = !isSkippedOrRevealed && (item.coins_earned > 0 || item.user_answer?.toUpperCase() === item.answer.toUpperCase());

    return (
      <View style={[styles.card, { backgroundColor: SURFACE, borderColor: BORDER }]}>
        {/* Card Header Info */}
        <View style={styles.cardHeader}>
          {/* Mode Badge */}
          <View style={[styles.badge, { backgroundColor: `${modeInfo.color}15`, borderColor: `${modeInfo.color}35` }]}>
            <Ionicons name={modeInfo.icon as any} size={12} color={modeInfo.color} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: modeInfo.color }]}>{modeInfo.label}</Text>
          </View>

          {/* Difficulty Badge */}
          <View style={[styles.badge, { backgroundColor: isDark ? "#072C50" : "#F1F5F9", borderColor: BORDER }]}>
            <Text style={[styles.badgeText, { color: TEXT_SUB }]}>{item.difficulty}</Text>
          </View>

          {/* Points/XP Earned */}
          <Text style={[styles.pointsText, { color: item.coins_earned > 0 ? "#10B981" : item.coins_earned < 0 ? "#EF4444" : TEXT_SUB }]}>
            {item.coins_earned >= 0 ? `+${item.coins_earned}` : item.coins_earned} XP
          </Text>
        </View>

        {/* Question/Clue Content */}
        <View style={styles.contentWrap}>
          <Text style={[styles.clueLabel, { color: TEXT_SUB }]}>CLUE / QUESTION:</Text>
          <Text style={[styles.clueText, { color: TEXT }]} numberOfLines={4}>
            {item.question}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: BORDER }]} />

        {/* Answers block */}
        <View style={styles.answersRow}>
          {/* Correct Answer */}
          <View style={styles.answerBlock}>
            <Text style={[styles.ansLabel, { color: TEXT_SUB }]}>Correct Answer</Text>
            <Text style={[styles.ansValue, { color: "#10B981" }]}>{item.answer.toUpperCase()}</Text>
          </View>

          {/* User Answer */}
          <View style={styles.answerBlock}>
            <Text style={[styles.ansLabel, { color: TEXT_SUB }]}>Your Answer</Text>
            {isSkippedOrRevealed ? (
              <Text style={[styles.ansValue, { color: "#F59E0B" }]}>REVEALED 👁️</Text>
            ) : item.user_answer ? (
              <Text style={[styles.ansValue, { color: isCorrectSolve ? "#10B981" : "#EF4444" }]}>
                {item.user_answer.toUpperCase()} {isCorrectSolve ? "✓" : "✗"}
              </Text>
            ) : (
              <Text style={[styles.ansValue, { color: "#EF4444" }]}>FAILED ✗</Text>
            )}
          </View>
        </View>

        {/* Lower Metadata Row */}
        <View style={styles.footerRow}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {item.used_hint && (
              <View style={[styles.microBadge, { backgroundColor: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.3)" }]}>
                <Ionicons name="bulb" size={10} color="#F59E0B" />
                <Text style={styles.microBadgeText}>Hint Used</Text>
              </View>
            )}
            {item.revealed_answer && (
              <View style={[styles.microBadge, { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" }]}>
                <Ionicons name="eye-off" size={10} color="#EF4444" />
                <Text style={styles.microBadgeText}>Revealed</Text>
              </View>
            )}
          </View>
          <Text style={[styles.dateText, { color: TEXT_SUB }]}>{formatDateTime(item.played_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: BG }]}>
      {/* Header Panel */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={[styles.backBtn, { backgroundColor: SURFACE, borderColor: BORDER }]}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: TEXT }]}>Attempted Quizzes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: TEXT_SUB }]}>Fetching attempt history...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="clipboard-text-search-outline" size={64} color={TEXT_SUB} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyTitle, { color: TEXT }]}>No Attempts Yet</Text>
              <Text style={[styles.emptyDesc, { color: TEXT_SUB }]}>
                Your played scramble history, quests, and stories logs will appear here. Play some games and come back!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  pointsText: {
    marginLeft: "auto",
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  contentWrap: {
    marginBottom: 12,
  },
  clueLabel: {
    fontSize: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clueText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 10,
    opacity: 0.8,
  },
  answersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  answerBlock: {
    flex: 1,
  },
  ansLabel: {
    fontSize: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  ansValue: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  microBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  microBadgeText: {
    fontSize: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#475569",
  },
  dateText: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
    lineHeight: 18,
  },
});
