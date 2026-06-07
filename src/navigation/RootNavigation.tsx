import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { resetTokens, setTokens, setUser } from "../store/actions/authActions";
import { useAppDispatch, useAppSelector } from "../store/store";
import { createNavigationThemes } from "../constants/Colors";
import { useTheme, useThemeMode } from "@rneui/themed";
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { supabase } from "../Supabase/client";
import { View } from "react-native";


const PROFILE_SETUP_ROUTE = "/profile-setup" as any;

const RootNavigation = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { mode } = useThemeMode();
  const { theme } = useTheme();

  const { MyLightTheme, MyDarkTheme } = createNavigationThemes(theme);
  const { accessToken } = useAppSelector((state) => state.auth);
  const isAuthenticated = !!accessToken;

  const routeSignedOutUser = useCallback(async () => {
    const onboarding = await AsyncStorage.getItem("onboarding_done");
    router.replace(onboarding ? "/sign-up" : "/onBoarding");
  }, [router]);

  const routeSignedInUser = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    console.log("[RootNavigation] routeSignedInUser profile:", profile, "error:", error);

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

    if (!profile?.nickname || !profile?.language) {
      // New user — go through profile setup wizard (avatar + username + language)
      router.replace(PROFILE_SETUP_ROUTE);
    } else {
      // Returning user with complete profile — go straight to dashboard
      router.replace("/(authenticated)/(tabs)");
    }
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          dispatch(
            setTokens({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
              user: session.user,
            })
          );
          await routeSignedInUser(session.user.id);
        } else {
          dispatch(resetTokens());
          await routeSignedOutUser();
        }
      } catch (err) {
        console.log("Auth check error:", err);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        dispatch(resetTokens());
        routeSignedOutUser();
        return;
      }

      dispatch(
        setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          user: session.user,
        })
      );
      dispatch(setUser(session.user));
      routeSignedInUser(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [dispatch, routeSignedInUser, routeSignedOutUser]);

  return (
    <NavigationThemeProvider
      value={mode === "dark" ? MyDarkTheme : MyLightTheme}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
          {isAuthenticated ? (
            <>
              <Stack.Screen
                name="(authenticated)"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
              <Stack.Screen name="language-select" options={{ headerShown: false }} />
            </>
          ) : (
            <>
              <Stack.Screen
                name="login"
                options={{ headerShown: false, headerTitle: "Login" }}
              />
              <Stack.Screen name="sign-up" options={{ headerShown: false }} />
              <Stack.Screen name="otp-verify-signup" options={{ headerShown: false }} />
              <Stack.Screen
                name="forgot-password"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="onBoarding" options={{ headerShown: false }} />
            </>
          )}
        </Stack>
      </View>
    </NavigationThemeProvider>
  );
};

export default RootNavigation;
