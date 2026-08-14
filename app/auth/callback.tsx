import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { completeMagicLink, getSupabaseClient } from '@/services/sync';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!url) return;
    const client = getSupabaseClient();
    if (!client) {
      queueMicrotask(() => setError('同期環境が設定されていません。'));
      return;
    }
    let active = true;
    void completeMagicLink(client, url)
      .then((completed) => {
        if (!active) return;
        if (completed) router.replace('/sync');
        else setError('このサインインリンクを確認できませんでした。');
      })
      .catch(() => {
        if (active) setError('サインインを完了できませんでした。リンクをもう一度送信してください。');
      });
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <Screen scroll={false} contentStyle={styles.center}>
      {error ? (
        <Card tone="amber" style={styles.card}>
          <AppText variant="heading">サインインを完了できませんでした</AppText>
          <AppText color={colors.inkMuted}>{error}</AppText>
          <AppButton label="同期画面へ戻る" onPress={() => router.replace('/sync')} />
        </Card>
      ) : (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <AppText>サインインを確認しています</AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  loading: { alignItems: 'center', gap: spacing.md },
  card: { gap: spacing.md },
});
