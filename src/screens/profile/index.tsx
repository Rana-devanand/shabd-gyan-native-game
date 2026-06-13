import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
  Dimensions,
  Image,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showMessage } from "react-native-flash-message";
import { useAppDispatch } from "../../store/store";
import { resetTokens } from "../../store/actions/authActions";
import { useTheme, useThemeMode } from "@rneui/themed";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../Supabase/client";
import AvatarDisplay from "../../common/AvatarDisplay";
import SelectionModal from "../../common/SelectionModal";
import { useMusic } from "../../context/MusicContext";
import * as Haptics from "expo-haptics";
import ProfileSkeleton from "./Skeleton";
import { getXPLevel } from "../../utils/xpHelper";
import COUNTRIES from "../../constants/countries.json";


const { width } = Dimensions.get("window");



const BOY_IMAGE = require("../../../assets/avatar/boy.jpg");
const GIRL_IMAGE = require("../../../assets/avatar/girl.jpg");

const AVATARS = [
  { id: "boy", image: BOY_IMAGE, label: "Boy", gender: "Male" },
  { id: "girl", image: GIRL_IMAGE, label: "Girl", gender: "Female" }
];

export default function Profile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const { mode, setMode } = useThemeMode();
  const isDark = mode === "dark";

  // Dynamic Theme Colors
  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "#8AB4D4" : "#475569";
  const cardBg = isDark ? "#05203B" : "#FFFFFF";
  const borderColor = isDark ? "#072C50" : "#E2E8F0";

  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("Player");
  const [avatar, setAvatar] = useState("boy");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [totalScore, setTotalScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [playedCount, setPlayedCount] = useState(0);
  const [questEarned, setQuestEarned] = useState(0);
  const [joinedDate, setJoinedDate] = useState("");

  // User Settings State
  const { soundEnabled, setSoundEnabled } = useMusic();
  const [difficulty, setDifficulty] = useState("Medium");
  const [langPreference, setLangPreference] = useState("English");

  // Selection Modal visibility
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [diffModalVisible, setDiffModalVisible] = useState(false);

  // Derive country flag from countries.json
  const countryFlag = useMemo(() => {
    if (!country) return "";
    const found = (COUNTRIES as any[]).find(
      (c) => c.name.toLowerCase() === country.toLowerCase()
    );
    return found?.flag || "";
  }, [country]);

  // Derive language options dynamically from user's country in countries.json
  const LANGUAGE_OPTIONS = useMemo(() => {
    const allCountries = COUNTRIES as Array<{ name: string; flag: string; code: string; languages: Array<{ code: string; name: string }> }>;

    let langs: { label: string; value: string; icon: string; subtitle: string }[] = [];

    if (country) {
      const found = allCountries.find(
        (c) => c.name.toLowerCase() === country.toLowerCase()
      );
      if (found && found.languages.length > 0) {
        langs = found.languages.map((l) => ({
          label: l.name,
          value: l.name,
          icon: found.flag,
          subtitle: `Official language of ${found.name}`,
        }));
      }
    }

    // Always include Hinglish as first option (game-specific)
    const hasHinglish = langs.some((l) => l.value === "Hinglish");
    if (!hasHinglish) {
      langs = [
        { label: "Hinglish", value: "Hinglish", icon: "🇮🇳", subtitle: "Hindi clues + English answers (Game default)" },
        ...langs,
      ];
    }

    // Always include English as fallback
    const hasEnglish = langs.some((l) => l.value === "English");
    if (!hasEnglish) {
      langs.push({ label: "English", value: "English", icon: "🇬🇧", subtitle: "Full English mode" });
    }

    return langs;
  }, [country]);

  // Difficulty options
  const DIFFICULTY_OPTIONS = [
    { label: "Easy", value: "Easy", icon: "🟢", subtitle: "Best for beginners" },
    { label: "Medium", value: "Medium", icon: "🟡", subtitle: "Default — balanced challenge" },
    { label: "Hard", value: "Hard", icon: "🔴", subtitle: "For seasoned players" },
    { label: "Super Hard", value: "Super Hard", icon: "💀", subtitle: "Only for the bold!" },
  ];

  // Rewards Vault State
  const [couponClaimed, setCouponClaimed] = useState(false);
  const [couponCodeVal, setCouponCodeVal] = useState("");
  const [rechargeClaimed, setRechargeClaimed] = useState(false);
  const [rechargePhoneVal, setRechargePhoneVal] = useState("");
  const [claimPhoneInput, setClaimPhoneInput] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Modals Visibility
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  // Edit fields
  const [editNickname, setEditNickname] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [feedbackText, setFeedbackText] = useState("");

  // Load stats and history on screen focus
  useFocusEffect(
    React.useCallback(() => {
      const loadProfileAndSettings = async () => {
        try {
          // ── 1. Load local cache immediately so UI shows fast ──────────────
          const storedDifficulty = await AsyncStorage.getItem("game_difficulty_preference");
          if (storedDifficulty) setDifficulty(storedDifficulty);

          // ── 2. Fetch authoritative data from Supabase ─────────────────────
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            setLoading(false);
            return;
          }

          const userId = session.user.id;
          setEmail(session.user.email || "");

          // Fetch full profile row
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

          if (profile) {
            setNickname(profile.nickname || "Player");
            setAvatar(profile.avatar || "boy");
            setTotalScore(profile.score ?? 0);
            setCurrentStreak(profile.streak ?? 0);
            setMaxStreak(profile.max_streak ?? 0);
            if (profile.age) setAge(String(profile.age));
            if (profile.gender) setGender(profile.gender);
            if (profile.country) setCountry(profile.country);
            // ── Language: always load from DB profile.language field ──
            if (profile.language) {
              setLangPreference(profile.language);
              await AsyncStorage.setItem("game_language", profile.language);
            } else {
              // fallback to AsyncStorage if DB has no language set
              const storedLang = await AsyncStorage.getItem("game_language");
              if (storedLang) setLangPreference(storedLang);
            }
            // Persist to AsyncStorage so other screens stay in sync
            await AsyncStorage.setItem("user_nickname", profile.nickname || "Player");
            await AsyncStorage.setItem("user_avatar", profile.avatar || "boy");
            await AsyncStorage.setItem("shabdgyan_score", String(profile.score ?? 0));
            await AsyncStorage.setItem("shabdgyan_streak", String(profile.streak ?? 0));
            await AsyncStorage.setItem("shabdgyan_max_streak", String(profile.max_streak ?? 0));
            // Joined date from Supabase created_at
            if (profile.created_at) {
              const d = new Date(profile.created_at);
              setJoinedDate(d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
            }
          }

          // Fetch solved puzzle count
          const { count: solved } = await supabase
            .from("user_solved_puzzles")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId);
          setSolvedCount(solved ?? 0);

          // Fetch total played quiz count (including dynamic/quest plays)
          const { count: played } = await supabase
            .from("user_played_quizzes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId);
          setPlayedCount(played ?? 0);

          // Fetch total quest XP earned from Supabase points table (authoritative)
          const { data: questPoints } = await supabase
            .from("points")
            .select("points")
            .eq("user_id", userId)
            .in("reason", ["daily_quest_completed", "high_score_hunt_completed", "secret_chest_bonus", "decipher_scroll_completed", "story_quest_completed"]);

          if (questPoints && questPoints.length > 0) {
            const total = questPoints.reduce((sum, row) => sum + (row.points || 0), 0);
            setQuestEarned(total);
            await AsyncStorage.setItem("shabdgyan_quest_total_earned", String(total));
          } else {
            // Fallback to AsyncStorage if no backend data yet
            const questXpStr = await AsyncStorage.getItem("shabdgyan_quest_total_earned");
            setQuestEarned(parseInt(questXpStr || "0", 10));
          }

          // Fetch rewards from Supabase
          const { data: rewards } = await supabase
            .from("user_rewards")
            .select("*")
            .eq("user_id", userId);

          if (rewards) {
            const cReward = rewards.find(r => r.reward_type === "coupon_1k");
            const rReward = rewards.find(r => r.reward_type === "recharge_50k");
            if (cReward) {
              setCouponClaimed(true);
              setCouponCodeVal(cReward.reward_value);
            }
            if (rReward) {
              setRechargeClaimed(true);
              setRechargePhoneVal(rReward.reward_value);
            }
          }

        } catch (error) {
          console.error("[Profile] Error loading profile details:", error);
        } finally {
          setLoading(false);
        }
      };

      loadProfileAndSettings();
    }, [])
  );

  // Save Manage Profile changes
  const handleSaveProfile = async () => {
    if (editNickname.trim().length < 2) {
      showMessage({
        message: "Nickname must be at least 2 letters ⚠️",
        type: "warning",
      });
      return;
    }

    const editGender = editAvatar === "boy" ? "Male" : "Female";

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Save to Supabase via RPC
      const { error } = await supabase.rpc("create_profile", {
        user_id: user.id,
        p_nickname: editNickname.trim(),
        p_avatar: editAvatar,
      });
      if (error) throw error;

      // Update gender in profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ gender: editGender })
        .eq("id", user.id);
      if (updateError) throw updateError;

      // Save to local storage
      await AsyncStorage.setItem("user_nickname", editNickname.trim());
      await AsyncStorage.setItem("user_avatar", editAvatar);
      await AsyncStorage.setItem("user_gender", editGender);

      setNickname(editNickname.trim());
      setAvatar(editAvatar);
      setGender(editGender);
      setManageModalVisible(false);

      showMessage({
        message: "Profile updated successfully! ✨",
        type: "success",
      });
    } catch (e: any) {
      console.error(e);
      showMessage({
        message: e.message || "Failed to update profile",
        type: "danger",
      });
    }
  };

  // Open Edit Profile Modal
  const openEditModal = () => {
    setEditNickname(nickname);
    setEditAvatar(avatar);
    setManageModalVisible(true);
  };

  // Sound toggling
  const handleToggleSound = async (value: boolean) => {
    await setSoundEnabled(value);
  };

  // Difficulty selection picker
  const updateDifficulty = async (level: string) => {
    setDifficulty(level);
    await AsyncStorage.setItem("game_difficulty_preference", level);
    showMessage({
      message: `Difficulty set to ${level}! 🎯`,
      type: "info"
    });
  };

  const updateLanguage = async (lang: string) => {
    setLangPreference(lang);
    await AsyncStorage.setItem("game_language", lang);
    showMessage({
      message: `Language set to ${lang}! 🌐`,
      type: "info"
    });
  };

  // Submit Feedback modal action
  const handleSendFeedback = () => {
    if (feedbackText.trim().length < 5) {
      showMessage({
        message: "Please write at least a few words! ✍️",
        type: "warning"
      });
      return;
    }

    setFeedbackModalVisible(false);
    setFeedbackText("");
    Alert.alert(
      "Feedback Submitted! 🙏",
      "We have received your feedback. Thank you for helping us improve Shabd Gyan!"
    );
  };

  // Sign Out (Clears Session Token but leaves data intact)
  const handleSignOut = () => {
    Alert.alert(
      "Sign Out?",
      "Are you sure you want to sign out? Your game statistics and solved history will be saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Sign Out",
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              await AsyncStorage.removeItem("access_token");
              await AsyncStorage.removeItem("refresh_token");
              dispatch(resetTokens());
              router.replace("/sign-up");
              showMessage({
                message: "Signed out successfully! 👋",
                type: "info"
              });
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  // Delete Account (Wipes everything permanently)
  const handleDeleteAccount = () => {
    Alert.alert(
      "DELETE ACCOUNT? ⚠️",
      "WARNING: This will permanently delete your profile, scores, streak, and solved puzzle history. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete Permanently",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("user_nickname");
              await AsyncStorage.removeItem("user_avatar");
              await AsyncStorage.removeItem("shabdgyan_score");
              await AsyncStorage.removeItem("shabdgyan_streak");
              await AsyncStorage.removeItem("shabdgyan_max_streak");
              await AsyncStorage.removeItem("shabdgyan_solved_ids");
              await AsyncStorage.removeItem("shabdgyan_history");
              await AsyncStorage.removeItem("game_sound_enabled");
              await AsyncStorage.removeItem("game_difficulty_preference");
              await AsyncStorage.removeItem("access_token");
              await AsyncStorage.removeItem("refresh_token");

              dispatch(resetTokens());

              showMessage({
                message: "Account and data deleted successfully! 🔄",
                type: "danger"
              });

              router.replace("/sign-up");
            } catch (error) {
              showMessage({
                message: "Failed to delete account",
                type: "danger"
              });
            }
          }
        }
      ]
    );
  };

  // Derive level info from live XP
  const levelInfo = getXPLevel(totalScore);

  const claimCoupon = async () => {
    if (totalScore < 1000) return;
    setSubmittingClaim(true);
    try {
      const generatedCode = "SHABDGYAN" + Math.floor(1000 + Math.random() * 9000);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { error } = await supabase
          .from("user_rewards")
          .insert({
            user_id: session.user.id,
            reward_type: "coupon_1k",
            reward_value: generatedCode
          });
        if (error && !error.message.includes("duplicate key")) {
          throw error;
        }
      }

      await AsyncStorage.setItem("reward_coupon_claimed", "true");
      await AsyncStorage.setItem("reward_coupon_code", generatedCode);

      setCouponClaimed(true);
      setCouponCodeVal(generatedCode);

      try {
        Clipboard.setString(generatedCode);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) { }

      showMessage({
        message: "Coupon Unlocked! 🎫",
        description: `Code ${generatedCode} copied to clipboard!`,
        type: "success",
      });
    } catch (e: any) {
      showMessage({
        message: "Claim failed",
        description: e.message,
        type: "danger",
      });
    } finally {
      setSubmittingClaim(false);
    }
  };

  const claimRecharge = async () => {
    if (totalScore < 50000) return;
    if (claimPhoneInput.trim().length < 10) {
      showMessage({
        message: "Invalid Phone Number ⚠️",
        description: "Please enter a valid 10-digit phone number first!",
        type: "warning",
      });
      return;
    }

    setSubmittingClaim(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { error } = await supabase
          .from("user_rewards")
          .insert({
            user_id: session.user.id,
            reward_type: "recharge_50k",
            reward_value: claimPhoneInput.trim()
          });
        if (error && !error.message.includes("duplicate key")) {
          throw error;
        }
      }

      await AsyncStorage.setItem("reward_recharge_claimed", "true");
      await AsyncStorage.setItem("reward_recharge_phone", claimPhoneInput.trim());

      setRechargeClaimed(true);
      setRechargePhoneVal(claimPhoneInput.trim());

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) { }

      showMessage({
        message: "Recharge Offer Unlocked! 📱",
        description: `Offer claimed for +91 ${claimPhoneInput.trim()}! Operator will process soon.`,
        type: "success",
      });
    } catch (e: any) {
      showMessage({
        message: "Claim failed",
        description: e.message,
        type: "danger",
      });
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#040E1C" : "#F8FAFC" }}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card with single flag background */}
        <View style={[styles.profileHeader, { backgroundColor: isDark ? "#05203B" : "#EEF2FF", borderColor }]}>
          {/* Overlay for readability */}
          <View
            style={[styles.flagOverlay, { backgroundColor: isDark ? "rgba(2, 14, 28, 0.42)" : "rgba(238,242,255,0.82)" }]}
            pointerEvents="none"
          />
          {/* Content */}
          <View style={styles.profileHeaderContent}>
            <View style={[styles.avatarBig, { borderColor: theme.colors.primary, backgroundColor: isDark ? "#05203B" : "#F1F5F9" }]}>
              <AvatarDisplay avatar={avatar} size={86} textStyle={styles.avatarEmoji} />
            </View>
            <Text style={[styles.nickname, { color: textColor }]}>{nickname}</Text>
            {/* Dynamic Level Badge */}
            <View style={styles.levelBadgeRow}>
              <View style={[styles.levelBadge, { backgroundColor: isDark ? "rgba(162,235,208,0.12)" : "rgba(51,96,214,0.1)", borderColor: isDark ? "rgba(162,235,208,0.25)" : "rgba(51,96,214,0.2)" }]}>
                <FontAwesome5 name="star" size={10} color={theme.colors.primary} solid />
                <Text style={[styles.levelBadgeText, { color: theme.colors.primary }]}>Level {levelInfo.level}</Text>
              </View>
              {joinedDate ? (
                <View style={[styles.levelBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }]}>
                  <Ionicons name="calendar-outline" size={10} color={subTextColor} />
                  <Text style={[styles.levelBadgeText, { color: subTextColor }]}>Joined {joinedDate}</Text>
                </View>
              ) : null}
              {countryFlag ? (
                <View style={[styles.levelBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }]}>
                  <Text style={{ fontSize: 11 }}>{countryFlag}</Text>
                  <Text style={[styles.levelBadgeText, { color: subTextColor }]}>{country}</Text>
                </View>
              ) : null}
            </View>
            {/* XP Progress Bar */}
            <View style={styles.xpBarWrap}>
              <View style={[styles.xpBarBg, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }]}>
                <View style={[styles.xpBarFill, { width: `${Math.round(levelInfo.progress * 100)}%` as any, backgroundColor: theme.colors.primary }]} />
              </View>
              <Text style={[styles.xpBarLabel, { color: subTextColor }]}>{totalScore} / {levelInfo.maxXp} XP</Text>
            </View>
          </View>
        </View>

        {/* Stats Summary Panel — 2x2 grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <FontAwesome5 name="coins" size={18} color="#EAB308" />
            <Text style={[styles.statVal, { color: textColor }]}>{totalScore}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Total XP</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <MaterialCommunityIcons name="fire" size={22} color="#EF4444" />
            <Text style={[styles.statVal, { color: textColor }]}>{currentStreak}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Streak 🔥</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
            <Text style={[styles.statVal, { color: textColor }]}>{maxStreak}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Best Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="checkmark-done-circle" size={22} color="#10B981" />
            <Text style={[styles.statVal, { color: textColor }]}>{solvedCount}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Solved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="game-controller-outline" size={20} color="#8B5CF6" />
            <Text style={[styles.statVal, { color: textColor }]}>{playedCount}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Played</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
            <MaterialCommunityIcons name="sword-cross" size={20} color="#3B82F6" />
            <Text style={[styles.statVal, { color: textColor }]}>{questEarned}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Quest XP</Text>
          </View>
        </View>

        {/* Game Preferences Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Game Preferences ⚙️</Text>
          <View style={[styles.preferenceList, { backgroundColor: cardBg, borderColor }]}>

            {/* Preference item: Sounds */}
            <View style={styles.preferenceRow}>
              <View style={styles.rowLabelGroup}>
                <Ionicons name="volume-high-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Sound Effects</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={handleToggleSound}
                trackColor={{ false: "#767577", true: isDark ? "#0A2D52" : "#93C5FD" }}
                thumbColor={soundEnabled ? theme.colors.primary : "#f4f3f4"}
              />
            </View>

            {/* Preference item: Language */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setLangModalVisible(true)}
              style={styles.preferenceRow}
            >
              <View style={styles.rowLabelGroup}>
                <Ionicons name="language-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Language</Text>
              </View>
              <View style={styles.rowRightGroup}>
                <Text style={[styles.valueText,{ color: isDark ? theme.colors.primary : theme.colors.black}]}>{langPreference}</Text>
                <Ionicons name="chevron-forward" size={16} color={subTextColor} />
              </View>
            </TouchableOpacity>

            {/* Preference item: Difficulty Selector */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDiffModalVisible(true)}
              style={styles.preferenceRow}
            >
              <View style={styles.rowLabelGroup}>
                <Ionicons name="speedometer-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Difficulty Level</Text>
              </View>
              <View style={styles.rowRightGroup}>
                <Text style={[styles.valueText,{ color: isDark ? theme.colors.primary : theme.colors.black}]}>{difficulty}</Text>
                <Ionicons name="chevron-forward" size={16} color={subTextColor} />
              </View>
            </TouchableOpacity>

            {/* Preference item: Feedback */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setFeedbackModalVisible(true)}
              style={styles.preferenceRow}
            >
              <View style={styles.rowLabelGroup}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Send Feedback</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={subTextColor} />
            </TouchableOpacity>

            {/* Preference item: Attempted Quizzes */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(authenticated)/attempted-quizzes")}
              style={[styles.preferenceRow, { borderBottomWidth: 0 }]}
            >
              <View style={styles.rowLabelGroup}>
                <Ionicons name="list-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Attempted Quizzes</Text>
              </View>
              <View style={styles.rowRightGroup}>
                <Text style={[styles.valueText, { color: theme.colors.primary }]}>View History</Text>
                <Ionicons name="chevron-forward" size={16} color={subTextColor} />
              </View>
            </TouchableOpacity>

          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Personal Information 👤</Text>
          <View style={[styles.preferenceList, { backgroundColor: cardBg, borderColor }]}>

            {/* Email */}
            <View style={styles.preferenceRow}>
              <View style={styles.rowLabelGroup}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Email</Text>
              </View>
              <Text style={[styles.valueText, { maxWidth: 180, color: isDark ? theme.colors.primary : theme.colors.black }]} numberOfLines={1} ellipsizeMode="tail">
                {email || "Not Set"}
              </Text>
            </View>

            {/* Country */}

            <View style={styles.preferenceRow}>
              <View style={styles.rowLabelGroup}>
                <Ionicons name="globe-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Country</Text>
              </View>
              <Text style={[styles.valueText,{ color: isDark ? theme.colors.primary : theme.colors.black}]}>{country || "Not Set"}</Text>
            </View>

            {/* Age */}
            <View style={styles.preferenceRow}>
              <View style={styles.rowLabelGroup}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Age</Text>
              </View>
              <Text style={[styles.valueText, { color: isDark ? theme.colors.primary : theme.colors.black}]}>{age ? `${age} Yrs` : "Not Set"}</Text>
            </View>

            {/* Gender */}
            <View style={[styles.preferenceRow, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLabelGroup}>
                <Ionicons
                  name={gender === "Male" ? "male-outline" : "female-outline"}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.preferenceText, { color: textColor }]}>Gender</Text>
              </View>
              <Text style={[styles.valueText, { color: isDark ? theme.colors.primary : theme.colors.black}]}>{gender || "Not Set"}</Text>
            </View>

          </View>
        </View>

        {/* Rewards Vault Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Rewards Vault 🎁</Text>
          <View style={[styles.preferenceList, { backgroundColor: cardBg, borderColor, paddingVertical: 10 }]}>

            {/* Reward 1: 1,000 XP Coupon */}
            <View style={[styles.rewardRow, { borderBottomColor: borderColor }]}>
              <View style={styles.rewardLeft}>
                <View style={[styles.rewardIconBox, { backgroundColor: "rgba(234, 179, 8, 0.1)" }]}>
                  <FontAwesome5 name="ticket-alt" size={16} color="#EAB308" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.rewardTitle, { color: textColor }]}>1,000 XP Special Coupon</Text>
                  <Text style={[styles.rewardDesc, { color: subTextColor }]}>
                    {couponClaimed ? `Claimed Code: ${couponCodeVal}` : "Get 10% discount on merchandise!"}
                  </Text>
                </View>
              </View>

              {couponClaimed ? (
                <View style={[styles.claimBadge, { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.2)" }]}>
                  <Text style={styles.claimBadgeTextClaimed}>Claimed</Text>
                </View>
              ) : totalScore >= 1000 ? (
                <TouchableOpacity
                  disabled={submittingClaim}
                  onPress={claimCoupon}
                  style={[styles.claimBtn, { backgroundColor: "#EAB308" }]}
                >
                  <Text style={styles.claimBtnText}>Claim</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.rewardLockedBox}>
                  <Ionicons name="lock-closed" size={14} color={subTextColor} />
                  <Text style={[styles.rewardLockedText, { color: subTextColor }]}>{totalScore}/1k XP</Text>
                </View>
              )}
            </View>

            {/* Reward 2: 50,000 XP Mobile Recharge */}
            <View style={[styles.rewardRow, { borderBottomWidth: 0, flexDirection: "column", alignItems: "stretch", height: "auto", paddingVertical: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={styles.rewardLeft}>
                  <View style={[styles.rewardIconBox, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                    <Ionicons name="phone-portrait" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.rewardTitle, { color: textColor }]}>50,000 XP Mobile Recharge</Text>
                    <Text style={[styles.rewardDesc, { color: subTextColor }]}>
                      {rechargeClaimed ? `Claimed for: +91 ${rechargePhoneVal}` : "Get free phone talktime/data recharge!"}
                    </Text>
                  </View>
                </View>

                {rechargeClaimed ? (
                  <View style={[styles.claimBadge, { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.2)" }]}>
                    <Text style={styles.claimBadgeTextClaimed}>Claimed</Text>
                  </View>
                ) : totalScore >= 50000 ? (
                  null
                ) : (
                  <View style={styles.rewardLockedBox}>
                    <Ionicons name="lock-closed" size={14} color={subTextColor} />
                    <Text style={[styles.rewardLockedText, { color: subTextColor }]}>{totalScore}/50k XP</Text>
                  </View>
                )}
              </View>

              {/* Input phone box if eligible and not claimed */}
              {!rechargeClaimed && totalScore >= 50000 && (
                <View style={styles.rechargeClaimForm}>
                  <TextInput
                    value={claimPhoneInput}
                    onChangeText={setClaimPhoneInput}
                    placeholder="Enter 10-digit Phone Number..."
                    placeholderTextColor={subTextColor}
                    keyboardType="numeric"
                    maxLength={10}
                    style={[styles.rechargeInput, { color: textColor, borderColor }]}
                  />
                  <TouchableOpacity
                    disabled={submittingClaim}
                    onPress={claimRecharge}
                    style={[styles.claimBtn, { backgroundColor: "#10B981", paddingHorizontal: 16 }]}
                  >
                    <Text style={styles.claimBtnText}>Submit Claim</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
        </View>

        {/* Account Management Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Account Settings 👤</Text>
          <View style={[styles.preferenceList, { backgroundColor: cardBg, borderColor }]}>

            {/* Account item: Manage Profile */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openEditModal}
              style={styles.preferenceRow}
            >
              <View style={styles.rowLabelGroup}>
                <Ionicons name="person-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.preferenceText, { color: textColor }]}>Manage Profile</Text>
              </View>
              <View style={styles.rowRightGroup}>
                <Text style={[styles.valueText,{ color: isDark ? theme.colors.primary : theme.colors.black}]}>Edit Profile</Text>
                <Ionicons name="chevron-forward" size={16} color={subTextColor} />
              </View>
            </TouchableOpacity>

            {/* Account item: Theme Toggle (Now Switch-based) */}
            <View style={[styles.preferenceRow, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLabelGroup}>
                <Ionicons
                  name={isDark ? "moon-outline" : "sunny-outline"}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.preferenceText, { color: textColor }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => setMode(isDark ? "light" : "dark")}
                trackColor={{ false: "#767577", true: isDark ? "#0A2D52" : "#93C5FD" }}
                thumbColor={isDark ? theme.colors.primary : "#f4f3f4"}
              />
            </View>

          </View>
        </View>

        {/* Action Buttons: Sign Out and Delete Account */}
        <View style={styles.actionsContainer}>
          {/* Sign Out Button (Neutral, non-destructive style) */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.signOutBtn, { borderColor }]}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color={textColor} />
            <Text style={[styles.actionText, { color: textColor }]}>
              Sign Out Account
            </Text>
          </TouchableOpacity>

          {/* Delete Account Button (Distinct, destructive warning style) */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={[styles.actionText, { color: "#FFFFFF" }]}>
              DELETE ACCOUNT (PERMANENT)
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Language Selection Modal */}
      <SelectionModal
        visible={langModalVisible}
        title="Select Language 🌐"
        subtitle="Choose your preferred game language"
        options={LANGUAGE_OPTIONS}
        selectedValue={langPreference}
        onSelect={(opt) => updateLanguage(opt.value)}
        onClose={() => setLangModalVisible(false)}
        accentColor={theme.colors.primary}
      />

      {/* Difficulty Selection Modal */}
      <SelectionModal
        visible={diffModalVisible}
        title="Choose Difficulty 🎯"
        subtitle="Select your preferred game difficulty level"
        options={DIFFICULTY_OPTIONS}
        selectedValue={difficulty}
        onSelect={(opt) => updateDifficulty(opt.value)}
        onClose={() => setDiffModalVisible(false)}
        accentColor={theme.colors.primary}
      />

      {/* MODAL 1: Edit Profile Overlay */}

      <Modal
        visible={manageModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#021A30" : "#FFFFFF" }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Manage Profile ✏️</Text>

            <Text style={[styles.modalSubtitle, { color: subTextColor }]}>Choose Avatar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.avatarRowScroll}
              contentContainerStyle={styles.avatarScrollContent}
            >
              {AVATARS.map((av) => {
                const isSelected = editAvatar === av.id;
                return (
                  <TouchableOpacity
                    key={av.id}
                    onPress={() => setEditAvatar(av.id)}
                    style={[
                      styles.avatarSelectBox,
                      isSelected && { borderColor: theme.colors.primary, borderWidth: 2.5 },
                    ]}
                  >
                    <Image source={av.image} style={{ width: 44, height: 44, borderRadius: 22, marginBottom: 4 }} />
                    <Text style={[styles.avatarSelectLabel, { color: isSelected ? theme.colors.primary : subTextColor }]}>
                      {av.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.modalSubtitle, { color: subTextColor }]}>Enter Player Name</Text>
            <TextInput
              style={[styles.modalInput, { color: textColor, borderColor }]}
              value={editNickname}
              onChangeText={setEditNickname}
              maxLength={15}
              placeholder="Nickname..."
              placeholderTextColor={subTextColor}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor }]}
                onPress={() => setManageModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveProfile}
              >
                <Text style={[styles.modalBtnText, { color: isDark ? "#021A30" : "#FFFFFF" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Feedback Overlay */}
      <Modal
        visible={feedbackModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#021A30" : "#FFFFFF" }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Send Feedback 📝</Text>
            <Text style={[styles.modalSubtitle, { color: subTextColor }]}>
              Your feedback is very valuable to us!
            </Text>

            <TextInput
              style={[styles.modalInputMultiline, { color: textColor, borderColor }]}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline={true}
              numberOfLines={4}
              placeholder="Type your feedback/suggestions here..."
              placeholderTextColor={subTextColor}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor }]}
                onPress={() => setFeedbackModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSendFeedback}
              >
                <Text style={[styles.modalBtnText, { color: isDark ? "#021A30" : "#FFFFFF" }]}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    // borderRadius: 20,
    // borderWidth: 1,
    marginBottom: 20,
    marginTop: 6,
    overflow: "hidden",
    position: "relative",
  },
  flagBgSingle: {
    position: "absolute",
    fontSize: 300,
    opacity: 0.28,
    zIndex: 0,
    top: -60,
    alignSelf: "center",
  },
  flagOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  profileHeaderContent: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  avatarBig: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  avatarEmoji: {
    fontSize: 48,
  },
  nicknameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 0,
  },
  nickname: {
    fontSize: 22,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "bold",
  },
  inlineFlag: {
    fontSize: 22,
    marginTop: 1,
  },

  levelBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  xpBarWrap: {
    width: "80%",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  xpBarBg: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  xpBarLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingHorizontal: 16,
  },
  statCard: {
    width: "31%",
    marginBottom: 10,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statVal: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "bold",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 1,
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "bold",
    marginBottom: 10,
  },
  chartWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
    opacity: 0.8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  preferenceList: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  rowLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  preferenceText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
  },
  rowRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  valueText: {
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  imageChartContainer: {
    flexDirection: "row",
    width: "100%",
    paddingTop: 24,
    paddingBottom: 24,
    paddingRight: 10,
    height: 175,
  },
  yAxisLabelsColumn: {
    width: 24,
    height: 115,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 6,
  },
  yAxisLabelText: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#718096",
    lineHeight: 10,
  },
  chartMainWrapper: {
    flex: 1,
    height: 115,
    position: "relative",
    borderLeftWidth: 1.5,
    borderLeftColor: "#A0AEC0",
    borderBottomWidth: 1.5,
    borderBottomColor: "#A0AEC0",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 0.5,
    borderColor: "#E2E8F0",
  },
  barsRowContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 115,
    width: "100%",
  },
  chartCol: {
    alignItems: "center",
    justifyContent: "flex-end",
    width: 32,
    position: "relative",
  },
  chartValTextBlue: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1E88E5",
    position: "absolute",
    top: -16,
    width: 32,
    textAlign: "center",
  },
  barBackground: {
    width: 22,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFillBlue: {
    width: "100%",
    backgroundColor: "#1E88E5",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chartColLabel: {
    position: "absolute",
    bottom: -20,
    fontSize: 9,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#718096",
  },
  actionsContainer: {
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  signOutBtn: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  deleteBtn: {
    backgroundColor: "#DC2626", // Solid crimson red
  },
  actionText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    fontFamily: "PlusJakartaSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  avatarRowScroll: {
    marginBottom: 18,
  },
  avatarScrollContent: {
    paddingRight: 10,
    gap: 10,
  },
  avatarSelectBox: {
    width: 60,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  avatarSelectEmoji: {
    fontSize: 28,
  },
  avatarSelectLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginTop: 4,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    marginBottom: 20,
  },
  modalInputMultiline: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    height: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  saveBtn: {
    // Background colored primary
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  rewardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 64,
    borderBottomWidth: 1,
  },
  rewardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rewardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rewardTitle: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "600",
  },
  rewardDesc: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
  },
  claimBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  claimBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  claimBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  claimBadgeTextClaimed: {
    color: "#10B981",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "bold",
  },
  rewardLockedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rewardLockedText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  rechargeClaimForm: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    width: "100%",
  },
  rechargeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
});
