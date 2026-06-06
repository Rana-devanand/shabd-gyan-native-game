import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

interface Player {
  name: string;
  avatar: string;
  score: number;
  isUser: boolean;
  solvedCount: number;
}

export default function Leaderboard() {
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#475569";
  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("Player");
  const [avatar, setAvatar] = useState("🧔🏽‍♂️");
  const [userScore, setUserScore] = useState(0);
  const [userSolvedCount, setUserSolvedCount] = useState(0);
  const [leaderboardList, setLeaderboardList] = useState<Player[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const loadLeaderboardData = async () => {
        try {
          const storedNickname = await AsyncStorage.getItem("user_nickname") || "Player";
          const storedAvatar = await AsyncStorage.getItem("user_avatar") || "🧔🏽‍♂️";
          const scoreStr = await AsyncStorage.getItem("shabdgyan_score") || "0";
          const solvedIdsStr = await AsyncStorage.getItem("shabdgyan_solved_ids");

          const score = parseInt(scoreStr, 10);
          let solvedCount = 0;
          if (solvedIdsStr) {
            solvedCount = JSON.parse(solvedIdsStr).length;
          }

          setNickname(storedNickname);
          setAvatar(storedAvatar);
          setUserScore(score);
          setUserSolvedCount(solvedCount);

          // Mock Leaderboard Competitors
          const mockCompetitors: Player[] = [
            { name: "Sher-e-Shabd 🦁", avatar: "🦁", score: 3200, isUser: false, solvedCount: 32 },
            { name: "WordNinja 🏏", avatar: "🏏", score: 2400, isUser: false, solvedCount: 24 },
            { name: "DesiQueen 🥻", avatar: "🥻", score: 1800, isUser: false, solvedCount: 18 },
            { name: "ChaiLover ☕", avatar: "☕", score: 1200, isUser: false, solvedCount: 12 },
            { name: "DidiNo1 👩🏽‍🦱", avatar: "👩🏽‍🦱", score: 800, isUser: false, solvedCount: 8 },
            { name: "GullyGamer 🏏", avatar: "🏏", score: 500, isUser: false, solvedCount: 5 },
            { name: "BhaiyaG 🧔🏽‍♂️", avatar: "🧔🏽‍♂️", score: 200, isUser: false, solvedCount: 2 },
          ];

          // Inject current user
          const currentUser: Player = {
            name: `${storedNickname} (Aap)`,
            avatar: storedAvatar,
            score: score,
            isUser: true,
            solvedCount: solvedCount,
          };

          // Combine and sort by score descending
          const combined = [...mockCompetitors, currentUser].sort((a, b) => b.score - a.score);
          setLeaderboardList(combined);
        } catch (error) {
          console.error("Error loading leaderboard stats:", error);
        } finally {
          setLoading(false);
        }
      };

      loadLeaderboardData();
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.grey4 }]}>Dangal Saj raha hai...</Text>
      </View>
    );
  }

  // Find user's rank
  const userRankIndex = leaderboardList.findIndex((p) => p.isUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : 8;

  // Extract Podium (Top 3)
  const podium1st = leaderboardList[0];
  const podium2nd = leaderboardList[1];
  const podium3rd = leaderboardList[2];

  // Rest of the list
  const listPlayers = leaderboardList.slice(3);

  return (
    <View style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Title Header */}
        <View style={styles.header}>
          <Ionicons name="trophy" size={28} color="#FBBF24" />
          <Text style={[styles.headerTitle, { color: textColor }]}>KHEL PEHALWAN</Text>
          <Text style={styles.headerSubtitle}>Weekly Rankings</Text>
        </View>

        {/* Podium Layout */}
        <View style={styles.podiumContainer}>
          <Image
            source={require("../../assets/images/firework.gif")}
            style={styles.podiumFireworks}
          />
          {/* 2nd Place */}
          {podium2nd && (
            <View style={styles.podiumWrapper}>
              <View style={styles.avatarWrapper}>
                <Text style={styles.podiumAvatar}>{podium2nd.avatar}</Text>
                <View style={[styles.badgeCircle, { backgroundColor: "#A0AEC0" }]}>
                  <Text style={styles.badgeText}>2</Text>
                </View>
              </View>
              <Text style={[styles.podiumName, { color: textColor }]} numberOfLines={1}>
                {podium2nd.isUser ? "Aap" : podium2nd.name.split(" ")[0]}
              </Text>
              <Text style={styles.podiumScore}>{podium2nd.score} XP</Text>
              <View style={[styles.podiumPillar, { height: 75, backgroundColor: isDark ? "#0A2D52" : "#CBD5E1" }]}>
                <Text style={styles.pillarRankText}>2nd</Text>
              </View>
            </View>
          )}

          {/* 1st Place */}
          {podium1st && (
            <View style={styles.podiumWrapper}>
              <View style={[styles.avatarWrapper, styles.avatarWrapperGold]}>
                <FontAwesome5 name="crown" size={16} color="#FBBF24" style={styles.crownIcon} />
                <Text style={styles.podiumAvatarBig}>{podium1st.avatar}</Text>
                <View style={[styles.badgeCircle, { backgroundColor: "#FBBF24" }]}>
                  <Text style={styles.badgeText}>1</Text>
                </View>
              </View>
              <Text style={[styles.podiumName, styles.podiumNameGold, { color: textColor }]} numberOfLines={1}>
                {podium1st.isUser ? "Aap" : podium1st.name.split(" ")[0]}
              </Text>
              <Text style={[styles.podiumScore, styles.podiumScoreGold]}>{podium1st.score} XP</Text>
              <LinearGradient
                colors={["#FBBF24", "#D97706"]}
                style={[styles.podiumPillar, { height: 95 }]}
              >
                <Text style={styles.pillarRankTextGold}>1st</Text>
              </LinearGradient>
            </View>
          )}

          {/* 3rd Place */}
          {podium3rd && (
            <View style={styles.podiumWrapper}>
              <View style={styles.avatarWrapper}>
                <Text style={styles.podiumAvatar}>{podium3rd.avatar}</Text>
                <View style={[styles.badgeCircle, { backgroundColor: "#CD7F32" }]}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </View>
              <Text style={[styles.podiumName, { color: textColor }]} numberOfLines={1}>
                {podium3rd.isUser ? "Aap" : podium3rd.name.split(" ")[0]}
              </Text>
              <Text style={styles.podiumScore}>{podium3rd.score} XP</Text>
              <View style={[styles.podiumPillar, { height: 60, backgroundColor: isDark ? "#082544" : "#E2E8F0" }]}>
                <Text style={styles.pillarRankText}>3rd</Text>
              </View>
            </View>
          )}
        </View>

        {/* Scrollable Leaderboard List */}
        <View style={styles.listSection}>
          <Text style={[styles.listTitle, { color: textColor }]}>Rank Board</Text>
          {listPlayers.map((player) => {
            const index = leaderboardList.findIndex((p) => p.name === player.name);
            const rank = index + 1;

            return (
              <View
                key={player.name + "_" + rank}
                style={[
                  styles.listRow,
                  { backgroundColor: cardBg, borderColor },
                  player.isUser && styles.listRowUser,
                ]}
              >
                <View style={styles.rowLeft}>
                  <Text style={[styles.rankNumber, { color: subTextColor }]}>{rank}</Text>
                  <Text style={styles.rowAvatar}>{player.avatar}</Text>
                  <Text style={[styles.rowName, { color: textColor }, player.isUser && styles.boldText]} numberOfLines={1}>
                    {player.name}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowPoints, player.isUser && { color: theme.colors.primary }]}>
                    {player.score} XP
                  </Text>
                  <Text style={styles.rowSolvedCount}>
                    {player.solvedCount} Solved
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating User Stats Banner */}
      <View style={[styles.floatingBanner, { backgroundColor: isDark ? "#0A2540" : "#F8FAFC", borderTopColor: borderColor }]}>
        <View style={styles.bannerLeft}>
          <View style={styles.userBadge}>
            <Text style={styles.userRankText}>#{userRank}</Text>
          </View>
          <Text style={styles.bannerAvatar}>{avatar}</Text>
          <View style={styles.bannerUserInfo}>
            <Text style={[styles.bannerUserName, { color: textColor }]} numberOfLines={1}>
              {nickname}
            </Text>
            <Text style={styles.bannerUserSub}>Aapki Rank</Text>
          </View>
        </View>
        <View style={styles.bannerRight}>
          <Text style={[styles.bannerScore, { color: theme.colors.primary }]}>{userScore} XP</Text>
          <Text style={styles.bannerSolvedCount}>{userSolvedCount} Solved</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 14,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginTop: 6,
    letterSpacing: 1.0,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
    marginTop: 2,
    letterSpacing: 1.5,
  },
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginVertical: 26,
    paddingHorizontal: 10,
    position: "relative",
  },
  podiumFireworks: {
    width: "100%",
    height: 400,
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    opacity: 0.7,
    zIndex: -1,
  },
  podiumWrapper: {
    flex: 1,
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 8,
  },
  avatarWrapperGold: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: "#FBBF24",
  },
  crownIcon: {
    position: "absolute",
    top: -16,
    transform: [{ rotate: "0deg" }],
  },
  podiumAvatar: {
    fontSize: 28,
  },
  podiumAvatarBig: {
    fontSize: 34,
  },
  badgeCircle: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  podiumName: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  podiumNameGold: {
    fontSize: 13,
    fontWeight: "900",
  },
  podiumScore: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "PlusJakartaSans_500Medium",
    marginBottom: 8,
  },
  podiumScoreGold: {
    color: "#FBBF24",
    fontWeight: "bold",
  },
  podiumPillar: {
    width: "75%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  pillarRankText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  pillarRankTextGold: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  listSection: {
    marginTop: 10,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  listRowUser: {
    borderWidth: 1.5,
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: "bold",
    width: 24,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  rowAvatar: {
    fontSize: 24,
    marginRight: 10,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
    flex: 1,
  },
  boldText: {
    fontWeight: "bold",
  },
  rowRight: {
    alignItems: "flex-end",
  },
  rowPoints: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  rowSolvedCount: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "PlusJakartaSans_400Regular",
    marginTop: 1,
  },
  floatingBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderTopWidth: 1.5,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  userBadge: {
    backgroundColor: "#FBBF24",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 10,
  },
  userRankText: {
    color: "#021122",
    fontSize: 10,
    fontWeight: "bold",
  },
  bannerAvatar: {
    fontSize: 30,
    marginRight: 10,
  },
  bannerUserInfo: {
    justifyContent: "center",
  },
  bannerUserName: {
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  bannerUserSub: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "PlusJakartaSans_400Regular",
  },
  bannerRight: {
    alignItems: "flex-end",
  },
  bannerScore: {
    fontSize: 17,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  bannerSolvedCount: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "PlusJakartaSans_400Regular",
  },
});
