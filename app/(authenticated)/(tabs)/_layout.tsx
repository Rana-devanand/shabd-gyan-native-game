import { HapticTab } from '@/src/components/HapticTab';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, useThemeMode } from '@rneui/themed';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { mode } = useThemeMode();
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.grey5,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: mode === 'dark' ? theme.colors.grey0 : theme.colors.white,
          borderTopColor: theme.colors.grey1,
          borderTopWidth: 0.5,
          ...Platform.select({
            ios: { position: 'absolute' },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="quest"
        options={{
          title: 'Quest',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="sword-cross" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="story"
        options={{
          title: 'Kahani',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="script-text-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Podium',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
