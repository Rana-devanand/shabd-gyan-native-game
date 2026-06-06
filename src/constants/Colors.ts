/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


import {
  DefaultTheme,
  DarkTheme,
  Theme as NavigationTheme,
} from "@react-navigation/native";
import { Colors, createTheme, Theme as RNEUITheme, Theme } from "@rneui/themed";

export const createNavigationThemes = (
  theme: {
    colors: Colors;
} & Theme
): { MyLightTheme: NavigationTheme; MyDarkTheme: NavigationTheme } => {
  const MyLightTheme: NavigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.white,
      text: theme.colors.black,
      border: theme.colors.greyOutline,
      notification: theme.colors.error,
    },
  };

  const MyDarkTheme: NavigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.black,
      text: theme.colors.white,
      border: theme.colors.greyOutline,
      notification: theme.colors.error,
    },
  };

  return { MyLightTheme, MyDarkTheme };
};


export const AppTheme = createTheme({
  mode: "dark",
  lightColors: {
    primary: "#3360D6", // blue-600
    secondary: "#7c3aed", // violet-600
    background: "#EEF2FF", // pale indigo-blue
    white: "#ffffff",
    black: "#111827", // gray-900
    grey0: "#E9E9E9",
    grey1: "#f3f4f6",
    grey2: "#e5e7eb",
    grey3: "#d1d5db",
    grey4: "#9ca3af",
    grey5: "#6b7280",
    greyOutline: "#d1d5db",
    searchBg: "#f3f4f6",
    success: "#16a34a", // green-600
    warning: "#d97706", // amber-600
    error: "#dc2626",   // red-600
    disabled: "#9ca3af",
    divider: "#e5e7eb",
    platform: {
      ios: {
        primary: "#0a84ff",
        secondary: "#5e5ce6",
        grey: "#8e8e93",
        searchBg: "#f2f2f7",
        success: "#34c759",
        error: "#ff3b30",
        warning: "#ff9500",
      },
      android: {
        primary: "#3ddc84",
        secondary: "#6200ee",
        grey: "#9e9e9e",
        searchBg: "#f6f6f6",
        success: "#388e3c",
        error: "#d32f2f",
        warning: "#fbc02d",
      },
      web: {
        primary: "#2563eb",
        secondary: "#7c3aed",
        grey: "#6b7280",
        searchBg: "#f9fafb",
        success: "#16a34a",
        error: "#dc2626",
        warning: "#d97706",
      },
      default: {
        primary: "#2563eb",
        secondary: "#7c3aed",
        grey: "#9ca3af",
        searchBg: "#f3f4f6",
        success: "#16a34a",
        error: "#dc2626",
        warning: "#d97706",
      },
    },
  },
  darkColors: {
    primary: "#A2EBD0", // Mint Green accent
    secondary: "#8AB4D4", // Light blue-grey for secondary labels
    background: "#021A30", // Deep Navy background
    white: "#FFFFFF",
    black: "#021A30",
    grey0: "#05203B", // Dark blue card background
    grey1: "#072C50", // Lighter navy for borders
    grey2: "#1A365D",
    grey3: "#2D3748",
    grey4: "#718096",
    grey5: "#8AB4D4",
    greyOutline: "#072C50",
    searchBg: "#05203B",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    disabled: "#1A365D",
    divider: "#072C50",
    platform: {
      ios: {
        primary: "#A2EBD0",
        secondary: "#8AB4D4",
        grey: "#8AB4D4",
        searchBg: "#05203B",
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      android: {
        primary: "#A2EBD0",
        secondary: "#8AB4D4",
        grey: "#8AB4D4",
        searchBg: "#05203B",
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      web: {
        primary: "#A2EBD0",
        secondary: "#8AB4D4",
        grey: "#8AB4D4",
        searchBg: "#05203B",
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      default: {
        primary: "#A2EBD0",
        secondary: "#8AB4D4",
        grey: "#8AB4D4",
        searchBg: "#05203B",
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
      },
    },
  },
});

export const CustomLightTheme = DefaultTheme;
export const CustomDarkTheme = DarkTheme;