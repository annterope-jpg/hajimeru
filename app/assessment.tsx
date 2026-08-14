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
                    課題が大きいほど、開始前の判断が増えます。ロードマップを自動で決めることはせず、次の画面で「いま何が分からないか」を短く確認してから、「今・次・あとで」の粗い道筋にします。
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
      title: '手応えや助かりを、今どのくらい遠く感じますか？',
      low: '今すぐ実感できる',
      high: 'かなり遠い',
      reflection: '高い場合は、1〜3分後に「少し動けた印」を置く提案にします。',
    },
    {
      key: 'timeAmbiguity' as const,
      title: 'いつ始めるか、どのくらい曖昧ですか？',
      low: '具体的',
      high: 'かなり曖昧',
      reflection: '高い場合は、「夕食後」など出来事に結びつけた開始の合図を提案します。',
    },
    {
      key: 'cueWeakness' as const,
      title: '脱線したり、次にすることを見失ったりしやすいですか？',
      low: '戻れる・見失いにくい',
      high: '脱線・見失いやすい',
      reflection: '実際に起こりやすい困難を尋ねます。高い場合は、通知・付箋・開いた画面など「外から戻る目印」を提案します。',
    },
    {
      key: 'competingReward' as const,
      title: '代わりにしたくなることは、どのくらい強いですか？',
      low: '特にない',
      high: 'とても強い',
      reflection: '高い場合は、スマホなどに小さな摩擦を足す提案にします。',
    },
  ];

  return (
    <View>
      <AppText variant="title" style={styles.title}>
        必要なら、もう少し調整
      </AppText>
      <AppText color={colors.inkMuted} style={styles.help}>
        ここは「何が開始コストを上げているか」を見分け、回答ごとに提案を変える場所です。答えた項目だけを使い、分からない項目は空欄のままで構いません。
      </AppText>
      <View style={styles.advancedList}>
        <Card tone="blue" style={styles.adjustmentIntro}>
          <AppText variant="label">目標の価値と、いまの開始コストは別のものです</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            大切なことでも、判断・疲れ・不安・脱線しやすさが重なると始めにくくなります。ここでは「もっとやる気を出す」のではなく、今の入口を軽くするための調整を選びます。
          </AppText>
        </Card>
        <Card>
          <AppText variant="label">この課題が少し進むと、何が助かる・大切ですか？（任意）</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            自分を追い込むためではなく、最初の一歩が何に向かうものかを手元に置くための言葉です。入力すると開始プランに表示します。
          </AppText>
          <TextInput
            accessibilityLabel="この一歩の意味"
            placeholder="例：明日の朝に机を使えるようにする"
            placeholderTextColor="#89948E"
            value={assessment.valueAnchor ?? ''}
            onChangeText={(valueAnchor) => updateAssessment({ valueAnchor })}
            maxLength={120}
            style={styles.smallInput}
          />
        </Card>
        {scales.map((scale) => (
          <Card key={scale.key}>
            <AppText variant="label">{scale.title}</AppText>
            <AppText variant="caption" color={colors.inkMuted}>{scale.reflection}</AppText>
            <RatingScale
              value={assessment[scale.key]}
              onChange={(value) => updateAssessment({ [scale.key]: value })}
              lowLabel={scale.low}
              highLabel={scale.high}
              accessibilityLabel={scale.title}
            />
          </Card>
        ))}
        <Card tone="amber">
          <AppText variant="label">忘れてしまうことが、どのくらい気がかりですか？</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            これは「実際に脱線・失念しやすいか」ではなく、忘れる心配の強さを尋ねます。高い場合は、覚え続けなくてもよいよう「次にすること」を外に1行残す提案にします。
          </AppText>
          <RatingScale
            value={assessment.forgettingWorry}
            onChange={(forgettingWorry) => updateAssessment({ forgettingWorry })}
            lowLabel="気がかりでない"
            highLabel="とても気がかり"
            accessibilityLabel="忘れてしまう心配 0から10"
          />
        </Card>
        <Card>
          <AppText variant="label">何の後なら始めやすそうですか？（任意）</AppText>
          <AppText variant="caption" color={colors.inkMuted}>入力すると、開始のきっかけとしてプランに反映します。</AppText>
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
          <AppText variant="caption" color={colors.inkMuted}>入力すると、その行動に小さな距離を置く提案に反映します。</AppText>
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
  adjustmentIntro: { gap: spacing.sm },
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
