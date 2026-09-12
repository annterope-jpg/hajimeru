import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import {
  FUTURE_SCENE_FIELD_LIMIT,
  assessBottlenecks,
  createEpisodicFutureScene,
  isFutureSceneEligible,
  type EpisodicFutureScene,
} from '@/domain';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Focus = EpisodicFutureScene['focus'];
type FieldStep = 'whenWhere' | 'scene' | 'feeling';

const FIELD_STEPS: FieldStep[] = ['whenWhere', 'scene', 'feeling'];
const COPY: Record<FieldStep, { title: string; help: string; example: Record<Focus, string> }> = {
  whenWhere: {
    title: 'いつ・どこでの場面ですか？',
    help: '近い未来の、短い一場面で十分です。',
    example: { outcome: '明日の朝、机の前で', process: '今日の夕方、机の前で' },
  },
  scene: {
    title: 'その場で、何が見える・何をしていますか？',
    help: '結果でも、少し進めている途中でもかまいません。',
    example: { outcome: '机の一角が空いて、コップを置ける', process: '書類を1枚ずつ分けている' },
  },
  feeling: {
    title: '気持ちや身体は、どんな感じですか？',
    help: '言葉にしにくければ、この欄は飛ばせます。',
    example: { outcome: '肩が少し軽い', process: '少し落ち着いて手が動いている' },
  },
};

export default function FutureSceneScreen() {
  const draft = useAppStore((state) => state.assessmentDraft);
  const existing = useAppStore((state) => state.futureScene);
  const setFutureScene = useAppStore((state) => state.setFutureScene);
  const [focus, setFocus] = useState<Focus | undefined>(existing?.focus);
  const [step, setStep] = useState(existing ? 1 : 0);
  const [values, setValues] = useState<Record<FieldStep, string>>({
    whenWhere: existing?.whenWhere ?? '',
    scene: existing?.scene ?? '',
    feeling: existing?.feeling ?? '',
  });
  const assessment = useMemo(() => assessBottlenecks({
    taskClarity: draft.taskClarity ?? null,
    aversion: draft.aversion ?? null,
    lowActivation: draft.lowActivation ?? null,
    rewardDistance: draft.rewardDistance ?? null,
    timeAmbiguity: draft.timeAmbiguity ?? null,
    cueWeakness: draft.cueWeakness ?? null,
    competingReward: draft.competingReward ?? null,
  }), [draft]);

  if (!isFutureSceneEligible(assessment)) {
    return (
      <Screen>
        <Card>
          <AppText variant="title">今は、この確認を増やさなくて大丈夫です</AppText>
          <AppText color={colors.inkMuted}>この任意機能は、開始直後の変化が見えにくいと答えたときだけ使えます。</AppText>
          <AppButton label="開始プランへ戻る" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  function save() {
    const result = createEpisodicFutureScene({ focus, ...values });
    if (!result) return;
    setFutureScene(result);
    router.back();
  }

  if (step === 0 || !focus) {
    return (
      <Screen>
        <AppText variant="title">未来の一場面を置く（任意）</AppText>
        <AppText color={colors.inkMuted}>少し助かる未来を、言葉で置くだけでも大丈夫です。鮮明に想像する必要はありません。</AppText>
        <Card tone="blue">
          <AppText variant="label">どちらの場面が置きやすそうですか？</AppText>
          <ChoiceChips<Focus>
            accessibilityLabel="未来場面の焦点"
            value={focus}
            onChange={(next) => { setFocus(next); setStep(1); }}
            choices={[
              { value: 'outcome', label: '少し助かった場面', description: '始めたことで、近い未来が少し楽になった場面' },
              { value: 'process', label: '少し進めている場面', description: '終わっていなくても、手が動いている途中の場面' },
            ]}
          />
        </Card>
        <AppButton label="使わずに開始プランへ戻る" variant="quiet" onPress={() => router.back()} />
      </Screen>
    );
  }

  const field = FIELD_STEPS[step - 1]!;
  const copy = COPY[field];
  const last = step === FIELD_STEPS.length;
  return (
    <Screen>
      <AppText variant="caption" color={colors.inkMuted}>{step} / 3</AppText>
      <AppText variant="title">{copy.title}</AppText>
      <AppText color={colors.inkMuted}>{copy.help}</AppText>
      <Card>
        <TextInput
          accessibilityLabel={copy.title}
          value={values[field]}
          onChangeText={(value) => setValues((current) => ({ ...current, [field]: value }))}
          maxLength={FUTURE_SCENE_FIELD_LIMIT}
          multiline
          placeholder={copy.example[focus]}
          placeholderTextColor="#89948E"
          style={styles.input}
        />
        <AppButton
          label="例を使う"
          variant="secondary"
          compact
          onPress={() => setValues((current) => ({ ...current, [field]: copy.example[focus] }))}
        />
      </Card>
      <View style={styles.actions}>
        <AppButton
          label={last ? 'この場面を置く' : values[field].trim() ? '次へ' : 'この欄は飛ばす'}
          onPress={last ? save : () => setStep((current) => current + 1)}
          disabled={last && !Object.values(values).some((value) => value.trim())}
        />
        <AppButton label="戻る" variant="secondary" onPress={() => setStep((current) => current - 1)} />
        <AppButton label="使わずに開始プランへ戻る" variant="quiet" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: spacing.md,
    fontSize: 17,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  actions: { gap: spacing.sm },
});
