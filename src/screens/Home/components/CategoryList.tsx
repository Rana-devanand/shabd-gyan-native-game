import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
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

export default function CategoryList({
  categories,
  modePuzzles,
  solvedIds,
  isDark,
  textColor,
  onSelectCategory,
}: CategoryListProps) {
  return (
    <View style={styles.categoriesVerticalSection}>
      <Text style={[styles.sectionTitleText, { color: textColor, marginBottom: 14 }]}>
        Choose Category 📂
      </Text>

      {categories.map((cat) => {
        const catPuzzles = modePuzzles.filter((p) => p.category === cat.name);
        const catSolved = catPuzzles.filter((p) => solvedIds.includes(p.id)).length;
        const progressPercent = catPuzzles.length > 0 ? (catSolved / catPuzzles.length) * 100 : 0;

        return (
          <TouchableOpacity
            key={cat.name}
            activeOpacity={0.85}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (e) {}
              onSelectCategory(cat.name);
            }}
            style={styles.verticalCategoryCard}
          >
            <LinearGradient
              colors={cat.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verticalCardGradient}
            >
              {/* Category based icon in the background with transparency */}
              <Text style={[styles.verticalCardWatermark, { opacity: isDark ? 0.15 : 0.1 }]}>
                {cat.icon}
              </Text>

              <View style={styles.verticalCardLeft}>
                <View style={styles.verticalCardDetails}>
                  <Text style={styles.verticalCardName}>{cat.name}</Text>
                  <View style={styles.verticalCardProgressRow}>
                    <View style={styles.premiumProgressContainer}>
                      <View style={[styles.premiumProgressFill, { width: `${progressPercent}%` }]} />
                    </View>
                    <Text style={styles.premiumProgressText}>
                      {catSolved} / {catPuzzles.length} Solved
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.verticalCardRight}>
                <LinearGradient
                  colors={["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.05)"]}
                  style={styles.percentBadge}
                >
                  <Text style={styles.percentBadgeText}>{Math.round(progressPercent)}%</Text>
                </LinearGradient>
                <Ionicons name="arrow-forward-circle" size={28} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  categoriesVerticalSection: {
    gap: 14,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  verticalCategoryCard: {
    height: 160,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  verticalCardWatermark: {
    position: "absolute",
    right: -25,
    bottom: -35,
    fontSize: 160,
    transform: [{ rotate: "-15deg" }],
  },
  verticalCardGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  verticalCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  verticalCardDetails: {
    flex: 1,
    gap: 6,
  },
  verticalCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  verticalCardProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  premiumProgressContainer: {
    width: 70,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 3,
    overflow: "hidden",
  },
  premiumProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  premiumProgressText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  verticalCardRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  percentBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
