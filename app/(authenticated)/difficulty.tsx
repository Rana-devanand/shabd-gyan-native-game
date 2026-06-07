import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PUZZLES, PAHELI_PUZZLES } from "@/src/constants/puzzles";

const { width } = Dimensions.get("window");

// ─── Difficulty config ────────────────────────────────────────────────────────
const DIFFICULTIES = [
  {
    id: "Easy",
    label: "Easy",
    icon: "leaf-outline" as const,
    colorLight: "#10B981",
    colorDark:  "#10B981",
    tagline: "Warm up your mind",
  },
  {
    id: "Medium",
    label: "Medium",
    icon: "bulb-outline" as const,
    colorLight: "#3B82F6",
    colorDark:  "#60A5FA",
    tagline: "A worthy challenge",
  },
  {
    id: "Hard",
    label: "Hard",
    icon: "flame-outline" as const,
    colorLight: "#F59E0B",
    colorDark:  "#FBBF24",
    tagline: "Push your limits",
  },
  {
    id: "Super Hard",
    label: "Super Hard",
    icon: "flash-outline" as const,
    colorLight: "#EF4444",
    colorDark:  "#F87171",
    tagline: "Masters only",
  },
] as const;

type DiffId = typeof DIFFICULTIES[number]["id"];

function getPoints(mode: "shabd" | "paheli", diff: string) {
  const table: Record<string, Record<string, { base: number; deduction: number; withHint: number }>> = {
    shabd: {
      Easy:       { base: 100, deduction: 20,  withHint: 80  },
      Medium:     { base: 150, deduction: 30,  withHint: 120 },
      Hard:       { base: 200, deduction: 50,  withHint: 150 },
      "Super Hard": { base: 300, deduction: 100, withHint: 200 },
    },
    paheli: {
      Easy:       { base: 120, deduction: 30,  withHint: 90  },
      Medium:     { base: 180, deduction: 40,  withHint: 140 },
      Hard:       { base: 250, deduction: 60,  withHint: 190 },
      "Super Hard": { base: 350, deduction: 100, withHint: 250 },
    },
  };
  return table[mode]?.[diff] ?? { base: 100, deduction: 20, withHint: 80 };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DifficultyScreen() {
  const { categoryName } = useLocalSearchParams<{ categoryName: string }>();
  const router           = useRouter();
  const { theme }        = useTheme();
  const { mode }         = useThemeMode();
  const isDark           = mode === "dark";

  // ── Brand-aligned colours pulled directly from AppTheme ──────────────────
  const BG          = isDark ? "#021A30" : "#EEF2FF";
  const SURFACE     = isDark ? "#05203B" : "#FFFFFF";
  const SURFACE2    = isDark ? "#072C50" : "#F3F4F6";
  const BORDER      = isDark ? "#072C50" : "#E2E8F0";
  const ACCENT      = isDark ? "#A2EBD0" : "#3360D6";   // mint dark / blue light
  const ACCENT_SUB  = isDark ? "rgba(162,235,208,0.12)" : "rgba(51,96,214,0.08)";
  const TEXT        = isDark ? "#FFFFFF" : "#0F172A";
  const TEXT_SUB    = isDark ? "#8AB4D4" : "#475569";

  const [gameMode,           setGameMode]           = useState<"shabd" | "paheli">("shabd");
  const [solvedIds,          setSolvedIds]          = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DiffId>("Easy");

  // Animated value for card selection pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const sm = await AsyncStorage.getItem("shabdgyan_mode");
        if (sm) setGameMode(sm as "shabd" | "paheli");
        const si = await AsyncStorage.getItem("shabdgyan_solved_ids");
        if (si) setSolvedIds(JSON.parse(si));
      } catch {}
    })();
  }, []);

  const modePuzzles = gameMode === "shabd" ? PUZZLES : PAHELI_PUZZLES;

  const handleSelect = async (id: DiffId) => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setSelectedDifficulty(id);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.97, duration: 80,  useNativeDriver: true }),
      Animated.spring(pulseAnim,  { toValue: 1,    useNativeDriver: true }),
    ]).start();
  };

  const handleStart = async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    router.push({
      pathname: "/(authenticated)/play",
      params: { categoryName, difficulty: selectedDifficulty },
    });
  };

  const selected = DIFFICULTIES.find((d) => d.id === selectedDifficulty)!;
  const selColor = isDark ? selected.colorDark : selected.colorLight;
  const pts      = getPoints(gameMode, selectedDifficulty);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: BG }]}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[s.backBtn, { backgroundColor: SURFACE2, borderColor: BORDER }]}
        >
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={[s.headerCategory, { color: ACCENT }]}>
            {categoryName?.toUpperCase()}
          </Text>
          <Text style={[s.headerTitle, { color: TEXT }]}>Select Difficulty</Text>
        </View>

        {/* Right spacer keeps title centered */}
        <View style={{ width: 40 }} />
      </View>

      {/* ── Difficulty grid ──────────────────────────────────────────────── */}
      <View style={s.grid}>
        {DIFFICULTIES.map((diff) => {
          const isSelected = selectedDifficulty === diff.id;
          const color      = isDark ? diff.colorDark : diff.colorLight;

          const catPuzzles   = modePuzzles.filter((p) => p.category === categoryName);
          const diffIdx      = DIFFICULTIES.findIndex((d) => d.id === diff.id);
          const matchedPuzzle = catPuzzles[diffIdx];
          const isSolved     = matchedPuzzle ? solvedIds.includes(matchedPuzzle.id) : false;

          return (
            <TouchableOpacity
              key={diff.id}
              activeOpacity={0.8}
              onPress={() => handleSelect(diff.id)}
              style={[
                s.card,
                {
                  backgroundColor: isSelected ? `${color}18` : SURFACE,
                  borderColor:     isSelected ? color : BORDER,
                  borderWidth:     isSelected ? 2    : 1,
                },
              ]}
            >
              {/* Solved badge */}
              {isSolved && (
                <View style={[s.solvedBadge, { borderColor: `${color}44`, backgroundColor: `${color}18` }]}>
                  <Ionicons name="checkmark" size={9} color={color} />
                  <Text style={[s.solvedText, { color }]}>DONE</Text>
                </View>
              )}

              {/* Icon */}
              <View style={[s.iconWrap, {
                backgroundColor: isSelected ? `${color}20` : isDark ? "rgba(162,235,208,0.06)" : "rgba(0,0,0,0.04)",
                borderColor:     isSelected ? `${color}50` : BORDER,
              }]}>
                <Ionicons name={diff.icon} size={26} color={isSelected ? color : TEXT_SUB} />
              </View>

              <Text style={[s.cardLabel, { color: isSelected ? color : TEXT }]}>{diff.label}</Text>
              <Text style={[s.cardTagline, { color: TEXT_SUB }]}>{diff.tagline}</Text>

              {/* Selected tick */}
              {isSelected && (
                <View style={[s.selectedTick, { backgroundColor: color }]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Info card ────────────────────────────────────────────────────── */}
      <View style={[s.infoCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>

        {/* Mode pill */}
        <View style={[s.modePill, { backgroundColor: ACCENT_SUB, borderColor: `${ACCENT}44` }]}>
          <Ionicons
            name={gameMode === "shabd" ? "text-outline" : "help-circle-outline"}
            size={12}
            color={ACCENT}
          />
          <Text style={[s.modePillText, { color: ACCENT }]}>
            {gameMode === "shabd" ? "Shabd Mode" : "Paheli Mode"}
            {"  ·  "}
            <Text style={{ fontWeight: "700" }}>{selected.label}</Text>
          </Text>
        </View>

        {/* XP rows */}
        <View style={s.xpRows}>
          <View style={[s.xpRow, { backgroundColor: `${selColor}10`, borderColor: `${selColor}30` }]}>
            <View style={[s.xpDot, { backgroundColor: selColor }]} />
            <Text style={[s.xpLabel, { color: TEXT_SUB }]}>Without hint</Text>
            <Text style={[s.xpValue, { color: selColor }]}>+{pts.base} XP</Text>
          </View>

          <View style={[s.xpRow, { backgroundColor: SURFACE2, borderColor: BORDER }]}>
            <View style={[s.xpDot, { backgroundColor: TEXT_SUB }]} />
            <Text style={[s.xpLabel, { color: TEXT_SUB }]}>With hint</Text>
            <Text style={[s.xpValue, { color: TEXT }]}>+{pts.withHint} XP</Text>
            <Text style={[s.xpPenalty]}> (−{pts.deduction})</Text>
          </View>

          <View style={[s.xpRow, { backgroundColor: SURFACE2, borderColor: BORDER }]}>
            <View style={[s.xpDot, { backgroundColor: "#60A5FA" }]} />
            <Text style={[s.xpLabel, { color: TEXT_SUB }]}>Replay practice</Text>
            <Text style={[s.xpValue, { color: "#60A5FA" }]}>+0 XP</Text>
          </View>
        </View>
      </View>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <Animated.View style={[s.ctaWrap, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleStart}
          style={[s.cta, { backgroundColor: ACCENT }]}
        >
          <Ionicons
            name="game-controller-outline"
            size={20}
            color={isDark ? "#021A30" : "#FFFFFF"}
            style={{ marginRight: 10 }}
          />
          <Text style={[s.ctaText, { color: isDark ? "#021A30" : "#FFFFFF" }]}>
            Start {selected.label} Game
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={isDark ? "#021A30" : "#FFFFFF"}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </Animated.View>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_W = (width - 40 - 12) / 2;

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerCategory: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.3,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  card: {
    width: CARD_W,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    position: "relative",
    minHeight: 130,
    justifyContent: "center",
    gap: 6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.2,
  },
  cardTagline: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
  },
  selectedTick: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  solvedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  solvedText: {
    fontSize: 7,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.5,
  },

  // Info card
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
    letterSpacing: 0.2,
  },
  xpRows: {
    gap: 8,
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  xpDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  xpLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  xpValue: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  xpPenalty: {
    fontSize: 11,
    color: "#EF4444",
    fontFamily: "PlusJakartaSans_500Medium",
  },

  // CTA
  ctaWrap: {
    marginTop: "auto",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.4,
  },
});