/**
 * src/components/auth/OtpVerifySignup.tsx
 *
 * Verify the 6-digit OTP sent to the user's email.
 * On success: session is established → route to ProfileSetup or Dashboard.
 */

import AnimatedGradientBackground from "./AnimatedGradientBackground";
import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StatusBar,
  Animated,
} from "react-native";
import { OtpInput } from "react-native-otp-entry";
import { useLocalSearchParams, useRouter } from "expo-router";
import { showMessage } from "react-native-flash-message";
import { supabase } from "@/src/Supabase/client";
import { useAppDispatch } from "@/src/store/store";
import { setTokens } from "@/src/store/actions/authActions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

const PROFILE_SETUP_ROUTE = "/profile-setup" as any;

export default function OtpVerifySignup() {
  const { email, type } = useLocalSearchParams<{ email: string; type?: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Subtle entrance animation
  const slideUp = useRef(new Animated.Value(30)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleVerify = async (code?: string) => {
    const token = code ?? otp;
    if (token.length < 6) {
      showMessage({ message: "Please enter the full 6-digit code.", type: "warning" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email?.trim().toLowerCase() ?? "",
        token,
        type: (type === "signup" ? "signup" : "email") as any,
      });
      if (error) throw error;

      if (data.session) {
        dispatch(setTokens({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          user: data.user!,
        }));

        // Check if profile is already set up
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user!.id)
          .maybeSingle();

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

        showMessage({
          message: profile?.nickname ? "Welcome back! 🎮" : "Account verified! Let's set up your profile 🎉",
          type: "success",
          duration: 2500,
        });

        router.replace(profile?.nickname && profile?.language ? "/(authenticated)/(tabs)" : PROFILE_SETUP_ROUTE);
      }
    } catch (err: any) {
      showMessage({ message: err.message || "Invalid or expired OTP.", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      let error;
      if (type === "signup") {
        const res = await supabase.auth.resend({
          type: "signup",
          email: email?.trim().toLowerCase() ?? "",
        });
        error = res.error;
      } else {
        const res = await supabase.auth.signInWithOtp({
          email: email?.trim().toLowerCase() ?? "",
          options: { shouldCreateUser: true },
        });
        error = res.error;
      }
      if (error) throw error;
      setCountdown(30);
      showMessage({ message: "New OTP sent! Check your email 📧", type: "success" });
    } catch (err: any) {
      showMessage({ message: err.message || "Failed to resend OTP.", type: "danger" });
    } finally {
      setResending(false);
    }
  };

  return (
    <AnimatedGradientBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.root, { paddingTop: insets.top }]}>

        {/* Back button */}
        <TouchableOpacity
          style={[styles.backBtn, { marginTop: 8 }]}
          onPress={() => router.back()}
          activeOpacity={0.9}
          focusable={false}
        >
          <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        <Animated.View style={[styles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Text style={styles.iconEmoji}>📬</Text>
          </View>

          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a <Text style={styles.emailHighlight}>6-digit code</Text> to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* OTP Entry */}
          <View style={styles.otpWrap}>
            <OtpInput
              numberOfDigits={6}
              focusColor="#FF8C00"
              onTextChange={setOtp}
              onFilled={handleVerify}
              theme={{
                containerStyle: styles.otpContainer,
                pinCodeContainerStyle: styles.otpBox,
                pinCodeTextStyle: styles.otpText,
                focusedPinCodeContainerStyle: styles.otpBoxFocused,
              }}
            />
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.cta, (loading || otp.length < 6) && styles.ctaDisabled]}
            onPress={() => handleVerify()}
            disabled={loading || otp.length < 6}
            activeOpacity={0.9}
            focusable={false}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Verify & Continue →</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={countdown > 0 || resending}
              activeOpacity={0.9}
              focusable={false}
            >
              {resending ? (
                <ActivityIndicator size="small" color="#FF8C00" />
              ) : countdown > 0 ? (
                <Text style={styles.resendCooldown}>Resend in {countdown}s</Text>
              ) : (
                <Text style={styles.resendLink}>Resend Code</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.secureNote}>
            🔒 Secure, passwordless login
          </Text>

        </Animated.View>
      </View>
    </AnimatedGradientBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 26,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  emailHighlight: {
    color: "#FF8C00",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  otpWrap: {
    width: "100%",
    marginBottom: 32,
  },
  otpContainer: {
    gap: 10,
  },
  otpBox: {
    width: 50,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  otpBoxFocused: {
    borderColor: "#FF8C00",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  otpText: {
    fontSize: 24,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#FFFFFF",
  },
  cta: {
    width: "100%",
    backgroundColor: "#FF8C00",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF8C00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 24,
    borderWidth: 0,
    borderColor: "transparent",
  },
  ctaDisabled: {
    backgroundColor: "rgba(255,255,255,0.2)",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  resendLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "PlusJakartaSans_400Regular",
  },
  resendLink: {
    fontSize: 14,
    color: "#FF8C00",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  resendCooldown: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "PlusJakartaSans_400Regular",
  },
  secureNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "PlusJakartaSans_400Regular",
  },
});
