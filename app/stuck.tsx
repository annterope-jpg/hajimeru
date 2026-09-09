import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import {
  RETRY_REASONS,
  RETRY_REASON_COPY,
  createRetryAdjustment,
  type RetryReason,
  type TaskAttempt,
} from '@/domain';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function StuckScreen() {
  const attemptId = useAppStore((state) => state.activeAttemptId);
  const activePlan = useAppStore((state) => state.activePlan);
  const prepareRetry = useAppStore((state) => state.prepareRetry);
  const resetFlow = useAppStore((state) => state.resetFlow);
  const endSupportedUse = useAppStore((state) => state.endSupportedUse);
  const [reason, setReason] = useState<RetryReason>();
  const [busy, setBusy] = useState(false);
  const adjustment = useMemo(
    () => (activePlan && reason ? createRetryAdjustment(activePlan, reason) : null),
    [activePlan, reason],
  );

  if (!attemptId || !activePlan) return <Redirect href="/(tabs)" />;

  async function finishAttempt(): Promise<void> {
    const repository = getLocalRepository();
    const existing = await repository.getAttempt(attemptId!);
    if (!existing) return;
    const now = new Date().toISOString();
    const updated: TaskAttempt = {
      ...existing,
      endedAt: now,
      outcome: 'stuck',
      updatedAt: now,
    };
    await repository.saveAttempt(updated, { entityId: attemptId!, updatedAt: now });
  }

  async function run(action: 'retry' | 'change_time' | 'rest' | 'end') {
    if (busy) return;
    setBusy(true);
    try {
      await finishAttempt();
      if ((action === 'retry' || action === 'change_time') && adjustment?.adjustedPlan) {
        await prepareRetry(adjustment.adjustedPlan);
        router.replace({
          pathname: '/plan',
          params: action === 'change_time' ? { retry: '1', cue: '1' } : { retry: '1' },
        });
        return;
      }
      await resetFlow();
      endSupportedUse();
      router.replace('/(tabs)');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      testID="stuck-screen"
      footer={
        <View style={styles.footer}>
          {adjustment?.choices.includes('retry') ? (
            <AppButton
              testID="retry-adjusted-action"
              label="調整した一歩を確認"
              loading={busy}
              onPress={() => void run('retry')}
            />
          ) : null}
          {adjustment?.choices.includes('change_time') ? (
            <AppButton
              testID="retry-change-time"
              label="時間を変える／合図を作る"
              variant="secondary"
              disabled={busy}
              onPress={() => void run('change_time')}
            />
          ) : null}
          {adjustment?.choices.includes('rest') ? (
            <AppButton
              testID="retry-rest"
              label="今日は休む"
              variant="quiet"
              disabled={busy}
              onPress={() => void run('rest')}
            />
          ) : null}
          {adjustment?.choices.includes('end') ? (
            <AppButton
              testID="retry-end"
              label="ここで終える"
              variant="quiet"
              disabled={busy}
              onPress={() => void run('end')}
            />
          ) : null}
          {!reason ? (
            <AppButton
              testID="retry-end-without-reason"
              label="理由を選ばず、ここで終える"
              variant="quiet"
              loading={busy}
              onPress={() => void run('end')}
            />
          ) : null}
        </View>
      }
    >
      <AppText variant="caption" color={colors.primary}>困ったことは、次の調整の手がかりです</AppText>
      <AppText variant="title" style={styles.title}>今の一歩で、変えるならどこですか？</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        できなかった理由を決める画面ではありません。今の一歩で変える点を、1つだけ選べます。選ばず終えても大丈夫です。
      </AppText>

      <ChoiceChips
        accessibilityLabel="今の一歩で調整したいこと"
        value={reason}
        onChange={setReason}
        choices={RETRY_REASONS.map((value) => ({
          value,
          ...RETRY_REASON_COPY[value],
        }))}
      />

      {adjustment ? (
        <Card tone="blue" style={styles.adjustment}>
          <AppText variant="heading">{adjustment.heading}</AppText>
          <AppText color={colors.inkMuted}>{adjustment.message}</AppText>
          {adjustment.adjustedPlan ? (
            <View style={styles.actionBlock}>
              <AppText variant="caption" color={colors.primary}>調整した最初の一歩</AppText>
              <AppText variant="label">{adjustment.adjustedPlan.firstAction}</AppText>
              {adjustment.adjustedPlan.activationRitual ? (
                <AppText variant="caption" color={colors.inkMuted}>
                  先に：{adjustment.adjustedPlan.activationRitual}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.note}>
        <AppText variant="label">再開しない選択も残します</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          ここで終えても失敗にはしません。再開するときは、元の試行を上書きせず、調整した新しい試行として記録します。
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs },
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  adjustment: { marginTop: spacing.xl, gap: spacing.sm },
  actionBlock: { marginTop: spacing.sm, gap: spacing.xs },
  note: { marginTop: spacing.lg, gap: spacing.xs },
  footer: { gap: spacing.xs },
});
