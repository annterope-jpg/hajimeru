import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import { createDefaultUserPreferences, type UserPreferences } from '@/domain';
import { exportAndShare } from '@/services/export';
import {
  cancelAllStartCues,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/services/notifications';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const defaults = createDefaultUserPreferences();

export default function SettingsScreen() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaults);
  const setAccessibilityShell = useAppStore((state) => state.setAccessibilityShell);
  const resetOnboarding = useAppStore((state) => state.resetOnboarding);
  const clearShellData = useAppStore((state) => state.clearShellData);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getLocalRepository()
        .getPreferences()
        .then((stored) => {
          if (active && stored) setPreferences(stored);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function update(patch: Partial<UserPreferences>) {
    const next = { ...preferences, ...patch, updatedAt: new Date().toISOString() };
    setPreferences(next);
    await getLocalRepository().savePreferences(next);
  }

  async function updateAccessibility(
    patch: Partial<UserPreferences['accessibility']>,
  ) {
    const accessibility = { ...preferences.accessibility, ...patch };
    await update({ accessibility });
    await setAccessibilityShell({
      largeText: accessibility.largeText,
      reduceMotion: accessibility.reduceMotion,
      screenReaderOptimized: accessibility.screenReaderOptimized,
    });
  }

  async function toggleNotifications(value: boolean) {
    if (value) {
      const existing = await getNotificationPermission();
      const status = existing === 'granted' ? existing : await requestNotificationPermission();
      if (status !== 'granted') {
        Alert.alert('通知は有効になりませんでした', 'コア機能は通知なしでも利用できます。');
        return;
      }
    }
    if (!value) await cancelAllStartCues();
    await update({ notificationsEnabled: value });
  }

  function confirmClearLocal() {
    Alert.alert(
      '端末内の記録を削除しますか？',
      '開始記録、今日の状態、設定がこの端末から削除されます。この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            void Promise.all([
              getLocalRepository().clearAll(),
              clearShellData(),
              cancelAllStartCues(),
            ]).then(() => {
              setPreferences(defaults);
              Alert.alert('削除しました', '端末内の記録と設定、予定通知を削除しました。', [
                { text: 'OK', onPress: () => router.replace('/onboarding') },
              ]);
            });
          },
        },
      ],
    );
  }

  return (
    <Screen testID="settings-screen">
      <AppText color={colors.inkMuted} style={styles.lead}>
        同意は機能ごとに選べます。AI・通知・同期を使わなくても、開始支援は利用できます。
      </AppText>

      <AppText variant="label" color={colors.inkMuted} style={styles.sectionLabel}>
        任意機能
      </AppText>
      <Card style={styles.group}>
        <ToggleRow
          title="ローカル通知"
          description="開始の合図を端末内で知らせる"
          value={preferences.notificationsEnabled}
          onChange={(value) => void toggleNotifications(value)}
        />
        <Divider />
        <ToggleRow
          title="AI提案への同意"
          description="タスク文・分類・最大2つのボトルネックだけを送る"
          value={preferences.aiConsentGranted}
          onChange={(aiConsentGranted) => void update({ aiConsentGranted })}
        />
        <Divider />
        <NavigationRow
          title="任意の暗号化同期"
          description="メールでサインインして機種変更に備える"
          onPress={() => router.push('/sync')}
        />
      </Card>

      <AppText variant="label" color={colors.inkMuted} style={styles.sectionLabel}>
        読みやすさ
      </AppText>
      <Card style={styles.group}>
        <ToggleRow
          title="文字を大きくする"
          description="アプリ内の基本文字サイズを上げる"
          value={preferences.accessibility.largeText}
          onChange={(largeText) => void updateAccessibility({ largeText })}
        />
        <Divider />
        <ToggleRow
          title="動きを減らす"
          description="画面切り替えのアニメーションを抑える"
          value={preferences.accessibility.reduceMotion}
          onChange={(reduceMotion) => void updateAccessibility({ reduceMotion })}
        />
        <Divider />
        <ToggleRow
          title="読み上げを優先"
          description="スクリーンリーダー向けの説明を優先する"
          value={preferences.accessibility.screenReaderOptimized}
          onChange={(screenReaderOptimized) => void updateAccessibility({ screenReaderOptimized })}
        />
      </Card>

      <AppText variant="label" color={colors.inkMuted} style={styles.sectionLabel}>
        自分のデータ
      </AppText>
      <Card style={styles.group}>
        <NavigationRow
          title="JSONで書き出す"
          description="すべての記録を機械可読形式で共有"
          onPress={() => void exportAndShare(getLocalRepository(), 'json')}
        />
        <Divider />
        <NavigationRow
          title="CSVで書き出す"
          description="表計算ソフトで確認できる形式で共有"
          onPress={() => void exportAndShare(getLocalRepository(), 'csv')}
        />
        <Divider />
        <NavigationRow
          title="端末内の記録を削除"
          description="明示的な確認後にすべて削除"
          danger
          onPress={confirmClearLocal}
        />
      </Card>

      <AppText variant="label" color={colors.inkMuted} style={styles.sectionLabel}>
        情報
      </AppText>
      <Card style={styles.group}>
        <NavigationRow title="このアプリについて・相談先" onPress={() => router.push('/help')} />
        <Divider />
        <NavigationRow title="プライバシー" onPress={() => router.push('/privacy')} />
        <Divider />
        <NavigationRow
          title="初回説明をもう一度見る"
          onPress={() => void resetOnboarding().then(() => router.replace('/onboarding'))}
        />
      </Card>
      <AppText variant="caption" color={colors.inkMuted} style={styles.version}>
        はじめる 試作版 0.1.0
      </AppText>
    </Screen>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          {description}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : '#909992'}
      />
    </View>
  );
}

function NavigationRow({
  title,
  description,
  danger,
  onPress,
}: {
  title: string;
  description?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.rowCopy}>
        <AppText variant="label" color={danger ? colors.danger : colors.ink}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" color={colors.inkMuted}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={danger ? colors.danger : colors.inkMuted} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  lead: { marginBottom: spacing.xl },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  group: { padding: 0, overflow: 'hidden', borderRadius: radii.md, gap: 0 },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowCopy: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: spacing.lg },
  version: { textAlign: 'center', marginTop: spacing.xxl },
});
