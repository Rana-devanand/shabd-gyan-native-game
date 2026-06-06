import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";

const { width } = Dimensions.get("window");

interface Chapter {
  id: number;
  title: string;
  hindiTitle: string;
  narrative: string;
  puzzleId: string;
  category: string;
  difficulty: string;
  emoji: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "The Golden Brew",
    hindiTitle: "अध्याय १: दिव्य पेय की खोज",
    narrative: "Shabdpur village ke buzurgo ne aapse kaha ki swarn lekhni (golden quill) tak pahunchne ke liye sabse pehle aapko subah ka garam divya ras peena hoga. Decipher this brew to start your adventure!",
    puzzleId: "food_1", // TEA
    category: "Fruits & Food",
    difficulty: "Easy",
    emoji: "🍵",
  },
  {
    id: 2,
    title: "Forest of Echoes",
    hindiTitle: "अध्याय २: गूंजता हुआ जंगल",
    narrative: "Forest of Echoes ka rasta sookha aur banjar hai. Aage badhne ke liye aakash se paani barsana hoga jo dharati ki pyaas bujha sake. Call the droplets down!",
    puzzleId: "nature_2", // RAIN
    category: "Nature",
    difficulty: "Medium",
    emoji: "🌲",
  },
  {
    id: 3,
    title: "Lamps of Guidance",
    hindiTitle: "अध्याय ३: मार्गदर्शन के दीये",
    narrative: "Rasta bilkul andhera ho chuka hai aur andhere mein aage badhna khatarnak hai. Swarn Lekhni tak pahunchne ke liye diye jalayein aur roshni failayein!",
    puzzleId: "fest_2", // DIWALI
    category: "Festivals",
    difficulty: "Hard",
    emoji: "🪔",
  },
  {
    id: 4,
    title: "The Final Vault",
    hindiTitle: "अध्याय ४: अंतिम तिजोरी",
    narrative: "Aap aakhri kaksh (vault) mein pahunch chuke hain. Lekin lekhni ek adrishya shakti ke peeche band hai. Sabse hard aur chamkila ratna yahan sthapit karein taaki shakti kaant ho sake!",
    puzzleId: "precious_2", // DIAMOND
    category: "Precious Things",
    difficulty: "Super Hard",
    emoji: "💎",
  },
];

export default function StoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#475569";
  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadState = async () => {
        try {
          const solvedIdsStr = await AsyncStorage.getItem("shabdgyan_solved_ids");
          if (solvedIdsStr) {
            setSolvedIds(JSON.parse(solvedIdsStr) || []);
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadState();
    }, [])
  );

  // Check if a chapter is solved
  const isChapterSolved = (ch: Chapter) => solvedIds.includes(ch.puzzleId);

  // Check if a chapter is unlocked
  const isChapterUnlocked = (ch: Chapter) => {
    if (ch.id === 1) return true;
    const prevCh = CHAPTERS.find((c) => c.id === ch.id - 1);
    return prevCh ? isChapterSolved(prevCh) : false;
  };

  const handlePlayChapter = async (ch: Chapter) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    
    // Set game mode to shabd
    await AsyncStorage.setItem("shabdgyan_mode", "shabd");
    
    router.push({
      pathname: "/(authenticated)/play",
      params: { categoryName: ch.category, difficulty: ch.difficulty }
    });
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>कथा संग्रह 📖</Text>
          <Text style={[styles.subtitle, { color: subTextColor }]}>STORY MODE</Text>
        </View>

        {/* Narrative Intro */}
        <LinearGradient
          colors={["#7E57C2", "#3F51B5"]}
          style={styles.narrativeIntro}
        >
          <Text style={styles.introHeading}>The Golden Quill Legend 📜</Text>
          <Text style={styles.introText}>
            Shabdpur ke prachin mandir mein ek swarn lekhni rakhi hai. Us lekhni se likha har shabd sach ho jata hai. Aage badhein aur kahani ke har rahasya ko suljhayein!
          </Text>
        </LinearGradient>

        {/* Chapter List */}
        <View style={styles.chapterSection}>
          {CHAPTERS.map((ch) => {
            const unlocked = isChapterUnlocked(ch);
            const solved = isChapterSolved(ch);
            const isActive = activeChapter?.id === ch.id;

            return (
              <View
                key={ch.id}
                style={[
                  styles.chapterCardWrapper,
                  {
                    backgroundColor: cardBg,
                    borderColor: solved ? "#10B981" : unlocked ? "#7E57C2" : borderColor,
                    borderWidth: unlocked ? 1.8 : 1,
                    opacity: unlocked ? 1.0 : 0.6,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!unlocked}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                    setActiveChapter(isActive ? null : ch);
                  }}
                  style={styles.chapterTouch}
                >
                  <View style={styles.chapterMainRow}>
                    <View style={styles.chapterHeaderLeft}>
                      <View style={[styles.emojiBox, { backgroundColor: solved ? "rgba(16, 185, 129, 0.1)" : unlocked ? "rgba(126, 87, 194, 0.1)" : "rgba(148, 163, 184, 0.1)" }]}>
                        <Text style={styles.emojiText}>{unlocked ? ch.emoji : "🔒"}</Text>
                      </View>
                      <View>
                        <Text style={[styles.hindiTitleText, { color: textColor }]}>{ch.hindiTitle}</Text>
                        <Text style={[styles.chapterNameText, { color: subTextColor }]}>{ch.title}</Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    {solved ? (
                      <View style={styles.solvedBadge}>
                        <Ionicons name="checkmark-done" size={12} color="#10B981" />
                        <Text style={styles.solvedText}>SOLVED</Text>
                      </View>
                    ) : unlocked ? (
                      <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
                    ) : (
                      <Ionicons name="lock-closed" size={16} color={subTextColor} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Dropdown Narrative Details */}
                {isActive && unlocked && (
                  <View style={[styles.detailsContainer, { borderTopColor: borderColor }]}>
                    <Text style={[styles.narrativeDescText, { color: textColor }]}>{ch.narrative}</Text>
                    <TouchableOpacity
                      onPress={() => handlePlayChapter(ch)}
                      style={[styles.playBtn, { backgroundColor: solved ? "rgba(16, 185, 129, 0.15)" : "#7E57C2", borderColor: solved ? "#10B981" : "transparent", borderWidth: solved ? 1 : 0 }]}
                    >
                      <Text style={[styles.playBtnText, { color: solved ? "#10B981" : "#FFFFFF" }]}>
                        {solved ? "Replay Chapter Clue 🔄" : "Solve Chapter Clue 🔑"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  header: {
    marginBottom: 20,
    marginTop: 6,
  },
  title: {
    fontSize: 28,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 2,
  },
  narrativeIntro: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  introHeading: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
    marginBottom: 4,
  },
  introText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 18,
  },
  chapterSection: {
    gap: 16,
  },
  chapterCardWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  chapterTouch: {
    padding: 16,
  },
  chapterMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chapterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 22,
  },
  hindiTitleText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
  },
  chapterNameText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
  },
  solvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    gap: 4,
  },
  solvedText: {
    color: "#10B981",
    fontSize: 8,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  detailsContainer: {
    borderTopWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  narrativeDescText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  playBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
