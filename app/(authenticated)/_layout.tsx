import { Stack } from "expo-router";
import React from "react";

export default function AuthenticatedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="difficulty" options={{ headerShown: false }} />
      <Stack.Screen name="play" options={{ headerShown: false }} />
    </Stack>
  );
}
