import { AppTheme } from "@/src/constants/Colors";
import RootNavigation from "@/src/navigation/RootNavigation";
import SplashScreen from "@/src/screens/Splash";
import { store } from "@/src/store/store";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import FlashMessage from "react-native-flash-message";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { ThemeProvider, useThemeMode } from "@rneui/themed";
import Toast from 'react-native-toast-message';
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';

import React, { useState } from "react";
import { Platform, StatusBar as RNStatusBar } from "react-native";
import { LocalizationProvider } from "@/src/context/LocalizationContext";
import { MusicProvider } from "@/src/context/MusicContext";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "Duplet-semibold": require("@/assets/fonts/Duplet-Semibold.otf"),
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold
  });

const [splashDone, setSplashDone] = useState(false);

if (!loaded || !splashDone) {
  return <SplashScreen onAnimationComplete={() => setSplashDone(true)} />;
}

const showStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const items = await AsyncStorage.multiGet(keys);
  // console.log("AsyncStorage Values:", items);
  // AsyncStorage.clear();
};
showStorage();


return (
  <SafeAreaProvider>
    <Provider store={store}>
      <ThemeProvider theme={AppTheme}>
        <LocalizationProvider>
          <AppContent />
        </LocalizationProvider>
      </ThemeProvider>
    </Provider>
    <FlashMessage
      position="top"
      statusBarHeight={Platform.OS === "android" ? RNStatusBar.currentHeight : undefined}
    />
  </SafeAreaProvider>
);
}

function AppContent() {
  const { mode } = useThemeMode();
  return (
    <MusicProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"} translucent={true} />
      <RootNavigation />
      <Toast />
    </MusicProvider>
  );
}
