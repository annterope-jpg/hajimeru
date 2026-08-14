import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import {
  createLocalRoadmap,
  inferTaskCategory,
  ROADMAP_CONCERN_COPY,
  type RoadmapConcern,
} from '@/domain';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const KIND_LABELS = {
  now: 'いま',
  next: '次',
  later: 'あとで',
} as const;

const CONCERN_CHOICES: { value: RoadmapConcern; label: string; description: string }[] = [
  { value: 'entry', label: 'どこから始めるか決められない', description: '最初の入口を選ぶところで止まる' },
  { value: 'scope', label: '範囲が広すぎて圧倒される', description: '全体が大きく見えて手が出ない' },
  { value: 'information', label: '必要な物や情報が分からない', description: '調べる・集める前で止まる' },
  { value: 'decisions', label: '決めることが多すぎる', description: '正しい順番や置き場所を考え続ける' },
  { value: 'endPoint', label: 'どこまででよいか分からない', description: '終わりが見えず手を付けにくい' },
];

export default function RoadmapScreen() {
  const roadmap = useAppStore((state) => state.activeRoadmap);
  const taskText = useAppStore((state) => state.taskText);
  const activePlan = useAppStore((state) => state.activePlan);

  if (!taskText || !activePlan) {
    return <Redirect href="/plan" />;
  }

  if (!roadmap) {
    return <RoadmapConsultation />;
  }

  const consultation = roadmap.consultation;
  const concernCopy = consultation ? ROADMAP_CONCERN_COPY[consultation.concern] : null;

  return (
    <Screen
      testID="roadmap-screen"
      footer={
        <AppButton
          testID="roadmap-back-to-plan"
          label="開始プランへ戻る"
          icon="arrow-back"
          onPress={() => router.back()}
        />
      }
    >
      <AppText variant="caption" color={colors.primary}>大きな課題の見通し</AppText>
      <AppText variant="title" style={styles.title}>これは計画表ではなく、今の迷いに合わせた仮の地図です</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        全部を覚えたり、順番どおりに終えたりする必要はありません。迷いを減らすために、今いる場所と次の方向だけを置いています。
      </AppText>

      {consultation && concernCopy ? (
        <Card tone="blue" style={styles.consultationCard}>
          <AppText variant="label">相談した内容を、地図の最初の「次」に反映しました</AppText>
          <AppText variant="caption" color={colors.inkMuted}>いまの迷い：{concernCopy.label}</AppText>
          <AppText variant="caption" color={colors.inkMuted}>{concernCopy.reflection}</AppText>
          {consultation.knownContext ? (
            <AppText variant="caption" color={colors.inkMuted}>手がかり：{consultation.knownContext}</AppText>
          ) : null}
        </Card>
      ) : null}

      <Card tone="blue" style={styles.goalCard}>
        <View style={styles.goalLabel}>
          <Ionicons name="flag-outline" size={19} color={colors.info} />
          <AppText variant="caption" color={colors.info}>一区切りの目印</AppText>
        </View>
        <AppText variant="heading">{roadmap.goalState}</AppText>
        <AppText variant="caption" color={colors.inkMuted}>{roadmap.framing}</AppText>
      </Card>

      <View style={styles.steps}>
        {roadmap.steps.map((step, index) => {
          const current = step.kind === 'now';
          return (
            <View key={step.id} style={styles.stepShell}>
              <View style={styles.rail} accessibilityElementsHidden>
                <View style={[styles.dot, current && styles.dotCurrent]} />
                {index < roadmap.steps.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <Card tone={current ? 'green' : 'default'} style={[styles.stepCard, !current && styles.futureStep]}>
                <View style={styles.stepHeader}>
                  <View style={[styles.kindBadge, current && styles.kindBadgeCurrent]}>
                    <AppText variant="caption" color={current ? colors.white : colors.inkMuted}>
                      {KIND_LABELS[step.kind]}
                    </AppText>
                  </View>
                  {current ? <AppText variant="caption" color={colors.primary}>ここだけ見れば大丈夫</AppText> : null}
                </View>
                <AppText variant={current ? 'heading' : 'label'}>{step.title}</AppText>
                <AppText color={current ? colors.ink : colors.inkMuted}>{step.description}</AppText>
              </Card>
            </View>
          );
        })}
      </View>

      <Card tone="amber" style={styles.ruleCard}>
        <AppText variant="label">途中で分からなくなったら</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          判断が必要なものは「保留」にして構いません。止めるときは、次に触る物や開く場所を1つだけ残すと、再開時のコストを下げられます。
        </AppText>
      </Card>
    </Screen>
  );
}

function RoadmapConsultation() {
  const taskText = useAppStore((state) => state.taskText);
  const plan = useAppStore((state) => state.activePlan);
  const draft = useAppStore((state) => state.assessmentDraft);
  const updateAssessment = useAppStore((state) => state.updateAssessment);
  const setRoadmap = useAppStore((state) => state.setRoadmap);
  const [concern, setConcern] = useState<RoadmapConcern | undefined>(draft.roadmapConcern);
  const [knownContext, setKnownContext] = useState(draft.roadmapKnownContext ?? '');
  const [desiredOutcome, setDesiredOutcome] = useState(draft.desiredOutcome ?? '');

  function createRoadmap() {
    if (!taskText || !plan || !concern) return;
    const consultation = {
      concern,
      knownContext: knownContext.trim() || null,
    };
    updateAssessment({
      roadmapRequested: true,
      roadmapConcern: concern,
      roadmapKnownContext: consultation.knownContext ?? undefined,
      desiredOutcome,
    });
    setRoadmap(
      createLocalRoadmap({
        taskText,
        category: inferTaskCategory(taskText),
        firstAction: plan.firstAction,
        desiredOutcome,
        consultation,
      }),
    );
  }

  return (
    <Screen
      testID="roadmap-consultation"
      footer={
        <View style={styles.consultationFooter}>
          <AppButton label="開始プランへ戻る" variant="quiet" onPress={() => router.back()} />
          <AppButton
            testID="roadmap-generate"
            label="この内容で仮の地図を作る"
            icon="map-outline"
            disabled={!concern}
            onPress={createRoadmap}
          />
        </View>
      }
    >
      <AppText variant="caption" color={colors.primary}>大きな課題の見通し</AppText>
      <AppText variant="title" style={styles.title}>地図にする前に、いまの迷いを短く確認します</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        正しい計画を作るためではなく、いま必要な判断を減らすための確認です。選んだ迷いは、地図の最初の「次」に反映します。
      </AppText>

      <Card tone="green" style={styles.taskCard}>
        <AppText variant="caption" color={colors.inkMuted}>地図にしたいこと</AppText>
        <AppText variant="label">{taskText}</AppText>
      </Card>

      <View style={styles.consultationList}>
        <Card>
          <AppText variant="label">いま一番近い迷いはどれですか？</AppText>
          <ChoiceChips
            accessibilityLabel="ロードマップで扱う迷い"
            value={concern}
            onChange={setConcern}
            choices={CONCERN_CHOICES}
          />
        </Card>
        <Card>
          <AppText variant="label">いま分かっている手がかりはありますか？（任意）</AppText>
          <AppText variant="caption" color={colors.inkMuted}>場所、期限、手元にある物など、短くて大丈夫です。</AppText>
          <TextInput
            accessibilityLabel="ロードマップの手がかり"
            value={knownContext}
            onChangeText={setKnownContext}
            placeholder="例：月末まで、机の上、必要書類は不明"
            placeholderTextColor="#89948E"
            maxLength={120}
            style={styles.smallInput}
          />
        </Card>
        <Card>
          <AppText variant="label">今日の一区切りは、どんな状態ならよさそうですか？（任意）</AppText>
          <AppText variant="caption" color={colors.inkMuted}>完了でなくて構いません。空欄なら、課題に合う仮の目印を置きます。</AppText>
          <TextInput
            accessibilityLabel="ロードマップの一区切り"
            value={desiredOutcome}
            onChangeText={setDesiredOutcome}
            placeholder="例：必要な書類の不足が分かる"
            placeholderTextColor="#89948E"
            maxLength={160}
            style={styles.smallInput}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs, marginBottom: spacing.md },
  lead: { marginBottom: spacing.xl },
  taskCard: { gap: spacing.xs },
  consultationList: { marginTop: spacing.lg, gap: spacing.md },
  consultationFooter: { gap: spacing.xs },
  consultationCard: { gap: spacing.xs, marginBottom: spacing.lg },
  goalCard: { padding: spacing.xl },
  goalLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  steps: { marginTop: spacing.xxl },
  stepShell: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: 28, alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.pill,
    marginTop: spacing.xl,
    backgroundColor: colors.line,
  },
  dotCurrent: { width: 16, height: 16, backgroundColor: colors.primary },
  line: { width: 2, flex: 1, minHeight: 24, backgroundColor: colors.line },
  stepCard: { flex: 1, marginBottom: spacing.md, padding: spacing.lg },
  futureStep: { backgroundColor: '#FCFCF9' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  kindBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  kindBadgeCurrent: { backgroundColor: colors.primary },
  ruleCard: { marginTop: spacing.lg },
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
