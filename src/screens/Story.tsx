import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemeMode } from "@rneui/themed";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { fetchUserStoryChapters, UserStoryChapter, saveUserStoryChapter } from "../services/databaseService";
import { generateDynamicChapter } from "../services/groqService";
import { speakText, stopSpeech } from "../utils/ttsHelper";

interface Chapter {
  chapter_id: number;
  title: string;
  hindi_title: string;
  narrative: string;
  puzzle_id: string;
  category: string;
  difficulty: string;
  solved: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Fruits & Food": return "restaurant-outline";
    case "Nature": return "leaf-outline";
    case "Festivals": return "flame-outline";
    case "City Life": return "business-outline";
    case "Music & Art": return "musical-notes-outline";
    case "Precious Things": return "diamond-outline";
    default: return "book-outline";
  }
};

export default function StoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#475569";
  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  // Tab Selection: "chapters" | "ai_story"
  const [activeTab, setActiveTab] = useState<"chapters" | "ai_story">("chapters");

  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [dbChapters, setDbChapters] = useState<UserStoryChapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<UserStoryChapter | null>(null);

  // Dynamic Generation states
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");

  // Text-to-Speech state
  const [speakingChapterId, setSpeakingChapterId] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadState = async () => {
        try {
          // 1. Load Solved IDs
          const solvedIdsStr = await AsyncStorage.getItem("shabdgyan_solved_ids");
          let sIds: string[] = [];
          if (solvedIdsStr) {
            sIds = JSON.parse(solvedIdsStr) || [];
            setSolvedIds(sIds);
          }
          
          // 2. Fetch User Chapters
          let list = await fetchUserStoryChapters();
          
          // 3. Generate first 5 chapters if none exist
          if (list.length === 0) {
            setLoadingChapters(true);
            const generatedList: UserStoryChapter[] = [];
            for (let i = 1; i <= 5; i++) {
              setLoadingProgress(`Creating Chapter ${i} of 5...`);
              try {
                const generated = await generateDynamicChapter(i);
                const saved = await saveUserStoryChapter({
                  chapter_id: i,
                  title: generated.title,
                  hindi_title: generated.hindi_title,
                  narrative: generated.narrative,
                  puzzle_id: `story_ch_${i}`,
                  category: generated.category,
                  difficulty: generated.difficulty,
                  question: generated.question,
                  answer: generated.answer,
                  hint: generated.hint,
                  language: "Hindi"
                });
                if (saved) {
                  generatedList.push(saved);
                }
              } catch (e) {
                console.error(`Error generating initial chapter ${i}:`, e);
              }
            }
            list = generatedList;
            setLoadingChapters(false);
          } else {
            // 4. Batch generation trigger for next 5 chapters
            // Check if all current chapters are solved
            const solvedDbChapters = list.filter(c => c.solved || sIds.includes(`story_ch_${c.chapter_id}`));
            const currentTotal = list.length;
            
            if (solvedDbChapters.length === currentTotal && currentTotal < 50) {
              setLoadingChapters(true);
              const nextStart = currentTotal + 1;
              const nextEnd = Math.min(50, currentTotal + 5);
              const generatedList = [...list];
              
              for (let i = nextStart; i <= nextEnd; i++) {
                setLoadingProgress(`Unlocking Chapter ${i}...`);
                try {
                  const generated = await generateDynamicChapter(i);
                  const saved = await saveUserStoryChapter({
                    chapter_id: i,
                    title: generated.title,
                    hindi_title: generated.hindi_title,
                    narrative: generated.narrative,
                    puzzle_id: `story_ch_${i}`,
                    category: generated.category,
                    difficulty: generated.difficulty,
                    question: generated.question,
                    answer: generated.answer,
                    hint: generated.hint,
                    language: "Hindi"
                  });
                  if (saved) {
                    generatedList.push(saved);
                  }
                } catch (e) {
                  console.error(`Error generating next chapter ${i}:`, e);
                }
              }
              list = generatedList;
              setLoadingChapters(false);
            }
          }

          setDbChapters(list);

          const dbSolvedIds = list.filter(c => c.solved).map(c => `story_ch_${c.chapter_id}`);
          if (dbSolvedIds.length > 0) {
            setSolvedIds(prev => {
              const merged = new Set([...prev, ...dbSolvedIds, ...sIds]);
              return Array.from(merged);
            });
          }
        } catch (e) {
          console.error(e);
          setLoadingChapters(false);
        }
      };
      loadState();
      return () => {
        stopSpeech().catch(() => {});
        setSpeakingChapterId(null);
      };
    }, [])
  );

  const isChapterSolved = (ch: UserStoryChapter) => {
    return ch.solved || solvedIds.includes(ch.puzzle_id);
  };

  const isChapterUnlocked = (ch: UserStoryChapter) => {
    if (ch.chapter_id === 1) return true;
    const prevCh = dbChapters.find((c) => c.chapter_id === ch.chapter_id - 1);
    return prevCh ? isChapterSolved(prevCh) : false;
  };

  const handlePlayChapter = async (ch: UserStoryChapter) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    router.push({
      pathname: "/(authenticated)/quests/story-play",
      params: { 
        chapterId: String(ch.chapter_id),
        chapterTitle: ch.title,
        chapterHindiTitle: ch.hindi_title,
        category: ch.category,
        difficulty: ch.difficulty
      },
    });
  };

  const handleToggleChapterSpeech = async (ch: UserStoryChapter) => {
    if (speakingChapterId === ch.chapter_id) {
      await stopSpeech();
      setSpeakingChapterId(null);
    } else {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
      setSpeakingChapterId(ch.chapter_id);

      const lang = (ch.language || "Hindi").toLowerCase().trim();
      let prefix = " . . . Tricky Question: ";
      if (lang === "hindi" || lang === "hinglish") {
        prefix = " . . . कठिन प्रश्न: ";
      } else if (lang === "tamil") {
        prefix = " . . . சவாலான கேள்வி: ";
      } else if (lang === "telugu") {
        prefix = " . . . చిక్కు ప్రశ్న: ";
      } else if (lang === "marathi") {
        prefix = " . . . अवघड प्रश्न: ";
      } else if (lang === "bengali") {
        prefix = " . . . कठिन প্রশ্ন: ";
      } else if (lang === "gujarati") {
        prefix = " . . . અઘરો પ્રશ્ન: ";
      } else if (lang === "punjabi") {
        prefix = " . . . ਔਖਾ ਸਵਾਲ: ";
      }

      const combinedText = `${ch.narrative}${prefix}${ch.question}`;

      await speakText(
        combinedText,
        () => setSpeakingChapterId(ch.chapter_id),
        () => setSpeakingChapterId(null)
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: theme.colors.background }]}>
      
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Story Collection</Text>
        <Text style={[styles.subtitle, { color: subTextColor }]}>STORY MODE</Text>
      </View>

      {/* Segment Selector Tabs */}
      <View style={[styles.tabSelectorRow, { borderColor }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("chapters")}
          style={[styles.tabBtn, activeTab === "chapters" && styles.tabBtnActive]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="book-outline"
              size={15}
              color={activeTab === "chapters" ? "#FFFFFF" : subTextColor}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === "chapters" ? styles.tabTextActive : { color: subTextColor }]}>
              Chapters
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("ai_story")}
          style={[styles.tabBtn, activeTab === "ai_story" && styles.tabBtnActive]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="sparkles-outline"
              size={15}
              color={activeTab === "ai_story" ? "#FFFFFF" : subTextColor}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === "ai_story" ? styles.tabTextActive : { color: subTextColor }]}>
              AI Story
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* --- TABS 1: STATIC CHAPTERS MODE --- */}
        {activeTab === "chapters" && (
          <>
            {/* Narrative Intro */}
            <LinearGradient colors={["#7E57C2", "#3F51B5"]} style={styles.narrativeIntro}>
              <View style={styles.introHeaderRow}>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.introHeading}>The Golden Quill Legend</Text>
              </View>
              <Text style={styles.introText}>
                Deep within the ancient temple of Shabdpur lies a Golden Quill. Every word written with this quill becomes reality. Move forward and uncover the mysteries hidden throughout the story!
              </Text>
            </LinearGradient>

            {/* Dynamic AI Loading Status */}
            {loadingChapters && (
              <LinearGradient colors={["#7E57C2", "#3F51B5"]} style={[styles.narrativeIntro, { alignItems: "center", paddingVertical: 20 }]}>
                <ActivityIndicator size="large" color="#FFFFFF" style={{ marginBottom: 12 }} />
                <Text style={[styles.introHeading, { textAlign: "center" }]}>{loadingProgress}</Text>
                <Text style={[styles.introText, { textAlign: "center", marginTop: 4, opacity: 0.8 }]}>
                  Please wait, Lexara AI is drafting your unique mystery chapters...
                </Text>
              </LinearGradient>
            )}

            {/* Chapter List */}
            <View style={styles.chapterSection}>
              {dbChapters.map((ch) => {
                const unlocked = isChapterUnlocked(ch);
                const solved = isChapterSolved(ch);
                const isActive = activeChapter?.chapter_id === ch.chapter_id;
                const iconName = getCategoryIcon(ch.category);

                return (
                  <View
                    key={ch.chapter_id}
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
                          <View style={[styles.iconBox, { backgroundColor: solved ? "rgba(16, 185, 129, 0.1)" : unlocked ? "rgba(126, 87, 194, 0.1)" : "rgba(148, 163, 184, 0.1)" }]}>
                            <Ionicons
                              name={unlocked ? iconName : "lock-closed-outline"}
                              size={18}
                              color={solved ? "#10B981" : unlocked ? "#7E57C2" : subTextColor}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.hindiTitleText, { color: textColor }]}>{ch.hindi_title}</Text>
                            <Text style={[styles.chapterNameText, { color: subTextColor }]}>{ch.title}</Text>
                          </View>
                        </View>

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

                    {isActive && unlocked && (
                      <View style={[styles.detailsContainer, { borderTopColor: borderColor }]}>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                          <Text style={[styles.narrativeDescText, { color: textColor, flex: 1 }]}>{ch.narrative}</Text>
                          <TouchableOpacity
                            onPress={() => handleToggleChapterSpeech(ch)}
                            activeOpacity={0.7}
                            style={{
                              backgroundColor: speakingChapterId === ch.chapter_id ? "rgba(126, 87, 194, 0.15)" : "rgba(148, 163, 184, 0.1)",
                              padding: 8,
                              borderRadius: 20,
                              alignSelf: "flex-start",
                              borderWidth: 1,
                              borderColor: speakingChapterId === ch.chapter_id ? "#7E57C2" : "transparent",
                            }}
                          >
                            <Ionicons
                              name={speakingChapterId === ch.chapter_id ? "volume-high" : "volume-medium-outline"}
                              size={18}
                              color={speakingChapterId === ch.chapter_id ? "#7E57C2" : subTextColor}
                            />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          onPress={() => handlePlayChapter(ch)}
                          style={[
                            styles.playBtn,
                            {
                              backgroundColor: solved ? "rgba(16, 185, 129, 0.15)" : "#7E57C2",
                              borderColor: solved ? "#10B981" : "transparent",
                              borderWidth: solved ? 1 : 0,
                            },
                          ]}
                        >
                          <Ionicons
                            name={solved ? "refresh-outline" : "key-outline"}
                            size={15}
                            color={solved ? "#10B981" : "#FFFFFF"}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={[styles.playBtnText, { color: solved ? "#10B981" : "#FFFFFF" }]}>
                            {solved ? "Replay Chapter Clue" : "Solve Chapter Clue"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* --- TABS 2: AI STORY MODE --- */}
        {activeTab === "ai_story" && (
          <View style={styles.aiModeContainer}>
            <View style={[styles.aiIdleBox, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.aiBrainIconBox}>
                <Ionicons name="sparkles-outline" size={48} color="#7E57C2" />
              </View>
              <Text style={[styles.aiIdleTitle, { color: textColor }]}>AI Story Chamber</Text>
              <Text style={[styles.aiIdleDesc, { color: subTextColor }]}>
                Enter the mystical chamber where our AI storyteller generates an immersive, long mystery story. Find hidden clues and unscramble the letter tiles to answer!
              </Text>
              <TouchableOpacity
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
                  router.push("/(authenticated)/quests/story-play");
                }}
                style={styles.generateBtn}
              >
                <Ionicons name="enter" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.generateBtnText}>Enter Chamber & Generate Story</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
    paddingTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 10,
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
  tabSelectorRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 16,
    padding: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: "#7E57C2",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  narrativeIntro: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  introHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  introHeading: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
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
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  hindiTitleText: {
    fontSize: 13,
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
    flexDirection: "row",
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  aiModeContainer: {
    width: "100%",
  },
  aiIdleBox: {
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(126, 87, 194, 0.2)",
    backgroundColor: "rgba(126, 87, 194, 0.03)",
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  aiBrainIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(126, 87, 194, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(126, 87, 194, 0.2)",
  },
  aiIdleTitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  aiIdleDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "PlusJakartaSans_500Medium",
    paddingHorizontal: 10,
  },
  generateBtn: {
    width: "100%",
    backgroundColor: "#7E57C2",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  generateBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
});
