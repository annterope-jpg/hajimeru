import { router, Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '@/state/useAppStore';
import { getLocalRepository } from '@/data';
import { AppText } from '@/components/AppText';
import { colors } from '@/theme/colors';
import {
  configureNotificationPresentation,
  getInitialNotificationUrl,
  subscribeToNotificationUrls,
} from '@/services/notifications';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  const initializeShell = useAppStore((state) => state.initializeShell);
  const reduceMotion = useAppStore((state) => state.reduceMotion);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    void initializeShell();
    void getLocalRepository().initialize().catch(() => setStorageError(true));
    void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduceMotion);
    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduceMotion,
    );
    return () => motionSubscription.remove();
  }, [initializeShell]);

  useEffect(() => {
    void configureNotificationPresentation();
    let unsubscribeNotification: () => void = () => {};
    const handleAppUrl = (url: string) => {
      const parsed = Linking.parse(url);
      if (parsed.path === 'plan') {
        const attemptId = parsed.queryParams?.attemptId;
        if (typeof attemptId === 'string') {
          router.push({ pathname: '/plan', params: { attemptId } });
        }
        return;
      }
    };
    void getInitialNotificationUrl().then((url) => url && handleAppUrl(url));
    void subscribeToNotificationUrls(handleAppUrl).then((unsubscribe) => {
      unsubscribeNotification = unsubscribe;
    });
    return () => {
      unsubscribeNotification();
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [hydrated]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (storageError) {
    return (
      <SafeAreaProvider>
        <View style={styles.storageError}>
          <AppText variant="title">端末への保存を開始できませんでした</AppText>
          <AppText>
            記録が消える状態で続行しないため、アプリを停止しています。端末の空き容量を確認して、アプリを再起動してください。
          </AppText>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.canvas },
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.canvas },
            headerBackTitle: '戻る',
            animation: reduceMotion || systemReduceMotion ? 'none' : 'slide_from_right',
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="check-in" options={{ title: '今日の状態' }} />
          <Stack.Screen name="assessment" options={{ title: '開始の準備' }} />
          <Stack.Screen name="plan" options={{ title: '最初の一歩' }} />
          <Stack.Screen name="roadmap" options={{ title: '大きな課題の見通し' }} />
          <Stack.Screen name="timer" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="reflection" options={{ title: 'やってみた記録', gestureEnabled: false }} />
          <Stack.Screen name="help" options={{ title: 'このアプリについて' }} />
          <Stack.Screen name="sync" options={{ title: '任意の同期' }} />
          <Stack.Screen name="privacy" options={{ title: 'プライバシー' }} />
          <Stack.Screen name="auth/callback" options={{ title: 'サインイン' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  storageError: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    padding: 28,
    backgroundColor: colors.canvas,
  },
});
