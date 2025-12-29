import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const headerBackgroundColor = Colors[colorScheme ?? 'light'].background;
  const headerTextColor = Colors[colorScheme ?? 'light'].text;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: true,
        headerStyle: {
          backgroundColor: headerBackgroundColor,
        },
        headerTintColor: headerTextColor,
        headerTitleStyle: {
          color: headerTextColor,
        },
        tabBarStyle: {
          paddingTop: 5,
          backgroundColor: "#25292e",
          ...(Platform.OS === 'web'
            ? {
                height: 64,
                paddingBottom: 8,
              }
            : {}),
        },
        tabBarLabelPosition: Platform.OS === 'web' ? 'below-icon' : undefined,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Guide",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="photo"
        options={{
          title: "Photo",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="camera.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
