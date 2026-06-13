import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { useThemeMode } from "@rneui/themed";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const CARD_W = width - 32;

// ── Shimmer line primitive ────────────────────────────────────────────────────
function SkLine({
  w = "100%",
  h = 12,
  r = 6,
  style,
  shimmerAnim,
  isDark,
}: {
  w?: number | string;
  h?: number;
  r?: number;
  style?: any;
  shimmerAnim: Animated.Value;
  isDark: boolean;
}) {
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_W, CARD_W],
  });

  const baseBg = isDark ? "#05203B" : "#EEF2F6";
  const shimmerColors: [string, string, string] = isDark
    ? ["#05203B", "#0A3460", "#05203B"]
    : ["#EEF2F6", "#FFFFFF", "#EEF2F6"];

  return (
    <View
      style={[
        {
          width: w,
          height: h,
          borderRadius: r,
          backgroundColor: baseBg,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

// ── Circle shorthand ──────────────────────────────────────────────────────────
function SkCircle({
  size,
  shimmerAnim,
  isDark,
}: {
  size: number;
  shimmerAnim: Animated.Value;
  isDark: boolean;
}) {
  return (
    <SkLine w={size} h={size} r={size / 2} shimmerAnim={shimmerAnim} isDark={isDark} />
  );
}

// ── Rounded rect shorthand ────────────────────────────────────────────────────
function SkRect({
  w,
  h,
  r = 10,
  shimmerAnim,
  isDark,
  style,
}: {
  w?: number | string;
  h: number;
  r?: number;
  shimmerAnim: Animated.Value;
  isDark: boolean;
  style?: any;
}) {
  return (
    <SkLine w={w} h={h} r={r} shimmerAnim={shimmerAnim} isDark={isDark} style={style} />
  );
}

// ── Main skeleton ─────────────────────────────────────────────────────────────
export default function ProfileSkeleton() {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";
  const sectionBg = isDark ? "#040E1C" : "#F8FAFC";

  const sp = { shimmerAnim, isDark };

  return (
    <View style={[styles.container, { backgroundColor: sectionBg }]}>

      {/* ── Profile Header ── */}
      <View style={[styles.headerCard, { backgroundColor: cardBg, borderColor }]}>
        <SkCircle size={82} {...sp} />
        <View style={{ marginTop: 12, alignItems: "center", gap: 8 }}>
          <SkLine w={120} h={16} r={8} {...sp} />
          <SkLine w={88} h={11} r={5} {...sp} />
          <SkRect w={80} h={28} r={14} {...sp} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <SkCircle size={26} {...sp} />
            <SkLine w={32} h={14} r={6} {...sp} style={{ marginTop: 8 }} />
            <SkLine w={44} h={10} r={5} {...sp} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* ── Section: Game Preferences ── */}
      <SkSection label cardBg={cardBg} borderColor={borderColor} rows={3} {...sp} />

      {/* ── Section: Rewards Vault ── */}
      <SkRewardSection cardBg={cardBg} borderColor={borderColor} {...sp} />

      {/* ── Section: Account ── */}
      <SkSection label cardBg={cardBg} borderColor={borderColor} rows={2} {...sp} />

      {/* ── Action Buttons ── */}
      <View style={styles.actionsGroup}>
        <SkRect w="100%" h={46} r={12} {...sp} />
        <SkRect w="100%" h={46} r={12} {...sp} />
      </View>
    </View>
  );
}

// ── Generic preference list skeleton ─────────────────────────────────────────
function SkSection({
  cardBg,
  borderColor,
  rows,
  shimmerAnim,
  isDark,
}: {
  cardBg: string;
  borderColor: string;
  rows: number;
  shimmerAnim: Animated.Value;
  isDark: boolean;
  label?: boolean;
}) {
  const sp = { shimmerAnim, isDark };
  return (
    <View style={styles.section}>
      <SkLine w={110} h={11} r={5} {...sp} style={{ marginBottom: 10 }} />
      <View style={[styles.listCard, { backgroundColor: cardBg, borderColor }]}>
        {Array.from({ length: rows }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.listRow,
              i < rows - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor },
            ]}
          >
            {/* icon placeholder */}
            <SkCircle size={30} {...sp} />
            {/* label */}
            <SkLine w={80 + i * 18} h={12} r={5} {...sp} style={{ marginLeft: 10 }} />
            {/* right control */}
            <SkLine
              w={i === 0 ? 38 : 58}
              h={i === 0 ? 22 : 12}
              r={i === 0 ? 11 : 5}
              {...sp}
              style={{ marginLeft: "auto" }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Rewards section skeleton ──────────────────────────────────────────────────
function SkRewardSection({
  cardBg,
  borderColor,
  shimmerAnim,
  isDark,
}: {
  cardBg: string;
  borderColor: string;
  shimmerAnim: Animated.Value;
  isDark: boolean;
}) {
  const sp = { shimmerAnim, isDark };
  return (
    <View style={styles.section}>
      <SkLine w={110} h={11} r={5} {...sp} style={{ marginBottom: 10 }} />
      <View style={[styles.listCard, { backgroundColor: cardBg, borderColor }]}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[
              styles.listRow,
              { paddingVertical: 14 },
              i === 0 && { borderBottomWidth: 1, borderBottomColor: borderColor },
            ]}
          >
            {/* icon box */}
            <SkLine w={38} h={38} r={10} {...sp} />
            <View style={{ marginLeft: 10, flex: 1, gap: 6 }}>
              <SkLine w="60%" h={12} r={5} {...sp} />
              <SkLine w="40%" h={10} r={5} {...sp} />
            </View>
            <SkLine w={56} h={24} r={8} {...sp} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerCard: {
    alignItems: "center",
    paddingVertical: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  section: {
    marginBottom: 20,
  },
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  actionsGroup: {
    gap: 10,
  },
});