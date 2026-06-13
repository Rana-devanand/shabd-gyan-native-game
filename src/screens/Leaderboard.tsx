import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import { Image } from "expo-image";
import AvatarDisplay from "../common/AvatarDisplay";

const { width } = Dimensions.get("window");

interface Player {
  name: string;
  avatar: string;
  score: number;
  isUser: boolean;
  solvedCount: number;
}

// Rank tier config
const getRankTier = (score: number) => {
  if (score >= 3000) return { label: "LEGEND", color: "#FF6B35", glow: "#FF6B35" };
  if (score >= 2000) return { label: "MASTER", color: "#A855F7", glow: "#A855F7" };
  if (score >= 1500) return { label: "DIAMOND", color: "#06B6D4", glow: "#06B6D4" };
  if (score >= 1000) return { label: "GOLD", color: "#FBBF24", glow: "#FBBF24" };
  if (score >= 500)  return { label: "SILVER", color: "#94A3B8", glow: "#94A3B8" };
  return { label: "BRONZE", color: "#CD7F32", glow: "#CD7F32" };
};

// Animated glow pulse
function GlowPulse({ color, style }: { color: string; style?: any }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: pulse,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 14,
          elevation: 12,
        },
      ]}
    />
  );
}

// Animated entry for list rows
function AnimatedRow({ children, delay, style }: { children: React.ReactNode; delay: number; style?: any }) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
}

export default function Leaderboard() {
  const { theme } = useTheme();
  const { mode } = useThemeMode();

  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("Player");
  const [avatar, setAvatar] = useState("🧔🏽‍♂️");
  const [userScore, setUserScore] = useState(0);
  const [userSolvedCount, setUserSolvedCount] = useState(0);
  const [leaderboardList, setLeaderboardList] = useState<Player[]>([]);

  // Title scale animation
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(titleScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

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
          if (solvedIdsStr) solvedCount = JSON.parse(solvedIdsStr).length;

          setNickname(storedNickname);
          setAvatar(storedAvatar);
          setUserScore(score);
          setUserSolvedCount(solvedCount);

          const mockCompetitors: Player[] = [
            { name: "Sher-e-Shabd 🦁", avatar: "🦁", score: 3200, isUser: false, solvedCount: 32 },
            { name: "WordNinja 🏏", avatar: "🏏", score: 2400, isUser: false, solvedCount: 24 },
            { name: "DesiQueen 🥻", avatar: "🥻", score: 1800, isUser: false, solvedCount: 18 },
            { name: "ChaiLover ☕", avatar: "☕", score: 1200, isUser: false, solvedCount: 12 },
            { name: "DidiNo1 👩🏽‍🦱", avatar: "👩🏽‍🦱", score: 800, isUser: false, solvedCount: 8 },
            { name: "GullyGamer 🏏", avatar: "🏏", score: 500, isUser: false, solvedCount: 5 },
            { name: "BhaiyaG 🧔🏽‍♂️", avatar: "🧔🏽‍♂️", score: 200, isUser: false, solvedCount: 2 },
          ];

          const currentUser: Player = {
            name: `${storedNickname} (You)`,
            avatar: storedAvatar,
            score: score,
            isUser: true,
            solvedCount: solvedCount,
          };

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
      <View style={styles.loadingCenter}>
        <LinearGradient colors={["#020B18", "#021830"]} style={StyleSheet.absoluteFill} />
        <MaterialCommunityIcons name="sword-cross" size={48} color="#FBBF24" />
        <Text style={styles.loadingText}>⚔️ Dangal Saj raha hai...</Text>
        <ActivityIndicator size="large" color="#FBBF24" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const userRankIndex = leaderboardList.findIndex((p) => p.isUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : leaderboardList.length;

  const podium1st = leaderboardList[0];
  const podium2nd = leaderboardList[1];
  const podium3rd = leaderboardList[2];
  const listPlayers = leaderboardList.slice(3);

  const userTier = getRankTier(userScore);

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Deep game background */}
      <LinearGradient
        colors={["#020B18", "#030F20", "#020B18"]}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle grid overlay */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <Animated.View style={[styles.header, { transform: [{ scale: titleScale }], opacity: titleOpacity }]}>
          <View style={styles.headerIconRow}>
            <MaterialCommunityIcons name="shield-sword" size={14} color="#FBBF24" />
            <Text style={styles.headerSeason}>SEASON 4 · WEEK 12</Text>
            <MaterialCommunityIcons name="shield-sword" size={14} color="#FBBF24" />
          </View>
          <Text style={styles.headerTitle}>CHAMPIONS</Text>
          {/* Neon underline */}
          <View style={styles.neonUnderline} />
          <Text style={styles.headerSubtitle}>⚔ GLOBAL RANKINGS ⚔</Text>
        </Animated.View>

        {/* ── PODIUM ── */}
        <View style={styles.podiumContainer}>
          <Image
            source={require("../../assets/images/firework.gif")}
            style={styles.podiumFireworks}
          />

          {/* 2nd Place */}
          {podium2nd && (
            <AnimatedRow delay={100} style={styles.podiumWrapper}>
              <View style={styles.podiumPlayerCard}>
                <View style={[styles.podiumAvatarRing, { borderColor: "#94A3B8", shadowColor: "#94A3B8" }]}>
                  <AvatarDisplay avatar={podium2nd.avatar} size={52} textStyle={styles.podiumAvatar} />
                </View>
                <View style={[styles.rankBadge, { backgroundColor: "#94A3B8" }]}>
                  <Text style={styles.rankBadgeText}>#2</Text>
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>
                {podium2nd.isUser ? "You" : podium2nd.name.split(" ")[0]}
              </Text>
              <Text style={[styles.podiumTierLabel, { color: getRankTier(podium2nd.score).color }]}>
                {getRankTier(podium2nd.score).label}
              </Text>
              <Text style={styles.podiumScore}>{podium2nd.score.toLocaleString()} XP</Text>
              <LinearGradient
                colors={["#1E293B", "#334155"]}
                style={[styles.podiumPillar, { height: 80 }]}
              >
                <Text style={styles.pillarRankText}>SILVER</Text>
              </LinearGradient>
            </AnimatedRow>
          )}

          {/* 1st Place */}
          {podium1st && (
            <AnimatedRow delay={0} style={[styles.podiumWrapper, { zIndex: 10 }]}>
              <FontAwesome5 name="crown" size={22} color="#FBBF24" style={styles.crownIcon} />
              <View style={styles.podiumPlayerCard}>
                <GlowPulse color="#FBBF24" style={StyleSheet.absoluteFill} />
                <View style={[styles.podiumAvatarRing, styles.podiumAvatarRingGold]}>
                  <AvatarDisplay avatar={podium1st.avatar} size={64} textStyle={styles.podiumAvatarBig} />
                </View>
                <View style={[styles.rankBadge, { backgroundColor: "#FBBF24" }]}>
                  <Text style={[styles.rankBadgeText, { color: "#000" }]}>#1</Text>
                </View>
              </View>
              <Text style={[styles.podiumName, { color: "#FBBF24", fontSize: 14 }]} numberOfLines={1}>
                {podium1st.isUser ? "You" : podium1st.name.split(" ")[0]}
              </Text>
              <Text style={[styles.podiumTierLabel, { color: getRankTier(podium1st.score).color }]}>
                {getRankTier(podium1st.score).label}
              </Text>
              <Text style={[styles.podiumScore, { color: "#FBBF24", fontWeight: "900" }]}>
                {podium1st.score.toLocaleString()} XP
              </Text>
              <LinearGradient
                colors={["#92400E", "#D97706", "#FBBF24"]}
                style={[styles.podiumPillar, { height: 106 }]}
              >
                <MaterialCommunityIcons name="trophy" size={18} color="#FFF" />
              </LinearGradient>
            </AnimatedRow>
          )}

          {/* 3rd Place */}
          {podium3rd && (
            <AnimatedRow delay={200} style={styles.podiumWrapper}>
              <View style={styles.podiumPlayerCard}>
                <View style={[styles.podiumAvatarRing, { borderColor: "#CD7F32", shadowColor: "#CD7F32" }]}>
                  <AvatarDisplay avatar={podium3rd.avatar} size={52} textStyle={styles.podiumAvatar} />
                </View>
                <View style={[styles.rankBadge, { backgroundColor: "#CD7F32" }]}>
                  <Text style={styles.rankBadgeText}>#3</Text>
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>
                {podium3rd.isUser ? "You" : podium3rd.name.split(" ")[0]}
              </Text>
              <Text style={[styles.podiumTierLabel, { color: getRankTier(podium3rd.score).color }]}>
                {getRankTier(podium3rd.score).label}
              </Text>
              <Text style={styles.podiumScore}>{podium3rd.score.toLocaleString()} XP</Text>
              <LinearGradient
                colors={["#1A1A2E", "#292950"]}
                style={[styles.podiumPillar, { height: 62 }]}
              >
                <Text style={styles.pillarRankText}>BRONZE</Text>
              </LinearGradient>
            </AnimatedRow>
          )}
        </View>

        {/* ── RANK LIST HEADER ── */}
        <View style={styles.listHeader}>
          <LinearGradient colors={["#FBBF24", "#F59E0B"]} style={styles.listHeaderAccent} />
          <Text style={styles.listTitle}>RANK BOARD</Text>
          <View style={styles.listHeaderDivider} />
        </View>

        {/* Column Labels */}
        <View style={styles.columnLabels}>
          <Text style={[styles.colLabel, { flex: 0.4 }]}>RNK</Text>
          <Text style={[styles.colLabel, { flex: 1 }]}>PLAYER</Text>
          <Text style={[styles.colLabel, { textAlign: "right" }]}>XP / SOLVED</Text>
        </View>

        {/* ── LIST ROWS ── */}
        {listPlayers.map((player, i) => {
          const index = leaderboardList.findIndex((p) => p.name === player.name);
          const rank = index + 1;
          const tier = getRankTier(player.score);

          return (
            <AnimatedRow key={player.name + "_" + rank} delay={200 + i * 60}>
              <View style={[styles.listRow, player.isUser && { borderColor: "#10B981", borderWidth: 1.5 }]}>
                {player.isUser && (
                  <LinearGradient
                    colors={["rgba(16,185,129,0.12)", "rgba(16,185,129,0.04)"]}
                    style={StyleSheet.absoluteFill}
                  />
                )}

                {/* Rank number with tier color */}
                <View style={styles.rankNumWrapper}>
                  <Text style={[styles.rankNumber, { color: tier.color }]}>{rank}</Text>
                </View>

                {/* Avatar */}
                <View style={[styles.listAvatarRing, { borderColor: tier.color + "66" }]}>
                  <AvatarDisplay
                    avatar={player.avatar}
                    size={38}
                    textStyle={styles.rowAvatar}
                    imageStyle={{ marginRight: 0 }}
                  />
                </View>

                {/* Name + tier */}
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowName, player.isUser && { color: "#10B981" }]} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <View style={[styles.tierPill, { backgroundColor: tier.color + "22", borderColor: tier.color + "55" }]}>
                    <Text style={[styles.tierPillText, { color: tier.color }]}>{tier.label}</Text>
                  </View>
                </View>

                {/* Score */}
                <View style={styles.rowRight}>
                  <Text style={[styles.rowPoints, player.isUser && { color: "#10B981" }]}>
                    {player.score.toLocaleString()}
                  </Text>
                  <Text style={styles.rowSolvedCount}>{player.solvedCount} solved</Text>
                </View>

                {/* Right accent bar */}
                <View style={[styles.rowAccentBar, { backgroundColor: tier.color }]} />
              </View>
            </AnimatedRow>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── FLOATING USER BANNER ── */}
      <View style={styles.floatingBannerOuter}>
        <LinearGradient
          colors={["#041020", "#071830"]}
          style={styles.floatingBanner}
        >
          {/* Left glow accent */}
          <View style={[styles.bannerGlowStrip, { backgroundColor: userTier.color }]} />

          <View style={styles.bannerLeft}>
            {/* Rank badge */}
            <LinearGradient
              colors={[userTier.color, userTier.color + "AA"]}
              style={styles.bannerRankBadge}
            >
              <Text style={styles.bannerRankText}>#{userRank}</Text>
            </LinearGradient>

            <View style={[styles.bannerAvatarRing, { borderColor: userTier.color }]}>
              <AvatarDisplay
                avatar={avatar}
                size={40}
                textStyle={styles.bannerAvatar}
                imageStyle={{ marginRight: 0 }}
              />
            </View>

            <View style={styles.bannerUserInfo}>
              <Text style={styles.bannerUserName} numberOfLines={1}>{nickname}</Text>
              <View style={[styles.tierPill, { backgroundColor: userTier.color + "22", borderColor: userTier.color + "55" }]}>
                <Text style={[styles.tierPillText, { color: userTier.color }]}>{userTier.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.bannerRight}>
            <Text style={[styles.bannerScore, { color: userTier.color }]}>
              {userScore.toLocaleString()} XP
            </Text>
            <Text style={styles.bannerSolvedCount}>{userSolvedCount} solved</Text>
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#020B18",
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020B18",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#FBBF24",
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginTop: 8,
  },
  // Subtle dot-grid overlay
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
    backgroundColor: "transparent",
    backgroundImage: "radial-gradient(circle, #4B7BEC 1px, transparent 1px)",
    backgroundSize: "28px 28px",
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 6,
  },

  // ── HEADER ──
  header: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 8,
  },
  headerIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  headerSeason: {
    fontSize: 10,
    color: "#FBBF24",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 4,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textShadowColor: "#FBBF2444",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  neonUnderline: {
    width: 120,
    height: 2,
    backgroundColor: "#FBBF24",
    borderRadius: 2,
    marginTop: 4,
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#475569",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },

  // ── PODIUM ──
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginVertical: 20,
    paddingHorizontal: 6,
    position: "relative",
  },
  podiumFireworks: {
    width: "100%",
    height: 380,
    position: "absolute",
    top: -40,
    left: 0,
    right: 0,
    opacity: 0.55,
    zIndex: -1,
  },
  podiumWrapper: {
    flex: 1,
    alignItems: "center",
  },
  crownIcon: {
    marginBottom: 4,
    textShadowColor: "#FBBF24",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  podiumPlayerCard: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  podiumAvatarRing: {
    borderWidth: 2,
    borderRadius: 36,
    padding: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
    backgroundColor: "#0A1628",
  },
  podiumAvatarRingGold: {
    borderColor: "#FBBF24",
    shadowColor: "#FBBF24",
    borderWidth: 2.5,
    borderRadius: 42,
    padding: 3,
  },
  rankBadge: {
    position: "absolute",
    bottom: -6,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    elevation: 4,
  },
  rankBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  podiumAvatar: { fontSize: 26 },
  podiumAvatarBig: { fontSize: 34 },
  podiumName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#E2E8F0",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  podiumTierLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "PlusJakartaSans_500Medium",
    marginBottom: 8,
  },
  podiumPillar: {
    width: "82%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 10,
  },
  pillarRankText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 2,
  },

  // ── LIST HEADER ──
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 6,
    gap: 10,
  },
  listHeaderAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#E2E8F0",
    letterSpacing: 2.5,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
  },
  listHeaderDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#0F2340",
  },
  columnLabels: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  colLabel: {
    fontSize: 9,
    color: "#334155",
    letterSpacing: 1.5,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
  },

  // ── LIST ROWS ──
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#0F2340",
    backgroundColor: "#040E1C",
    overflow: "hidden",
    position: "relative",
  },
  rankNumWrapper: {
    width: 28,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  listAvatarRing: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 2,
    marginHorizontal: 10,
    backgroundColor: "#0A1628",
  },
  rowAvatar: { fontSize: 22 },
  rowMeta: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  rowName: {
    fontSize: 13,
    color: "#CBD5E1",
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  tierPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  rowRight: {
    alignItems: "flex-end",
    marginRight: 10,
  },
  rowPoints: {
    fontSize: 13,
    fontWeight: "900",
    color: "#E2E8F0",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  rowSolvedCount: {
    fontSize: 9,
    color: "#334155",
    marginTop: 2,
    fontFamily: "PlusJakartaSans_400Regular",
    letterSpacing: 0.5,
  },
  rowAccentBar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    opacity: 0.7,
  },

  // ── FLOATING BANNER ──
  floatingBannerOuter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  floatingBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#0F2A44",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  bannerGlowStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    opacity: 0.9,
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerRankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 36,
    alignItems: "center",
  },
  bannerRankText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.5,
  },
  bannerAvatarRing: {
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 2,
    backgroundColor: "#0A1628",
  },
  bannerAvatar: { fontSize: 26 },
  bannerUserInfo: {
    justifyContent: "center",
    gap: 3,
  },
  bannerUserName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E2E8F0",
    fontFamily: "PlusJakartaSans_600SemiBold",
    maxWidth: 120,
  },
  bannerRight: {
    alignItems: "flex-end",
  },
  bannerScore: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  bannerSolvedCount: {
    fontSize: 10,
    color: "#334155",
    fontFamily: "PlusJakartaSans_400Regular",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  boldText: { fontWeight: "bold" },
});