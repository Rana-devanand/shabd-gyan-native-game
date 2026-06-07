import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface CategoryListProps {
  categories: any[];
  modePuzzles: any[];
  solvedIds: string[];
  isDark: boolean;
  textColor: string;
  onSelectCategory: (categoryName: string) => void;
}

const { width } = Dimensions.get("window");

export default function CategoryList({
  categories,
  modePuzzles,
  solvedIds,
  isDark,
  textColor,
  onSelectCategory,
}: CategoryListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Choose Category
        </Text>
        <View style={[styles.badge, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
          <Text style={[styles.badgeText, { color: textColor }]}>
            {categories.length} Topics
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {categories.map((cat, index) => {
          const catPuzzles = modePuzzles.filter((p) => p.category === cat.name);
          const catSolved = catPuzzles.filter((p) => solvedIds.includes(p.id)).length;
          const totalPuzzles = catPuzzles.length;
          const progressPercent = totalPuzzles > 0 ? (catSolved / totalPuzzles) * 100 : 0;
          const isCompleted = progressPercent === 100;

          return (
            <TouchableOpacity
              key={cat.name}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`${cat.name} category, ${catSolved} of ${totalPuzzles} puzzles solved`}
              accessibilityHint="Double tap to view puzzles in this category"
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) { }
                onSelectCategory(cat.name);
              }}
              style={[
                styles.card,
                {
                  shadowColor: isDark ? "#000" : cat.gradient[0],
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)",
                },
              ]}
            >
              {/* Background Gradient */}
              <LinearGradient
                colors={cat.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              >
                {/* Contrast Overlay - Ensures text readability on any gradient */}
                <LinearGradient
                  colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.1)", "transparent"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.contrastOverlay}
                />

                {/* Background Icon Watermark */}
                <Text style={[styles.watermark, { opacity: isDark ? 0.08 : 0.15 }]}>
                  {cat.icon}
                </Text>

                {/* Content Container */}
                <View style={styles.content}>
                  {/* Top Row: Icon + Title + Status */}
                  <View style={styles.topRow}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.iconText}>{cat.icon}</Text>
                    </View>

                    <View style={styles.titleContainer}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <Text style={styles.subtitle}>
                        {isCompleted ? "Completed! 🎉" : `${totalPuzzles - catSolved} remaining`}
                      </Text>
                    </View>

                    {isCompleted ? (
                      <View style={styles.completionBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.percentagePill}>
                        <Text style={styles.percentageText}>{Math.round(progressPercent)}%</Text>
                      </View>
                    )}
                  </View>

                  {/* Progress Section */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${progressPercent}%`,
                            backgroundColor: isCompleted ? "#FFD700" : "#FFFFFF",
                            shadowColor: isCompleted ? "#FFD700" : "#FFFFFF",
                          }
                        ]}
                      />
                    </View>

                    <View style={styles.statsRow}>
                      <Text style={styles.statsText}>
                        <Text style={styles.solvedCount}>{catSolved}</Text>
                        <Text style={styles.totalCount}> / {totalPuzzles}</Text>
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="rgba(255,255,255,0.8)"
                      />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  grid: {
    gap: 16,
  },
  card: {
    height: 140,
    borderRadius: 24,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
  },
  gradientBackground: {
    flex: 1,
    position: "relative",
  },
  contrastOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: "70%", // Only cover left side where text is
  },
  watermark: {
    position: "absolute",
    right: -20,
    top: -20,
    fontSize: 120,
    transform: [{ rotate: "15deg" }],
    zIndex: 0,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
    zIndex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    backdropFilter: "blur(10px)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  iconText: {
    fontSize: 24,
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  percentagePill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  percentageText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  completionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,215,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  progressSection: {
    gap: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsText: {
    fontSize: 14,
  },
  solvedCount: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  totalCount: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});