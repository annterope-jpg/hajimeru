import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors } from '@/theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icons: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'footsteps', inactive: 'footsteps-outline' },
  learn: { active: 'compass', inactive: 'compass-outline' },
  insights: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          minHeight: 66,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', paddingBottom: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const entry = icons[route.name] ?? { active: 'footsteps', inactive: 'footsteps-outline' };
          return <Ionicons name={focused ? entry.active : entry.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'はじめる', headerShown: false }} />
      <Tabs.Screen name="learn" options={{ title: 'しくみ', headerTitle: '動けないときのしくみ' }} />
      <Tabs.Screen name="insights" options={{ title: 'ふりかえり' }} />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  );
}
