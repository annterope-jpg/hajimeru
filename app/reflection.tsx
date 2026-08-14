import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { RatingScale } from '@/components/RatingScale';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import type { AttemptOutcome, TaskAttempt } from '@/domain';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function ReflectionScreen() {
  const attemptId = useAppStore((state) => state.activeAttemptId);
  const draft = useAppStore((state) => state.reflectionDraft);
  const updateReflection = useAppStore((state) => state.updateReflection);
  const resetFlow = useAppStore((state) => state.resetFlow);
  const [outcome, setOutcome] = useState<AttemptOutcome>();
  const [saving, setSaving] = useState(false);

  async function finishWithoutReflection() {
    await resetFlow();
    router.replace('/(tabs)');
  }

  async function save() {
    if (!attemptId || !outcome) return;
    setSaving(true);
    try {
      const repository = getLocalRepository();
      const existing = await repository.getAttempt(attemptId);
      if (existing) {
        const now = new Date().toISOString();
        const updated: TaskAttempt = {
          ...existing,
          endedAt: now,
          outcome,
          reflection: {
            ...existing.reflection,
            aversionAfter: draft.aversionAfter ?? null,
            actualDifficulty: draft.actualDifficulty ?? null,
            wantsToContinue:
              draft.continueDesire === undefined ? null : draft.continueDesire >= 6,
          },
          updatedAt: now,
        };
        await repository.saveAttempt(updated, { entityId: attemptId, updatedAt: now });
      }
      await resetFlow();
      router.replace('/(tabs)/insights');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      testID="reflection-screen"
      footer={
        <View style={styles.footer}>
          <AppButton
            testID="finish-success"
            label="記録して終わる"
            loading={saving}
            disabled={!outcome}
            onPress={() => void save()}
          />
          <AppButton
            label="記録せず終わる"
            variant="quiet"
            onPress={() => void finishWithoutReflection()}
          />
        </View>
      }
    >
      <AppText variant="title">始められたことを記録</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        完成したかどうかは聞きません。今の経験だけ、答えたい範囲で残せます。
      </AppText>

      <Card tone="green" style={styles.success}>
        <AppText variant="heading">開始 = 成功</AppText>
        <AppText color={colors.inkMuted}>少しでも手や身体を動かしたなら、それが今回の成功です。</AppText>
      </Card>

      <View style={styles.list}>
        <Card>
          <AppText variant="label">今はどうしますか？（必須）</AppText>
          <ChoiceChips
            accessibilityLabel="結果"
            value={outcome}
            onChange={setOutcome}
            choices={[
              { value: 'stopped_success', label: 'ここで終了（成功）' },
              { value: 'continued', label: 'もう少し続ける' },
              { value: 'stuck', label: '困った・止まった' },
            ]}
          />
        </Card>
        <Card>
          <AppText variant="label">始めた後のイヤさ（任意）</AppText>
          <RatingScale
            value={draft.aversionAfter}
            onChange={(aversionAfter) => updateReflection({ aversionAfter })}
            lowLabel="全くイヤでない"
            highLabel="とてもイヤ"
            accessibilityLabel="開始後の嫌悪度"
          />
        </Card>
        <Card>
          <AppText variant="label">実際の難しさ（任意）</AppText>
          <RatingScale
            value={draft.actualDifficulty}
            onChange={(actualDifficulty) => updateReflection({ actualDifficulty })}
            lowLabel="思ったより軽い"
            highLabel="とても難しい"
            accessibilityLabel="実際の難しさ"
          />
        </Card>
        <Card>
          <AppText variant="label">続けたい感覚（任意）</AppText>
          <RatingScale
            value={draft.continueDesire}
            onChange={(continueDesire) => updateReflection({ continueDesire })}
            lowLabel="ここで十分"
            highLabel="続けたい"
            accessibilityLabel="続けたい感覚"
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  success: { marginBottom: spacing.xl },
  list: { gap: spacing.md },
  footer: { gap: spacing.xs },
});
