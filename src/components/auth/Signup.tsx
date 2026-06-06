import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { showMessage } from "react-native-flash-message";
import { useAppDispatch } from "@/src/store/store";
import { setTokens } from "@/src/store/actions/authActions";
import { ImageBackground } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

const AVATARS = [
  { emoji: "🧔🏽‍♂️", label: "Bhaiya" },
  { emoji: "👩🏽‍🦱", label: "Didi" },
  { emoji: "🦁", label: "Sher" },
  { emoji: "🦚", label: "Peacock" },
  { emoji: "🏏", label: "Cricketer" },
  { emoji: "☕", label: "Chai Lover" },
  { emoji: "🥻", label: "Desi Queen" },
  { emoji: "🦊", label: "Lomdi" },
  { emoji: "🎨", label: "Artist" },
  { emoji: "🚀", label: "Rider" }
];

export default function Signup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].emoji);

  const handleStart = async () => {
    if (nickname.trim().length < 2) {
      showMessage({
        message: "Please enter a nickname (at least 2 letters)",
        type: "warning",
      });
      return;
    }

    try {
      // Save locally
      await AsyncStorage.setItem("user_nickname", nickname.trim());
      await AsyncStorage.setItem("user_avatar", selectedAvatar);
      
      // Save mock tokens for auto-login on future launches
      const token = "shabdgyan_player";
      await AsyncStorage.setItem("access_token", token);
      await AsyncStorage.setItem("refresh_token", token);

      // Dispatch to Redux to trigger login
      dispatch(setTokens({ accessToken: token, refreshToken: token }));

      showMessage({
        message: `Welcome to ShabdKhel, ${nickname}! 🎉`,
        type: "success",
        duration: 3000,
      });

      // Redirect to main tabs
      router.replace("/(authenticated)/(tabs)");
    } catch (error) {
      console.error("Signup bypass error:", error);
      showMessage({
        message: "Something went wrong. Please try again.",
        type: "danger",
      });
    }
  };

  return (
    <ImageBackground
      source={require("@/assets/images/png/mainBg.png")}
      style={styles.background}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>SHABD KHEL</Text>
              <Text style={styles.subtitle}>Clue padho, Word banao!</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Choose your Avatar</Text>
              <View style={styles.avatarGrid}>
                {AVATARS.map((item) => {
                  const isSelected = selectedAvatar === item.emoji;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => setSelectedAvatar(item.emoji)}
                      style={[
                        styles.avatarWrapper,
                        isSelected && styles.avatarSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.avatarEmoji}>{item.emoji}</Text>
                      <Text
                        style={[
                          styles.avatarLabel,
                          isSelected && styles.avatarLabelSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.cardTitle}>Enter Nickname</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. WordNinja ⚡"
                placeholderTextColor="#A0AEC0"
                value={nickname}
                onChangeText={setNickname}
                maxLength={15}
                autoCorrect={false}
              />

              <TouchableOpacity
                onPress={handleStart}
                style={[
                  styles.startButton,
                  nickname.trim().length < 2 && styles.startButtonDisabled,
                ]}
                disabled={nickname.trim().length < 2}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Chalo Shuru Karein! 🚀</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontFamily: "Duplet-semibold",
    fontWeight: "bold",
    color: "#1A202C",
    letterSpacing: 2,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#4A5568",
    marginTop: 8,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#2D3748",
    marginBottom: 16,
    marginTop: 8,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  avatarWrapper: {
    width: "18%",
    alignItems: "center",
    marginBottom: 16,
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#F7FAFC",
  },
  avatarSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2F6",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  avatarLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#718096",
  },
  avatarLabelSelected: {
    color: "#4F46E5",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  input: {
    backgroundColor: "#F7FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#2D3748",
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: "#A5B4FC",
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontWeight: "bold",
  },
});
