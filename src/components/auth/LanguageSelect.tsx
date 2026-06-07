/**
 * src/components/auth/LanguageSelect.tsx
 *
 * Smooth animated regional language selection screen.
 * - Flat white premium theme.
 * - Lists regional Indian languages with native scripts.
 * - Animates options in sequentially with slide-and-fade transitions.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@rneui/themed";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showMessage } from "react-native-flash-message";
import { supabase } from "@/src/Supabase/client";

const { width } = Dimensions.get("window");

const LANGUAGES = [
  { code: "Hinglish", name: "Hinglish", native: "हिन्दी + English", icon: "🇮🇳" },
  { code: "English", name: "English", native: "English Only", icon: "🇬🇧" },
  { code: "Hindi", name: "Hindi", native: "हिन्दी", icon: "🇮🇳" },
  { code: "Bengali", name: "Bengali", native: "বাংলা", icon: "🇮🇳" },
  { code: "Tamil", name: "Tamil", native: "தமிழ்", icon: "🇮🇳" },
  { code: "Telugu", name: "Telugu", native: "తెలుగు", icon: "🇮🇳" },
  { code: "Marathi", name: "Marathi", native: "मराठी", icon: "🇮🇳" },
  { code: "Gujarati", name: "Gujarati", native: "ગુજરાતી", icon: "🇮🇳" },
  { code: "Kannada", name: "Kannada", native: "ಕನ್ನಡ", icon: "🇮🇳" },
  { code: "Punjabi", name: "Punjabi", native: "ਪੰਜਾਬੀ", icon: "🇮🇳" },
  { code: "Malayalam", name: "Malayalam", native: "മലയാളം", icon: "🇮🇳" },
];

export default function LanguageSelect() {
  const router = useRouter();
  const { fromProfile } = useLocalSearchParams<{ fromProfile?: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedLanguage, setSelectedLanguage] = useState("Hinglish");
  const [saving, setSaving] = useState(false);

  // Animated values for sequential item slide-ins
  const fadeAnims = useRef(LANGUAGES.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(LANGUAGES.map(() => new Animated.Value(30))).current;

  useEffect(() => {
    // Load pre-existing selection if any
    const loadLang = async () => {
      const stored = await AsyncStorage.getItem("game_language");
      if (stored) {
        setSelectedLanguage(stored);
      }
    };
    loadLang();

    // Trigger sequential fade-and-slide entry animations
    const animations = LANGUAGES.map((_, index) => {
      return Animated.parallel([
        Animated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnims[index], {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(60, animations).start();
  }, []);

  const handleSaveLanguage = async () => {
    setSaving(true);
    try {
      // 1. Cache locally in AsyncStorage
      await AsyncStorage.setItem("game_language", selectedLanguage);
      await AsyncStorage.setItem("game_language_selected", "true");

      // 2. Clear cached Groq puzzles so they regenerate in the correct language
      await AsyncStorage.removeItem("groq_shabd_puzzle");
      await AsyncStorage.removeItem("groq_paheli_puzzle");

      // 3. Save to Supabase profile if logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ language: selectedLanguage })
          .eq("id", user.id);
      }

      showMessage({
        message: `Language updated to ${selectedLanguage}! 🌐`,
        type: "success",
        duration: 2000,
      });

      // Navigate back or to tabs
      if (fromProfile === "true") {
        router.replace("/(authenticated)/(tabs)/profile");
      } else {
        router.replace("/(authenticated)/(tabs)");
      }
    } catch (err: any) {
      showMessage({
        message: err.message || "Failed to update language.",
        type: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item, index }: { item: typeof LANGUAGES[0]; index: number }) => {
    const isSelected = selectedLanguage === item.code;

    return (
      <Animated.View
        style={{
          opacity: fadeAnims[index],
          transform: [{ translateY: slideAnims[index] }],
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedLanguage(item.code)}
          style={[
            styles.langItem,
            isSelected && {
              borderColor: theme.colors.primary,
              backgroundColor: "#EEF2FF",
            },
          ]}
        >
          <View style={styles.langLeft}>
            <Text style={styles.langIcon}>{item.icon}</Text>
            <View style={styles.langTextContainer}>
              <Text style={[styles.langName, isSelected && { color: theme.colors.primary, fontWeight: "bold" }]}>
                {item.name}
              </Text>
              <Text style={styles.langNative}>{item.native}</Text>
            </View>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {fromProfile === "true" && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace("/(authenticated)/(tabs)/profile")}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Select Your Language</Text>
        <Text style={styles.subtitle}>
          Choose your local language. We will generate words and Paheli clues in this language!
        </Text>
      </View>

      <FlatList
        data={LANGUAGES}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSaveLanguage}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Chalo Shuru Karein! 🚀</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: 26,
    fontFamily: "Duplet-semibold",
    fontWeight: "bold",
    color: "#111827",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#4B5563",
    marginTop: 8,
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  langLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  langIcon: {
    fontSize: 24,
  },
  langTextContainer: {
    justifyContent: "center",
  },
  langName: {
    fontSize: 16,
    color: "#111827",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  langNative: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "PlusJakartaSans_400Regular",
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 14,
  },
  saveBtn: {
    backgroundColor: "#3360D6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3360D6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
