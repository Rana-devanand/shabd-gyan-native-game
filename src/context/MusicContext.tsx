import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Audio } from "expo-av";
import { useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type MusicType = "whole_app" | "quiz" | "none";

interface MusicContextProps {
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => Promise<void>;
  currentTrack: MusicType;
  refreshSoundSettings: () => Promise<void>;
}

const MusicContext = createContext<MusicContextProps | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const segments = useSegments();
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<MusicType>("none");

  // Keep a reference to the active sound object to avoid conflicts and memory leaks
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Load user preference
  const loadSoundPreference = async () => {
    try {
      const storedSound = await AsyncStorage.getItem("game_sound_enabled");
      if (storedSound !== null) {
        setSoundEnabledState(storedSound === "true");
      } else {
        // Default to true if not set
        setSoundEnabledState(true);
      }
    } catch (e) {
      console.warn("[MusicProvider] Failed to load sound preference:", e);
    }
  };

  useEffect(() => {
    loadSoundPreference();
    
    // Configure expo audio mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false, // Don't play when user exits app completely
      shouldRouteThroughEarpieceAndroid: false,
    }).catch(err => console.warn("[MusicProvider] Error setting audio mode:", err));

    return () => {
      // Cleanup sound on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Update sound settings function exposed to components
  const setSoundEnabled = async (value: boolean) => {
    setSoundEnabledState(value);
    try {
      await AsyncStorage.setItem("game_sound_enabled", value ? "true" : "false");
    } catch (e) {
      console.warn("[MusicProvider] Failed to save sound preference:", e);
    }
  };

  const refreshSoundSettings = async () => {
    await loadSoundPreference();
  };

  // Determine what track should be playing based on segments
  const determineDesiredTrack = (): MusicType => {
    if (segments && segments.includes("play")) {
      return "quiz";
    }
    return "whole_app";
  };

  const desiredTrack = determineDesiredTrack();

  // Load and play track
  const playTrack = async (track: MusicType) => {
    try {
      // Stop and unload existing sound if it is running
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {}
        soundRef.current = null;
        isPlayingRef.current = false;
      }

      if (track === "none") {
        setCurrentTrack("none");
        return;
      }

      const source =
        track === "quiz"
          ? require("../../assets/game_music/quiz_music.mp3")
          : require("../../assets/game_music/whole_app_music.mp3");

      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: true,
          isLooping: true,
          volume: track === "quiz" ? 0.35 : 0.45, // softer for gameplay
        }
      );

      soundRef.current = sound;
      isPlayingRef.current = true;
      setCurrentTrack(track);
    } catch (error) {
      console.warn(`[MusicProvider] Error playing track ${track}:`, error);
    }
  };

  const stopTrack = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
      isPlayingRef.current = false;
    }
    setCurrentTrack("none");
  };

  // Control music playing based on preference & desired track
  useEffect(() => {
    if (!soundEnabled) {
      stopTrack();
    } else {
      if (desiredTrack !== currentTrack) {
        playTrack(desiredTrack);
      }
    }
  }, [soundEnabled, desiredTrack, currentTrack]);

  // Handle app lifecycle changes (pause on background, resume on foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App goes to background
        if (soundRef.current && isPlayingRef.current) {
          try {
            await soundRef.current.pauseAsync();
          } catch (e) {}
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        // App comes to foreground
        if (soundEnabled && soundRef.current) {
          try {
            await soundRef.current.playAsync();
          } catch (e) {}
        } else if (soundEnabled && !soundRef.current) {
          // Play again if it was unloaded or missed
          playTrack(determineDesiredTrack());
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [soundEnabled, currentTrack]);

  return (
    <MusicContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        currentTrack,
        refreshSoundSettings,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};
