/**
 * src/components/auth/Login.tsx
 *
 * Email + Password login.
 * Clean light grey (#F4F6F8) background — no animated circles.
 */

import AnimatedGradientBackground from "./AnimatedGradientBackground";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { showMessage } from "react-native-flash-message";
import { useAppDispatch } from "@/src/store/store";
import { setTokens } from "@/src/store/actions/authActions";
import { supabase } from "@/src/Supabase/client";
import { Feather, AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PROFILE_SETUP_ROUTE = "/profile-setup" as any;

export default function Login() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passsFocused, setPassFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB });
  }, []);

  const routeAfterLogin = async (userId: string, profileData?: any) => {
    const profile = profileData ?? (await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle()).data;
    if (profile) {
      if (profile.language) {
        await AsyncStorage.setItem("game_language", profile.language);
        await AsyncStorage.setItem("game_language_selected", "true");
      }
      if (profile.nickname) {
        await AsyncStorage.setItem("user_nickname", profile.nickname);
      }
      if (profile.avatar) {
        await AsyncStorage.setItem("user_avatar", profile.avatar);
      }
      if (profile.country) {
        await AsyncStorage.setItem("user_country", profile.country);
      }
      if (profile.age !== undefined && profile.age !== null) {
        await AsyncStorage.setItem("user_age", String(profile.age));
      }
      if (profile.gender) {
        await AsyncStorage.setItem("user_gender", profile.gender);
      }
      if (profile.sound_enabled !== undefined && profile.sound_enabled !== null) {
        await AsyncStorage.setItem("game_sound_enabled", String(profile.sound_enabled));
      }
      if (profile.difficulty_preference) {
        await AsyncStorage.setItem("game_difficulty_preference", profile.difficulty_preference);
      }
      if (profile.score !== undefined && profile.score !== null) {
        await AsyncStorage.setItem("shabdgyan_score", String(profile.score));
      }
      if (profile.streak !== undefined && profile.streak !== null) {
        await AsyncStorage.setItem("shabdgyan_streak", String(profile.streak));
      }
      if (profile.max_streak !== undefined && profile.max_streak !== null) {
        await AsyncStorage.setItem("shabdgyan_max_streak", String(profile.max_streak));
      }
    }
    router.replace(profile?.nickname && profile?.language ? "/(authenticated)/(tabs)" : PROFILE_SETUP_ROUTE);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showMessage({ message: "Email and password are required!", type: "warning" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      if (data.session) {
        dispatch(setTokens({ accessToken: data.session.access_token, refreshToken: data.session.refresh_token, user: data.user }));
        showMessage({ message: "Welcome Back! 🎮", type: "success", duration: 2000 });
        await routeAfterLogin(data.user.id);
      }
    } catch (err: any) {
      showMessage({ message: err.message || "Login failed. Please check credentials.", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try { await GoogleSignin.signOut(); } catch (_) { }
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error("No ID Token from Google.");
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
      if (error) throw error;
      if (data.session) {
        dispatch(setTokens({ accessToken: data.session.access_token, refreshToken: data.session.refresh_token, user: data.user }));
        await routeAfterLogin(data.user.id);
      }
    } catch (err: any) {
      showMessage({ message: err.message || "Google sign-in failed.", type: "danger" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AnimatedGradientBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── Brand ─────────────────────────────────────────────────────── */}
            <View style={styles.brand}>
              <Text style={styles.appName}>
                Word<Text style={styles.appNameX}>W</Text>ala
              </Text>
              <Text style={styles.tagline}>Read Clue, Make Word! 🧩</Text>
            </View>

            {/* ── Card ─────────────────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome Back! 🎮</Text>
              <Text style={styles.cardSubtitle}>Sign in to continue your streak.</Text>

              {/* Email */}
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
                <Feather name="mail" size={18} color={emailFocused ? "#3FA8AA" : "rgba(0, 0, 0, 0.5)"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@email.com"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>

              {/* Password */}
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, passsFocused && styles.inputRowFocused]}>
                <Feather name="lock" size={18} color={passsFocused ? "#3FA8AA" : "rgba(0, 0, 0, 0.5)"} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                  focusable={false}
                >
                  <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="rgba(0, 0, 0, 0.5)" />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => router.push("/forgot-password")}
                activeOpacity={0.9}
                focusable={false}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Login CTA */}
              <TouchableOpacity
                style={[styles.cta, loading && styles.ctaDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                focusable={false}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Log In</Text>}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.9}
                focusable={false}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#374151" />
                ) : (
                  <>
                    <AntDesign name="google" size={20} color="#EA4335" style={styles.socialIcon} />
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Link to sign-up */}
              <View style={styles.linkRow}>
                <Text style={styles.linkLabel}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.push("/sign-up")}
                  activeOpacity={0.9}
                  focusable={false}
                >
                  <Text style={styles.link}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </AnimatedGradientBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 40,
  },
  brand: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.38)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoLetter: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    fontFamily: "Duplet-semibold",
  },
  appName: {
    fontSize: 36,
    fontWeight: "900",
    fontFamily: "Duplet-semibold",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  appNameX: {
    color: "#FF8C00",
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "PlusJakartaSans_400Regular",
    marginTop: 6,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "rgba(255,255,255,0.72)",
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    height: 54,
  },
  inputRowFocused: {
    borderColor: "#3FA8AA",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#111827",
  },
  eyeBtn: {
    padding: 6,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: -6,
  },
  forgotText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  cta: {
    backgroundColor: "#FF8C00",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF8C00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0,
    borderColor: "transparent",
  },
  ctaDisabled: {
    backgroundColor: "rgba(255,255,255,0.3)",
    shadowOpacity: 0,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "PlusJakartaSans_400Regular",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 14,
    height: 54,
    marginBottom: 4,
  },
  socialIcon: {
    marginRight: 10,
  },
  googleText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#374151",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  linkLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "PlusJakartaSans_400Regular",
  },
  link: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
