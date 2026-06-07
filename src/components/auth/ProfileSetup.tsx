/**
 * src/components/auth/ProfileSetup.tsx
 *
 * 2-Step profile setup wizard (Light Mode Theme):
 *   Step 1 — Choose Avatar (Boy/Girl local images) + Nickname + Age (implicit Gender auto-selected)
 *   Step 2 — Select Country first, then select Language from that Country.
 *
 * After both steps complete → routes to dashboard.
 *
 * Stores all preferences locally and in Supabase profiles.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { showMessage } from "react-native-flash-message";
import { supabase } from "@/src/Supabase/client";
import { useAppDispatch } from "@/src/store/store";
import { setTokens } from "@/src/store/actions/authActions";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COUNTRIES_DATA from "../../constants/countries.json";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Brand Tokens (Light Mode Aesthetics) ──────────────────────────────────────
const BG_COLOR = "#F4F6F8";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#4B5563";
const TEXT_LIGHT = "#9CA3AF";
const CARD_BG = "#FFFFFF";
const BORDER_COLOR = "#E5E7EB";
const PRIMARY = "#0D6E75"; // Vibrant teal for light background
const PRIMARY_10 = "rgba(13,110,117,0.08)";
const PRIMARY_30 = "rgba(13,110,117,0.25)";
const ORANGE = "#FF8C00";
const WHITE = "#FFFFFF";

// Local avatars from assets/avatar
const BOY_IMAGE = require("../../../assets/avatar/boy.jpg");
const GIRL_IMAGE = require("../../../assets/avatar/girl.jpg");

const AVATARS = [
  { id: "boy", image: BOY_IMAGE, label: "Boy", gender: "Male" },
  { id: "girl", image: GIRL_IMAGE, label: "Girl", gender: "Female" },
];

export default function ProfileSetup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  // Step state (1 or 2)
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [nicknameFocused, setNicknameFocused] = useState(false);
  const [ageFocused, setAgeFocused] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Step 2 state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto gender calculation
  const gender = selectedAvatar === "boy" ? "Male" : "Female";

  // Animations
  const previewScale = useRef(new Animated.Value(1)).current;
  const stepSlideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0.5)).current;
  const langFadeAnim = useRef(new Animated.Value(0)).current;
  const langSlideAnim = useRef(new Animated.Value(20)).current;

  // Filter countries based on search
  const filteredCountries = COUNTRIES_DATA.filter((country: any) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: step === 1 ? 0.5 : 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const goToStep2 = () => {
    // Slide current screen out to the left
    Animated.timing(stepSlideAnim, {
      toValue: -SCREEN_WIDTH,
      duration: 320,
      useNativeDriver: true,
    }).start(() => {
      setStep(2);
      stepSlideAnim.setValue(SCREEN_WIDTH);
      Animated.timing(stepSlideAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start();
    });
  };

  const goBackToStep1 = () => {
    Animated.timing(stepSlideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setStep(1);
      stepSlideAnim.setValue(-SCREEN_WIDTH);
      Animated.timing(stepSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const onAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    Animated.sequence([
      Animated.timing(previewScale, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.spring(previewScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const handleCountrySelect = (country: any) => {
    setSelectedCountry(country);
    setSelectedLanguage("");
    setSearchQuery("");

    // Animate languages list in
    langFadeAnim.setValue(0);
    langSlideAnim.setValue(15);
    Animated.parallel([
      Animated.timing(langFadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(langSlideAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  const handleFinish = async () => {
    if (nickname.trim().length < 2) {
      showMessage({ message: "Please enter a nickname (at least 2 letters)", type: "warning" });
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      showMessage({ message: "Please enter a valid age", type: "warning" });
      return;
    }
    if (!selectedCountry) {
      showMessage({ message: "Please select a country", type: "warning" });
      return;
    }
    if (!selectedLanguage) {
      showMessage({ message: "Please select a language", type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Save profile (nickname + avatar)
      const { error } = await supabase.rpc("create_profile", {
        user_id: user.id,
        p_nickname: nickname.trim(),
        p_avatar: selectedAvatar,
      });
      if (error) throw error;

      // Save language, country, age, gender
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          language: selectedLanguage,
          country: selectedCountry.name,
          age: ageNum,
          gender: gender,
        })
        .eq("id", user.id);
      if (updateError) throw updateError;

      // Store in local storage
      await AsyncStorage.setItem("game_language", selectedLanguage);
      await AsyncStorage.setItem("game_language_selected", "true");
      await AsyncStorage.setItem("user_country", selectedCountry.name);
      await AsyncStorage.setItem("user_age", age);
      await AsyncStorage.setItem("user_gender", gender);
      await AsyncStorage.setItem("user_nickname", nickname.trim());
      await AsyncStorage.setItem("user_avatar", selectedAvatar);

      // Clear game cache to refresh content
      await AsyncStorage.removeItem("groq_shabd_puzzle");
      await AsyncStorage.removeItem("groq_paheli_puzzle");

      // Refresh session tokens in Redux
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        dispatch(setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          user: session.user,
        }));
      }

      showMessage({
        message: `Welcome, ${nickname.trim()}! Let's play! 🎉`,
        type: "success",
        duration: 3000,
      });

      router.replace("/(authenticated)/(tabs)");
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to save profile. Please try again.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 1 Validation
  const parsedAge = parseInt(age, 10);
  const isAgeValid = !isNaN(parsedAge) && parsedAge >= 1 && parsedAge <= 120;
  const isStep1Ready = nickname.trim().length >= 2 && isAgeValid;

  // Step 2 Validation
  const isStep2Ready = selectedCountry !== null && selectedLanguage !== "";

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const selectedAvatarObj = AVATARS.find((av) => av.id === selectedAvatar);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* ── Top progress bar ───────────────────────────────────────────── */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* ── Header row ────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        {step === 2 ? (
          <TouchableOpacity
            onPress={goBackToStep1}
            style={styles.backBtn}
            activeOpacity={0.9}
            focusable={false}
          >
            <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.stepPillWrap}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>Step {step} of 2</Text>
          </View>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* ── Sliding content area ───────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.contentArea,
          { transform: [{ translateX: stepSlideAnim }] },
        ]}
      >
        {step === 1 ? (
          /* ────────────── STEP 1 ────────────── */
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Avatar preview */}
              <View style={styles.centeredHeader}>
                <Animated.View
                  style={[styles.previewRing, { transform: [{ scale: previewScale }] }]}
                >
                  {selectedAvatarObj && (
                    <Image source={selectedAvatarObj.image} style={styles.previewImage} />
                  )}
                </Animated.View>
                <Text style={styles.stepTitle}>Create Your Identity</Text>
                <Text style={styles.stepSubtitle}>
                  Choose an avatar, enter your name and age to begin.
                </Text>
              </View>

              {/* Avatar selection (No boxes, clean circles side-by-side) */}
              <Text style={styles.sectionLabel}>Choose Avatar</Text>
              <View style={styles.avatarSelectionRow}>
                {AVATARS.map((item) => {
                  const active = selectedAvatar === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => onAvatarSelect(item.id)}
                      activeOpacity={0.9}
                      focusable={false}
                      style={styles.avatarSelectContainer}
                    >
                      <View style={[
                        styles.avatarCircle,
                        active && styles.avatarCircleActive
                      ]}>
                        <Image source={item.image} style={styles.avatarCircleImage} />
                        {active && (
                          <View style={styles.avatarCheckBadge}>
                            <Ionicons name="checkmark" size={12} color={WHITE} />
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.avatarCircleLabel,
                        active && styles.avatarCircleLabelActive
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Auto selected gender field */}
              <Text style={styles.sectionLabel}>Gender</Text>
              <View style={styles.genderChipContainer}>
                <View style={styles.genderChip}>
                  <Ionicons
                    name={gender === "Male" ? "male" : "female"}
                    size={16}
                    color={PRIMARY}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.genderChipText}>
                    {gender}
                  </Text>
                </View>
              </View>

              {/* Nickname input */}
              <Text style={styles.sectionLabel}>Your Nickname</Text>
              <View style={[styles.inputBox, nicknameFocused && styles.inputBoxFocused]}>
                <Feather
                  name="user"
                  size={18}
                  color={nicknameFocused ? PRIMARY : TEXT_LIGHT}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. WordNinja ⚡"
                  placeholderTextColor={TEXT_LIGHT}
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={15}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onFocus={() => {
                    setNicknameFocused(true);
                    setTimeout(() => {
                      scrollRef.current?.scrollTo(0);
                    }, 100);
                  }}
                  onBlur={() => setNicknameFocused(false)}
                />
                {nickname.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setNickname("")}
                    activeOpacity={0.9}
                    focusable={false}
                  >
                    <Feather name="x-circle" size={16} color={TEXT_LIGHT} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputMeta}>
                <Text style={styles.inputHint}>Min 2 characters · No spaces</Text>
                <Text style={[styles.charCount, nickname.length >= 13 && { color: ORANGE }]}>
                  {nickname.length}/15
                </Text>
              </View>

              {/* Age input */}
              <Text style={styles.sectionLabel}>Your Age</Text>
              <View style={[styles.inputBox, ageFocused && styles.inputBoxFocused]}>
                <Feather
                  name="calendar"
                  size={18}
                  color={ageFocused ? PRIMARY : TEXT_LIGHT}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 21"
                  placeholderTextColor={TEXT_LIGHT}
                  value={age}
                  onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ""))}
                  maxLength={3}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onFocus={() => {
                    setAgeFocused(true);
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                  onBlur={() => setAgeFocused(false)}
                />
                {age.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setAge("")}
                    activeOpacity={0.9}
                    focusable={false}
                  >
                    <Feather name="x-circle" size={16} color={TEXT_LIGHT} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputMeta}>
                <Text style={styles.inputHint}>Enter your age in years</Text>
              </View>

              <View style={{ height: insets.bottom + 250 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          /* ────────────── STEP 2 ────────────── */
          <View style={{ flex: 1, paddingHorizontal: 22 }}>
            <View style={styles.step2Header}>
              <Text style={styles.stepTitle}>Select Region & Language</Text>
              <Text style={styles.stepSubtitle}>
                Select your country and choose your preferred gaming language!
              </Text>
            </View>

            {selectedCountry === null ? (
              /* --- Step 2a: Select Country --- */
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Search Country</Text>
                <View style={[styles.searchBox, searchQuery.length > 0 && styles.searchBoxActive]}>
                  <Feather name="search" size={18} color={PRIMARY} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Search country..."
                    placeholderTextColor={TEXT_LIGHT}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery("")}
                      activeOpacity={0.9}
                      focusable={false}
                    >
                      <Feather name="x-circle" size={16} color={TEXT_LIGHT} />
                    </TouchableOpacity>
                  )}
                </View>

                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  style={{ marginTop: 12 }}
                  contentContainerStyle={{ paddingBottom: 120 }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      focusable={false}
                      onPress={() => handleCountrySelect(item)}
                      style={styles.countryItem}
                    >
                      <View style={styles.countryLeft}>
                        <Text style={styles.countryFlag}>{item.flag}</Text>
                        <Text style={styles.countryName}>{item.name}</Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={TEXT_LIGHT} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyView}>
                      <Feather name="alert-circle" size={24} color={TEXT_LIGHT} />
                      <Text style={styles.emptyText}>No countries match your search</Text>
                    </View>
                  }
                />
              </View>
            ) : (
              /* --- Step 2b: Select Language based on Country --- */
              <Animated.View
                style={{
                  flex: 1,
                  opacity: langFadeAnim,
                  transform: [{ translateY: langSlideAnim }],
                }}
              >
                {/* Selected Country Card */}
                <View style={styles.selectedCountryCard}>
                  <View style={styles.selectedCountryLeft}>
                    <Text style={styles.selectedCountryFlag}>{selectedCountry.flag}</Text>
                    <View>
                      <Text style={styles.selectedCountryLabel}>Selected Country</Text>
                      <Text style={styles.selectedCountryName}>{selectedCountry.name}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedCountry(null)}
                    style={styles.changeCountryBtn}
                    activeOpacity={0.9}
                    focusable={false}
                  >
                    <Text style={styles.changeCountryText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Select Language Spoken</Text>
                <FlatList
                  data={selectedCountry.languages}
                  keyExtractor={(item) => item.code}
                  contentContainerStyle={styles.langList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = selectedLanguage === item.name;
                    return (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        focusable={false}
                        onPress={() => setSelectedLanguage(item.name)}
                        style={[styles.langItem, isSelected && styles.langItemActive]}
                      >
                        <View style={styles.langLeft}>
                          <View style={[styles.langBullet, isSelected && { borderColor: WHITE, backgroundColor: PRIMARY }]}>
                            <Text style={[styles.langBulletText, isSelected && { color: WHITE }]}>
                              {item.name.substring(0, 1)}
                            </Text>
                          </View>
                          <Text style={[styles.langName, isSelected && styles.langNameActive]}>
                            {item.name}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.checkCircle}>
                            <Ionicons name="checkmark" size={14} color={WHITE} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </Animated.View>
            )}
          </View>
        )}
      </Animated.View>

      {/* ── Sticky CTA footer ─────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24 }]}>
        {step === 1 ? (
          <TouchableOpacity
            onPress={goToStep2}
            disabled={!isStep1Ready}
            activeOpacity={0.9}
            focusable={false}
            style={[styles.cta, !isStep1Ready && styles.ctaDisabled]}
          >
            <Text style={[styles.ctaText, !isStep1Ready && { color: TEXT_LIGHT }]}>Continue</Text>
            <Feather name="arrow-right" size={18} color={isStep1Ready ? WHITE : TEXT_LIGHT} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleFinish}
            disabled={loading || !isStep2Ready}
            activeOpacity={0.9}
            focusable={false}
            style={[styles.cta, !isStep2Ready && styles.ctaDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Text style={[styles.ctaText, !isStep2Ready && { color: TEXT_LIGHT }]}>
                  Enter the Arena 🚀
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },

  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 24,
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 2,
  },

  // Header row
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillWrap: {
    alignItems: "center",
  },
  stepPill: {
    backgroundColor: PRIMARY_10,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: PRIMARY_30,
  },
  stepPillText: {
    color: PRIMARY,
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.4,
  },

  // Sliding content
  contentArea: {
    flex: 1,
  },

  // ─── Step 1 ─────────────────────────────────────────────────────────────────
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  centeredHeader: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  previewRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: "Duplet-semibold",
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  stepSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: PRIMARY,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 10,
  },

  // Avatar Selection Row (Circles)
  avatarSelectionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 20,
    marginTop: 10,
  },
  avatarSelectContainer: {
    alignItems: "center",
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "transparent",
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircleActive: {
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarCircleImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  avatarCheckBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: PRIMARY,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  avatarCircleLabel: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: TEXT_MUTED,
  },
  avatarCircleLabelActive: {
    color: PRIMARY,
    fontFamily: "PlusJakartaSans_700Bold",
  },

  // Gender selection field
  genderChipContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  genderChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_10,
    borderWidth: 1,
    borderColor: PRIMARY_30,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  genderChipText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: PRIMARY,
  },

  // Nickname & Age input
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 2,
    height: 54,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  inputBoxFocused: {
    borderColor: PRIMARY,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_500Medium",
    color: TEXT_DARK,
    paddingVertical: 0,
  },
  inputMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  inputHint: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  charCount: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontFamily: "PlusJakartaSans_400Regular",
  },

  // ─── Step 2 ─────────────────────────────────────────────────────────────────
  step2Header: {
    paddingTop: 12,
    paddingBottom: 14,
    alignItems: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBoxActive: {
    borderColor: PRIMARY,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  countryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: TEXT_DARK,
  },
  emptyView: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontFamily: "PlusJakartaSans_500Medium",
  },

  // Dynamic Step 2b Spoken Languages List
  selectedCountryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: PRIMARY_30,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCountryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedCountryFlag: {
    fontSize: 32,
  },
  selectedCountryLabel: {
    fontSize: 10,
    color: TEXT_LIGHT,
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.8,
  },
  selectedCountryName: {
    fontSize: 16,
    color: TEXT_DARK,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  changeCountryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_10,
    borderWidth: 1,
    borderColor: PRIMARY_30,
  },
  changeCountryText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: PRIMARY,
  },
  langList: {
    gap: 10,
    paddingBottom: 120,
    marginTop: 8,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  langItemActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  langLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  langBullet: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PRIMARY_10,
    alignItems: "center",
    justifyContent: "center",
  },
  langBulletText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    color: PRIMARY,
  },
  langName: {
    fontSize: 15,
    color: TEXT_DARK,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  langNameActive: {
    color: WHITE,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── CTA Footer ─────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: "transparent",
  },
  cta: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0,
    borderColor: "transparent",
  },
  ctaDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: WHITE,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.3,
  },
});
