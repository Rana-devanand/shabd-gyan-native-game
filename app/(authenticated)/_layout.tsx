import { Stack } from "expo-router";
import React from "react";

export default function AuthenticatedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="difficulty" options={{ headerShown: false }} />
      <Stack.Screen name="play" options={{ headerShown: false }} />
      <Stack.Screen name="quests/daily-warrior" options={{ headerShown: false }} />
      <Stack.Screen name="quests/decipher-scroll" options={{ headerShown: false }} />
      <Stack.Screen name="quests/high-score-hunt" options={{ headerShown: false }} />
      <Stack.Screen name="quests/story-play" options={{ headerShown: false }} />
      <Stack.Screen name="attempted-quizzes" options={{ headerShown: false }} />
    </Stack>
  );
}
