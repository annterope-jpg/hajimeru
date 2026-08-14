import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { RatingScale } from '@/components/RatingScale';
import { Screen } from '@/components/Screen';
import { StepIndicator } from '@/components/StepIndicator';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const questions = [
  {
    title: '最初に何をするか、分かりますか？',
    help: '「片付ける」ではなく、手や身体を最初にどう動かすかを思い浮かべてください。',
  },
  {
    title: '考えると、どのくらいイヤですか？',
    help: '面倒、退屈、不安、怖さなどをまとめた今の感覚で大丈夫です。',
  },
  {
    title: 'いま、身体や頭はどのくらい重いですか？',
    help: '眠い、ぼんやりする、立ち上がりづらい感覚を選んでください。',
  },
] as const;

export default function AssessmentScreen() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const taskText = useAppStore((state) => state.taskText);
  const assessment = useAppStore((state) => state.assessmentDraft);
  const updateAssessment = useAppStore((state) => state.updateAssessment);

  if (!taskText) {
    return <Redirect href="/(tabs)" />;
  }

  const requiredComplete =
    assessment.taskClarity !== undefined &&
    assessment.aversion !== undefined &&
    assessment.lowActivation !== undefined;

  function finish() {
    if (!requiredComplete) return;
    router.push('/plan');
  }

  function renderRequiredQuestion() {
    const question = questions[step - 1];
    if (!question) return null;
    return (
      <>
        <StepIndicator current={step} total={3} label={`短い確認 ${step} / 3`} />
        <AppText variant="title" style={styles.title}>
          {question.title}
        </AppText>
        <AppText color={colors.inkMuted} style={styles.help}>
          {question.help}
        </AppText>
        <Card style={styles.questionCard}>
          {step === 1 ? (
            <View style={styles.clarityBlock}>
              <ChoiceChips
                accessibilityLabel="最初の行動が分かるか"
                value={assessment.taskClarity}
                onChange={(value) =>
                  updateAssessment({
                    taskClarity: value,
                    roadmapRequested: value ? false : (assessment.roadmapRequested ?? true),
                  })
                }
                choices={[
                  { value: true, label: 'だいたい分かる', description: '最初に手を動かす対象が浮かぶ' },
                  { value: false, label: 'まだ曖昧', description: 'どこから、何から、で止まりやすい' },
                ]}
              />
              {assessment.taskClarity === false ? (
                <View style={styles.roadmapPrompt}>
                  <AppText variant="label">大きな課題なら、仮の地図も作れます</AppText>
                  <AppText variant="caption" color={colors.inkMuted}>
                    課題が大きいほど、開始前の判断が増えます。全部を細かく決めず、「今・次・あとで」の粗い道筋にします。
                  </AppText>
                  <ChoiceChips
                    accessibilityLabel="ロードマップを作るか"
                    value={assessment.roadmapRequested}
                    onChange={(roadmapRequested) => updateAssessment({ roadmapRequested })}
                    choices={[
                      { value: true, label: '全体の見通しもほしい', description: '今の一歩に加えて、後の流れを仮置きする' },
                      { value: false, label: 'まず一歩だけでよい', description: '開始プランだけを表示する' },
                    ]}
                  />
                  {assessment.roadmapRequested ? (
                    <View style={styles.outcomeEditor}>
                      <AppText variant="caption" color={colors.inkMuted}>
                        どんな状態なら一区切りですか？（空欄でも作れます）
                      </AppText>
                      <TextInput
                        testID="desired-outcome-input"
                        accessibilityLabel="課題の一区切りの状態"
                        placeholder="例：机で食事ができる状態"
                        placeholderTextColor="#89948E"
                        value={assessment.desiredOutcome ?? ''}
                        onChangeText={(desiredOutcome) => updateAssessment({ desiredOutcome })}
                        maxLength={160}
                        style={styles.smallInput}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
          {step === 2 ? (
            <RatingScale
              value={assessment.aversion}
              onChange={(value) => updateAssessment({ aversion: value })}
              lowLabel="全くイヤでない"
              highLabel="とてもイヤ"
              accessibilityLabel="嫌悪度 0から10"
            />
          ) : null}
          {step === 3 ? (
            <RatingScale
              value={assessment.lowActivation}
              onChange={(value) => updateAssessment({ lowActivation: value })}
              lowLabel="軽い・冴えている"
              highLabel="とても重い"
              accessibilityLabel="身体や頭の重さ 0から10"
            />
          ) : null}
        </Card>
      </>
    );
  }

  function canAdvance() {
    if (step === 1) return assessment.taskClarity !== undefined;
    if (step === 2) return assessment.aversion !== undefined;
    if (step === 3) return assessment.lowActivation !== undefined;
    return true;
  }

  return (
    <Screen
      testID="assessment-screen"
      footer={
        step < 3 ? (
          <AppButton
            testID="assessment-next"
            label="次へ"
            icon="arrow-forward"
            disabled={!canAdvance()}
            onPress={() => setStep((value) => (value + 1) as 2 | 3)}
          />
        ) : step === 3 ? (
          <View style={styles.footerButtons}>
            <AppButton
              testID="assessment-next"
              label="開始プランを見る"
              icon="arrow-forward"
              disabled={!requiredComplete}
              onPress={finish}
            />
            <AppButton
              label="詳しく調整する（任意）"
              variant="quiet"
              icon="options-outline"
              disabled={!requiredComplete}
              onPress={() => setStep(4)}
            />
          </View>
        ) : (
          <AppButton testID="assessment-next" label="開始プランを見る" icon="arrow-forward" onPress={finish} />
        )
      }
    >
      <Card tone="green" style={styles.taskCard}>
        <AppText variant="caption" color={colors.inkMuted}>
          始めたいこと
        </AppText>
        <AppText variant="label" numberOfLines={3}>
          {taskText}
        </AppText>
      </Card>

      {step <= 3 ? renderRequiredQuestion() : <AdvancedAssessment />}
    </Screen>
  );
}

function AdvancedAssessment() {
  const assessment = useAppStore((state) => state.assessmentDraft);
  const updateAssessment = useAppStore((state) => state.updateAssessment);

  const scales = [
    {
      key: 'rewardDistance' as const,
      title: '終わった結果を、今どのくらい遠く感じますか？',
      low: '今すぐ実感できる',
      high: 'かなり遠い',
    },
    {
      key: 'timeAmbiguity' as const,
      title: 'いつ始めるか、どのくらい曖昧ですか？',
      low: '具体的',
      high: 'かなり曖昧',
    },
    {
      key: 'cueWeakness' as const,
      title: 'その時に思い出せない心配はありますか？',
      low: '思い出せる',
      high: '忘れそう',
    },
    {
      key: 'competingReward' as const,
      title: '代わりにしたくなることは、どのくらい強いですか？',
      low: '特にない',
      high: 'とても強い',
    },
  ];

  return (
    <View>
      <AppText variant="title" style={styles.title}>
        必要なら、もう少し調整
      </AppText>
      <AppText color={colors.inkMuted} style={styles.help}>
        答えた項目だけを使います。分からない項目は空欄のままで構いません。
      </AppText>
      <View style={styles.advancedList}>
        {scales.map((scale) => (
          <Card key={scale.key}>
            <AppText variant="label">{scale.title}</AppText>
            <RatingScale
              value={assessment[scale.key]}
              onChange={(value) => updateAssessment({ [scale.key]: value })}
              lowLabel={scale.low}
              highLabel={scale.high}
              accessibilityLabel={scale.title}
            />
          </Card>
        ))}
        <Card>
          <AppText variant="label">何の後なら始めやすそうですか？（任意）</AppText>
          <TextInput
            accessibilityLabel="イベントキュー"
            placeholder="例：夕食の皿をシンクに置いた後"
            placeholderTextColor="#89948E"
            value={assessment.eventCue ?? ''}
            onChangeText={(eventCue) => updateAssessment({ eventCue })}
            maxLength={120}
            style={styles.smallInput}
          />
        </Card>
        <Card>
          <AppText variant="label">代わりにしやすいことは？（任意）</AppText>
          <TextInput
            accessibilityLabel="競合行動"
            placeholder="例：スマホ、動画、ゲーム"
            placeholderTextColor="#89948E"
            value={assessment.competingAction ?? ''}
            onChangeText={(competingAction) => updateAssessment({ competingAction })}
            maxLength={120}
            style={styles.smallInput}
          />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: { marginBottom: spacing.xxl },
  title: { marginTop: spacing.xxl, marginBottom: spacing.md },
  help: { marginBottom: spacing.xl },
  questionCard: { padding: spacing.xl },
  clarityBlock: { gap: spacing.lg },
  roadmapPrompt: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  outcomeEditor: { gap: spacing.sm },
  footerButtons: { gap: spacing.xs },
  advancedList: { gap: spacing.md },
  smallInput: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 16,
  },
});
