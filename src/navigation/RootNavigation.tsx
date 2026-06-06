import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { resetTokens, setTokens } from "../store/actions/authActions";
import { useAppDispatch, useAppSelector } from "../store/store";
import { createNavigationThemes } from "../constants/Colors";
import { useTheme, useThemeMode } from "@rneui/themed";
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const RootNavigation = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { mode } = useThemeMode();
  const { theme } = useTheme();

  const { MyLightTheme, MyDarkTheme } = createNavigationThemes(theme);
  const navigationTheme = mode === "dark" ? MyDarkTheme : MyLightTheme;

  const { accessToken } = useAppSelector((state) => state.auth);
  const isAuthenticated = !!accessToken;
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const nickname = await AsyncStorage.getItem("user_nickname");
        const onboarding = await AsyncStorage.getItem("onboarding_done");
        const isOnboardingDone = !!onboarding;
        
        if (nickname) {
          // Auto-authenticate with mock tokens
          const token = "shabdgyan_player";
          dispatch(setTokens({ accessToken: token, refreshToken: token }));
          router.replace("/(authenticated)/(tabs)");
        } else {
          dispatch(resetTokens());
          if (isOnboardingDone) {
            router.replace("/sign-up");
          } else {
            router.replace("/onBoarding");
          }
        }
      } catch (err) {
        console.log("Auth check error:", err);
      }
    };

    checkAuth();
  }, [dispatch]);

  return (
    <NavigationThemeProvider
      value={mode === "dark" ? MyDarkTheme : MyLightTheme}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
        <Stack
          // screenOptions={{
          //   headerStyle: {
          //     backgroundColor: navigationTheme.colors.background,
          //   },
          //   headerTintColor: navigationTheme.colors.text,
          //   headerTitleStyle: {
          //     fontWeight: "400",
          //   },
          // }}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen
              name="(authenticated)"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen
              name="/login"
              options={{ headerShown: false, headerTitle: "Login" }}
            />
            <Stack.Screen name="/sign-up" options={{ headerShown: false }} />
            <Stack.Screen
              name="/forgot-password"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
        </Stack>
      </SafeAreaView>
    </NavigationThemeProvider>
  );
};

export default RootNavigation;
