import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { getLocalRepository } from '@/data';
import {
  createReentrySupport,
  getSocialSupportTemplate,
  type ReentrySupportMode,
  type TaskAttempt,
} from '@/domain';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

function secondsUntil(iso?: string) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export default function TimerScreen() {
  const plan = useAppStore((state) => state.activePlan);
  const timerEndsAt = useAppStore((state) => state.timerEndsAt);
  const attemptId = useAppStore((state) => state.activeAttemptId);
  const clearTimer = useAppStore((state) => state.clearTimer);
  const socialSupportSelection = useAppStore((state) => state.socialSupportSelection);
  const [remaining, setRemaining] = useState(() => secondsUntil(timerEndsAt));
  const [reentryMode, setReentryMode] = useState<ReentrySupportMode>();
  const finished = remaining <= 0;

  useEffect(() => {
    if (!plan || !timerEndsAt) {
      router.replace('/(tabs)');
      return;
    }
    const update = () => setRemaining(secondsUntil(timerEndsAt));
    update();
    const interval = setInterval(update, 500);
    const subscription = AppState.addEventListener('change', update);
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [plan, timerEndsAt]);

  useEffect(() => {
    if (finished && timerEndsAt) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [finished, timerEndsAt]);

  const progress = useMemo(() => {
    const total = (plan?.durationMinutes ?? 1) * 60;
    return total > 0 ? 1 - remaining / total : 1;
  }, [plan?.durationMinutes, remaining]);

  const reentrySupport = useMemo(
    () => (plan && reentryMode ? createReentrySupport(plan, reentryMode) : null),
    [plan, reentryMode],
  );

  if (!plan || !timerEndsAt) return null;

  async function finishTimer() {
    if (attemptId) {
      const repository = getLocalRepository();
      const existing = await repository.getAttempt(attemptId);
      if (existing) {
        const endedAt = new Date().toISOString();
        const updated: TaskAttempt = { ...existing, endedAt, updatedAt: endedAt };
        await repository.saveAttempt(updated, { entityId: attemptId, updatedAt: endedAt });
      }
    }
    await clearTimer();
    router.replace('/reflection');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        testID="timer-started"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successMark}>
          <Ionicons name="checkmark" size={28} color={colors.primary} />
        </View>
        <AppText variant="caption" color={colors.primary}>
          開始できた時点で、もう成功です
        </AppText>

        <View style={styles.timerCircle} accessibilityRole="timer" accessibilityLabel={`残り ${formatClock(remaining)}`}>
          <View style={[styles.progressHalo, { opacity: 0.25 + progress * 0.45 }]} />
          <AppText variant="display" style={styles.clock}>
            {formatClock(remaining)}
          </AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            {finished ? 'ここで止めても大丈夫' : '残り時間'}
          </AppText>
        </View>

        <Card tone="green" style={styles.actionCard}>
          <AppText variant="caption" color={colors.inkMuted}>
            今すること
          </AppText>
          <AppText variant="heading">{plan.firstAction}</AppText>
        </Card>

        <View style={styles.reentryChoices}>
          <AppText variant="caption" color={colors.inkMuted} style={styles.center}>
            脱線した・次がわからない・切り替えにくいとき
          </AppText>
          <View style={styles.reentryButtons}>
            <AppButton
              testID="show-return-marker"
              label="戻る目印"
              compact
              variant="secondary"
              onPress={() => setReentryMode('return_marker')}
            />
            <AppButton
              testID="show-next-action"
              label="次の1動作"
              compact
              variant="secondary"
              onPress={() => setReentryMode('next_action')}
            />
            <AppButton
              testID="show-transition-bridge"
              label="切替の橋"
              compact
              variant="secondary"
              onPress={() => setReentryMode('transition_bridge')}
            />
          </View>
        </View>

        {reentrySupport ? (
          <Card tone="blue" style={styles.reentryCard} testID="reentry-support">
            <AppText variant="caption" color={colors.inkMuted}>{reentrySupport.title}</AppText>
            <AppText variant="label">{reentrySupport.action}</AppText>
            <AppText variant="caption" color={colors.inkMuted}>{reentrySupport.explanation}</AppText>
            <AppButton
              label="閉じる（記録しない）"
              compact
              variant="quiet"
              onPress={() => setReentryMode(undefined)}
            />
          </Card>
        ) : null}

        {socialSupportSelection?.mode === 'report_start' ? (
          <Card tone="blue" style={styles.socialCard}>
            <AppText variant="caption" color={colors.inkMuted}>始めたことだけ伝える場合の定型文</AppText>
            <AppText selectable>{getSocialSupportTemplate('report_start')}</AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              送るかどうかは自分で選べます。アプリは送信や返信確認をしません。
            </AppText>
          </Card>
        ) : null}

        <View style={styles.message}>
          <AppText color={colors.inkMuted} style={styles.center}>
            {finished
              ? 'できた量は問いません。今の経験を短く記録できます。'
              : 'タイマー中に止まっても、気がそれても失敗ではありません。'}
          </AppText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          testID="timer-finish"
          label={finished ? 'ふりかえる' : 'ここで止める（成功）'}
          variant={finished ? 'primary' : 'secondary'}
          icon={finished ? 'arrow-forward' : 'stop-outline'}
          onPress={() => void finishTimer()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  successMark: {
    width: 50,
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  timerCircle: {
    width: 230,
    height: 230,
    borderRadius: 115,
    marginVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  progressHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primarySoft,
  },
  clock: { fontVariant: ['tabular-nums'], zIndex: 1 },
  actionCard: { width: '100%', padding: spacing.xl },
  reentryChoices: { width: '100%', marginTop: spacing.lg, gap: spacing.sm },
  reentryButtons: { gap: spacing.sm },
  reentryCard: { width: '100%', marginTop: spacing.md, gap: spacing.sm },
  socialCard: { width: '100%', marginTop: spacing.md, gap: spacing.sm },
  message: { marginTop: spacing.xl, paddingHorizontal: spacing.md },
  center: { textAlign: 'center' },
  footer: { padding: spacing.xl },
});
