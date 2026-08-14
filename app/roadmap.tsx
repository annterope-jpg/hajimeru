import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const KIND_LABELS = {
  now: 'いま',
  next: '次',
  later: 'あとで',
} as const;

export default function RoadmapScreen() {
  const roadmap = useAppStore((state) => state.activeRoadmap);

  if (!roadmap) {
    return <Redirect href="/plan" />;
  }

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
      <AppText variant="title" style={styles.title}>これは計画表ではなく、仮の地図です</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        全部を覚えたり、順番どおりに終えたりする必要はありません。迷いを減らすために、今いる場所と次の方向だけを置いています。
      </AppText>

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
                  {current ? (
                    <AppText variant="caption" color={colors.primary}>ここだけ見れば大丈夫</AppText>
                  ) : null}
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

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs, marginBottom: spacing.md },
  lead: { marginBottom: spacing.xl },
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
});
