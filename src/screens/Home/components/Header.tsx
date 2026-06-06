import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@rneui/themed";

interface HeaderProps {
  nickname: string;
  avatar: string;
  gameMode: "shabd" | "paheli";
  setGameMode: (mode: "shabd" | "paheli") => void;
  isDark: boolean;
  textColor: string;
  subTextColor: string;
  borderColor: string;
}

export default function Header({
  nickname,
  avatar,
  gameMode,
  setGameMode,
  isDark,
  textColor,
  subTextColor,
  borderColor,
}: HeaderProps) {
  const { theme } = useTheme();

  const handleToggleMode = async (mode: "shabd" | "paheli") => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setGameMode(mode);
    await AsyncStorage.setItem("shabdgyan_mode", mode);
  };

  return (
    <View style={styles.header}>
      <View style={styles.profileSection}>
        <LinearGradient
          colors={["#FF6B6B", "#FF8E53"]}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarEmoji}>{avatar}</Text>
        </LinearGradient>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.namasteText, { color: theme.colors.secondary }]}>NAMASTE 👋</Text>
          <Text style={[styles.playerName, { color: textColor }]}>{nickname}</Text>
        </View>
      </View>

      {/* Mode Selector Toggle Switch */}
      <View style={[styles.modeContainer, { backgroundColor: isDark ? "#05203B" : "#E2E8F0", borderColor }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleToggleMode("shabd")}
          style={[
            styles.modeTab,
            gameMode === "shabd" && { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              styles.modeTabText,
              gameMode === "shabd"
                ? { color: isDark ? "#021A30" : "#FFFFFF" }
                : { color: subTextColor },
            ]}
          >
            Shabd
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleToggleMode("paheli")}
          style={[
            styles.modeTab,
            gameMode === "paheli" && { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              styles.modeTabText,
              gameMode === "paheli"
                ? { color: isDark ? "#021A30" : "#FFFFFF" }
                : { color: subTextColor },
            ]}
          >
            Paheli
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 6,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  headerTextContainer: {
    justifyContent: "center",
  },
  namasteText: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  playerName: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "bold",
    marginTop: 1,
  },
  modeContainer: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
  },
  modeTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
