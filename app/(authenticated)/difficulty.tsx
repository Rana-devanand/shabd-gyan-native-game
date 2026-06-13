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
      Easy:       { base: 10, deduction: 5,  withHint: 5  },
      Medium:     { base: 20, deduction: 10,  withHint: 10 },
      Hard:       { base: 30, deduction: 15,  withHint: 15 },
      "Super Hard": { base: 50, deduction: 25, withHint: 25 },
    },
    paheli: {
      Easy:       { base: 10, deduction: 5,  withHint: 5  },
      Medium:     { base: 20, deduction: 10,  withHint: 10 },
      Hard:       { base: 30, deduction: 15,  withHint: 15 },
      "Super Hard": { base: 50, deduction: 25, withHint: 25 },
    },
  };
  return table[mode]?.[diff] ?? { base: 10, deduction: 5, withHint: 5 };
}

// Head-Start XP deductions per difficulty & option
const HEAD_START_DEDUCTIONS: Record<string, Record<string, number>> = {
  Easy:       { "0": 0, "1": 2,  "2": 4,  "3": 6,  random: 2  },
  Medium:     { "0": 0, "1": 7,  "2": 14, "3": 18, random: 14 },
  Hard:       { "0": 0, "1": 6,  "2": 10, "3": 15, random: 10 },
  "Super Hard":{ "0": 0, "1": 2,  "2": 4,  "3": 6,  random: 2  },
};

function getHeadStartDeduction(diff: string, hs: 0 | 1 | 2 | 3 | "random"): number {
  return HEAD_START_DEDUCTIONS[diff]?.[String(hs)] ?? 0;
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
  const [timerEnabled,       setTimerEnabled]       = useState<boolean>(false);
  const [headStart,          setHeadStart]          = useState<0 | 1 | 2 | 3 | "random">(0);

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
      params: { 
        categoryName, 
        difficulty: selectedDifficulty,
        timerEnabled: String(timerEnabled),
        headStart: String(headStart),
      },
    });
  };

  const selected  = DIFFICULTIES.find((d) => d.id === selectedDifficulty)!;
  const selColor   = isDark ? selected.colorDark : selected.colorLight;
  const pts        = getPoints(gameMode, selectedDifficulty);
  const hsDeduction = getHeadStartDeduction(selectedDifficulty, headStart);
  const effectiveBase = Math.max(0, pts.base - hsDeduction);
  const hasHeadStart  = headStart !== 0;

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

      {/* ── Timer Mode Toggle ─────────────────────────────────────────── */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          setTimerEnabled(prev => !prev);
        }}
        style={[
          s.timerToggleCard,
          {
            backgroundColor: SURFACE,
            borderColor: timerEnabled ? selColor : BORDER,
            borderWidth: timerEnabled ? 1.8 : 1,
          }
        ]}
      >
        <View style={s.timerToggleLeft}>
          <View style={[s.timerIconBox, { backgroundColor: timerEnabled ? `${selColor}18` : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
            <Ionicons name="time" size={20} color={timerEnabled ? selColor : TEXT_SUB} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.timerToggleTitle, { color: TEXT }]}>59s Speed Timer Mode</Text>
            <Text style={[s.timerToggleDesc, { color: TEXT_SUB }]}>Solve the puzzle under a 59s ticking clock</Text>
          </View>
        </View>
        <View style={[s.toggleSwitch, { backgroundColor: timerEnabled ? selColor : isDark ? "#0A243F" : "#D1D5DB" }]}>
          <View style={[s.toggleKnob, { marginLeft: timerEnabled ? 22 : 2 }]} />
        </View>
      </TouchableOpacity>

      {/* ── Head Start Power-Up ──────────────────────────────────────────── */}
      <View style={[s.headStartCard, { backgroundColor: SURFACE, borderColor: headStart > 0 ? selColor : BORDER, borderWidth: headStart > 0 ? 1.8 : 1 }]}>
        {/* Title row */}
        <View style={s.headStartHeader}>
          <View style={[s.headStartIconBox, { backgroundColor: headStart > 0 ? `${selColor}18` : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
            <Ionicons name="sparkles-outline" size={18} color={headStart > 0 ? selColor : TEXT_SUB} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.headStartTitle, { color: TEXT }]}>Head Start Power-Up</Text>
            <Text style={[s.headStartDesc, { color: TEXT_SUB }]}>Pre-fill answer boxes to get a head start</Text>
          </View>
          {headStart > 0 && (
            <View style={[s.headStartBadge, { backgroundColor: `${selColor}18`, borderColor: `${selColor}44` }]}>
              <Text style={[s.headStartBadgeText, { color: selColor }]}>ACTIVE</Text>
            </View>
          )}
        </View>

        {/* Live preview boxes */}
        <View style={s.previewRow}>
          {[0, 1, 2, 3, 4].map((boxIdx) => {
            // For "random" mode, randomly light up 2 of the first 4 boxes as an illustration
            const randomFilledSet = new Set([1, 3]); // fixed illustration pattern
            const isFilled =
              headStart === "random"
                ? randomFilledSet.has(boxIdx) && boxIdx < 4
                : typeof headStart === "number" && boxIdx < headStart;
            const isIndicator = boxIdx === 4;
            const isRandom = headStart === "random";
            return (
              <View
                key={boxIdx}
                style={[
                  s.previewBox,
                  isIndicator
                    ? [s.previewBoxEllipsis, { borderColor: BORDER }]
                    : isFilled
                    ? [
                        s.previewBoxFilled,
                        {
                          backgroundColor: `${selColor}18`,
                          borderColor: selColor,
                          borderStyle: isRandom ? "dashed" as const : "solid" as const,
                        },
                      ]
                    : [s.previewBoxEmpty, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }],
                ]}
              >
                <Text style={[
                  s.previewLetter,
                  { color: isIndicator ? TEXT_SUB : isFilled ? selColor : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)" }
                ]}>
                  {isIndicator ? "···" : isFilled ? (isRandom ? "?" : "A") : "_"}
                </Text>
              </View>
            );
          })}
          <Text style={[s.previewLabel, { color: TEXT_SUB }]}>
            {headStart === 0
              ? "No pre-fill"
              : headStart === "random"
              ? "Letters at random positions"
              : `First ${headStart} letter${headStart > 1 ? "s" : ""} pre-filled`}
          </Text>
        </View>

        {/* Option chips */}
        <View style={s.headStartOptions}>
          {([
            { value: 0 as const,        label: "None",     sub: "Full challenge" },
            { value: 1 as const,        label: "1 Letter",  sub: "1st box filled" },
            { value: 2 as const,        label: "2 Letters", sub: "First 2 filled" },
            { value: 3 as const,        label: "3 Letters", sub: "First 3 filled" },
            { value: "random" as const, label: "Random",   sub: "Any position!" },
          ] as const).map((opt) => {
            const isChosen = headStart === opt.value;
            const isRandomOpt = opt.value === "random";
            return (
              <TouchableOpacity
                key={String(opt.value)}
                activeOpacity={0.75}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setHeadStart(opt.value);
                }}
                style={[
                  s.headStartChip,
                  {
                    backgroundColor: isChosen
                      ? isRandomOpt ? "rgba(168,85,247,0.12)" : `${selColor}18`
                      : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                    borderColor: isChosen
                      ? isRandomOpt ? "#A855F7" : selColor
                      : BORDER,
                    borderWidth: isChosen ? 1.8 : 1,
                  },
                ]}
              >
                <Text style={[s.chipLabel, { color: isChosen ? (isRandomOpt ? "#A855F7" : selColor) : TEXT }]}>{opt.label}</Text>
                <Text style={[s.chipSub,   { color: isChosen ? (isRandomOpt ? "#A855F7" : selColor) : TEXT_SUB, opacity: isChosen ? 0.85 : 0.7 }]}>{opt.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
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

          {/* Without hint row — shows effective XP after head-start penalty */}
          <View style={[s.xpRow, { backgroundColor: `${selColor}10`, borderColor: `${selColor}30` }]}>
            <View style={[s.xpDot, { backgroundColor: selColor }]} />
            <Text style={[s.xpLabel, { color: TEXT_SUB }]}>Without hint</Text>
            <Text style={[s.xpValue, { color: selColor }]}>+{effectiveBase} XP</Text>
            {hasHeadStart && (
              <Text style={[s.xpPenalty]}> (−{hsDeduction})</Text>
            )}
          </View>

          {/* Head-Start penalty row — only visible when a head-start is active */}
          {hasHeadStart && (
            <View style={[s.xpRow, { backgroundColor: "rgba(168,85,247,0.07)", borderColor: "rgba(168,85,247,0.25)" }]}>
              <View style={[s.xpDot, { backgroundColor: "#A855F7" }]} />
              <Text style={[s.xpLabel, { color: TEXT_SUB }]}>
                Head Start (
                {headStart === "random" ? "Random" : `${headStart} letter${headStart > 1 ? "s" : ""}`}
                )
              </Text>
              <Text style={[s.xpValue, { color: "#A855F7" }]}>−{hsDeduction} XP</Text>
            </View>
          )}

          <View style={[s.xpRow, { backgroundColor: SURFACE2, borderColor: BORDER }]}>
            <View style={[s.xpDot, { backgroundColor: TEXT_SUB }]} />
            <Text style={[s.xpLabel, { color: TEXT_SUB }]}>With hint</Text>
            <Text style={[s.xpValue, { color: TEXT }]}>+{Math.max(0, pts.withHint - hsDeduction)} XP</Text>
            <Text style={[s.xpPenalty]}> (−{pts.deduction}{hasHeadStart ? `+${hsDeduction}` : ""})</Text>
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

  // Timer Mode Toggle
  timerToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  timerToggleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timerToggleTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  timerToggleDesc: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  // Head Start Power-Up
  headStartCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  headStartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headStartIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headStartTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  headStartDesc: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
  },
  headStartBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  headStartBadgeText: {
    fontSize: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.8,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  previewBox: {
    width: 34,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBoxFilled: {
    // colored dynamically
  },
  previewBoxEmpty: {
    // transparent dynamically
  },
  previewBoxEllipsis: {
    width: 28,
    backgroundColor: "transparent",
  },
  previewLetter: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  previewLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
    marginLeft: 4,
  },
  headStartOptions: {
    flexDirection: "row",
    gap: 8,
  },
  headStartChip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 3,
  },
  chipLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    textAlign: "center",
  },
  chipSub: {
    fontSize: 8,
    fontFamily: "PlusJakartaSans_500Medium",
    textAlign: "center",
  },
});