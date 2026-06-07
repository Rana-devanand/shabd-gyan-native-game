import { AppTheme } from "@/src/constants/Colors";
import { Image } from "expo-image";
import React from "react";
import {
  ImageBackground,
  ScrollView,
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AuthWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const AuthWrapper = ({ children, title, subtitle }: AuthWrapperProps) => {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require("@/assets/images/adaptive-icon.png")}
      style={styles.background}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              <View style={styles.headerBackground}>
                {/* <Image
                  source={require("@/assets/images/png/app-name.png")}
                  style={styles.headerImage}
                  resizeMode="contain"
                /> */}
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {children}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default AuthWrapper;

const styles = StyleSheet.create({
  background: { flexGrow: 1 },
  scrollViewContent: {
    justifyContent: "center",
    minHeight: "100%",
  },
  container: { padding: 24, width: "100%", height: "100%" },
  headerBackground: {
    justifyContent: "center",
    alignItems: "center",
    height: 60,
  },
  headerImage: {
    position: "absolute",
    top: Platform.OS === "android" ? 120 : 40,
    height: 40,
    width: "100%",
  },

  title: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: AppTheme.darkColors?.black,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme.lightColors?.grey5,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
});
