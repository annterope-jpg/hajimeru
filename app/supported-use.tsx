import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import {
  SUPPORTED_USE_END_POINTS,
  SUPPORTED_USE_END_POINT_COPY,
  SUPPORTED_USE_FOCI,
  SUPPORTED_USE_FOCUS_COPY,
  createSupportedUseSession,
  getSupportedUseStartRoute,
  type SupportedUseEndPoint,
  type SupportedUseFocus,
} from '@/domain';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function SupportedUseScreen() {
  const activeSession = useAppStore((state) => state.supportedUseSession);
  const startSupportedUse = useAppStore((state) => state.startSupportedUse);
  const endSupportedUse = useAppStore((state) => state.endSupportedUse);
  const [focus, setFocus] = useState<SupportedUseFocus>();
  const [endPoint, setEndPoint] = useState<SupportedUseEndPoint>();
  const [consented, setConsented] = useState(false);

  function start() {
    if (!focus || !endPoint || !consented) return;
    startSupportedUse(createSupportedUseSession(focus, endPoint, new Date().toISOString()));
    router.replace(getSupportedUseStartRoute(focus));
  }

  if (activeSession) {
    return (
      <Screen
        testID="supported-use-active"
        footer={<AppButton label="一緒に見るモードを終了" variant="secondary" onPress={() => { endSupportedUse(); router.replace('/(tabs)'); }} />}
      >
        <AppText variant="caption" color={colors.primary}>本人の端末だけで有効</AppText>
        <AppText variant="title" style={styles.title}>一緒に見るモードです</AppText>
        <Card tone="green" style={styles.card}>
          <Detail label="今日の焦点" value={SUPPORTED_USE_FOCUS_COPY[activeSession.focus].label} />
          <Detail label="終了の目安" value={SUPPORTED_USE_END_POINT_COPY[activeSession.endPoint].label} />
        </Card>
        <AppText color={colors.inkMuted}>
          支援者へデータは送信されていません。画面上部の「終了」から、いつでも単独利用へ戻れます。
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen
      testID="supported-use-setup"
      footer={
        <AppButton
          testID="supported-use-start"
          label="一緒に見るモードを始める"
          disabled={!focus || !endPoint || !consented}
          onPress={start}
        />
      }
    >
      <AppText variant="caption" color={colors.primary}>本人が開始・終了します</AppText>
      <AppText variant="title" style={styles.title}>今日は、どこを一緒に見ますか？</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        近くにいる支援者と同じ画面を見るための一時的なモードです。支援者用アカウントや自動共有はありません。
      </AppText>

      <AppText variant="heading" style={styles.sectionTitle}>今日の焦点を1つ</AppText>
      <ChoiceChips
        accessibilityLabel="一緒に見る今日の焦点"
        value={focus}
        onChange={setFocus}
        choices={SUPPORTED_USE_FOCI.map((value) => ({ value, ...SUPPORTED_USE_FOCUS_COPY[value] }))}
      />

      <AppText variant="heading" style={styles.sectionTitle}>どこまで一緒に見るか</AppText>
      <ChoiceChips
        accessibilityLabel="一緒に見る終了の目安"
        value={endPoint}
        onChange={setEndPoint}
        choices={SUPPORTED_USE_END_POINTS.map((value) => ({ value, ...SUPPORTED_USE_END_POINT_COPY[value] }))}
      />

      <Card tone="blue" style={styles.notice}>
        <AppText variant="label">このモードで起きないこと</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          支援者への送信、支援者による回答の上書き、AI・通知・同期の自動ONは行いません。終了の目安より前でも閉じられます。
        </AppText>
      </Card>

      <Pressable
        testID="supported-use-consent"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consented }}
        accessibilityLabel="今、一緒に画面を見ることを選びます"
        onPress={() => setConsented((value) => !value)}
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, consented && styles.checkboxChecked]}>
          {consented ? <Ionicons name="checkmark" color={colors.white} size={18} /> : null}
        </View>
        <View style={styles.checkboxCopy}>
          <AppText variant="label">今、一緒に画面を見ることを選びます</AppText>
          <AppText variant="caption" color={colors.inkMuted}>相手に見せたくない内容がある場合は、開始せずに戻れます。</AppText>
        </View>
      </Pressable>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="caption" color={colors.inkMuted}>{label}</AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs },
  lead: { marginTop: spacing.sm },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.md },
  notice: { marginTop: spacing.xxl },
  card: { marginTop: spacing.xl, gap: spacing.lg },
  detail: { gap: spacing.xs },
  checkboxRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkboxCopy: { flex: 1, gap: spacing.xs },
});
