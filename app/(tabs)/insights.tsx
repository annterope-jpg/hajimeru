import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import {
  calculateInsightMetrics,
  formatActivationTrend,
  type Bottleneck,
  type DailyState,
  type TaskAttempt,
} from '@/domain';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

interface Summary {
  attempts: TaskAttempt[];
  dailyStates: DailyState[];
}

const INTERVENTION_LABELS: Readonly<Record<Bottleneck, string>> = {
  taskClarity: '最初の行動を30秒以内まで小さくする',
  lowActivation: '立つ・水を飲むなどで身体を起こす',
  aversion: '嫌なまま30秒だけ始める',
  cueWeakness: '目立つ合図で思い出せるようにする',
  competingReward: 'スマホなどに小さな摩擦を足す',
  rewardDistance: '開始直後の変化を見える形にする',
  timeAmbiguity: '出来事を開始タイミングにする',
};

export default function InsightsScreen() {
  const [summary, setSummary] = useState<Summary>();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([
        getLocalRepository().listAttempts({ newestFirst: true }),
        getLocalRepository().listDailyStates({ newestFirst: true }),
      ]).then(([attempts, dailyStates]) => {
        if (active) setSummary({ attempts, dailyStates });
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const metrics = useMemo(
    () =>
      calculateInsightMetrics(
        summary ?? { attempts: [], dailyStates: [] },
      ),
    [summary],
  );

  if (!summary) {
    return (
      <Screen scroll={false} contentStyle={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen testID="insights-screen">
      <AppText variant="title">計画と開始の記録</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        比べる相手は過去の自分でもありません。役立ちそうな条件を静かに探すための記録です。
      </AppText>

      <Card tone="green" style={styles.startsCard}>
        <AppText variant="caption" color={colors.inkMuted}>
          これまでに開始した回数
        </AppText>
        <View style={styles.valueRow}>
          <AppText variant="display">{metrics.startedCount}</AppText>
          <AppText color={colors.inkMuted}>回</AppText>
        </View>
        <AppText variant="caption" color={colors.inkMuted}>
          増えるだけの数字です。割合や達成度としては表示しません。
        </AppText>
      </Card>

      <Card tone="green" style={styles.weekCard}>
        <AppText variant="caption" color={colors.inkMuted}>
          直近7日
        </AppText>
        <AppText variant="heading">{metrics.weekStarts}回、最初の一歩を開始</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          多さを評価する表示ではありません。0回の週があっても記録はそのままです。
        </AppText>
      </Card>

      <AppText variant="heading" style={styles.sectionTitle}>
        役立ったかもしれない工夫
      </AppText>
      {metrics.topIntervention ? (
        <Card>
          <AppText variant="label">負担が軽かった記録に残る工夫</AppText>
          <AppText variant="heading" color={colors.primary}>
            {INTERVENTION_LABELS[metrics.topIntervention]}
          </AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            「ここで終了（成功）」「もう少し続ける」、または開始後のイヤさが下がった
            {metrics.topInterventionEvidenceCount}件の記録を手がかりにしています。効果や原因を示すものではありません。
          </AppText>
        </Card>
      ) : (
        <EmptyCard text="ふりかえりが集まると、負担が軽かった記録で使った工夫をここに表示します。" />
      )}

      <AppText variant="heading" style={styles.sectionTitle}>
        状態との傾向
      </AppText>
      {metrics.activationTrend ? (
        <Card tone="blue">
          <AppText variant="label">まだ小さなサンプルです</AppText>
          <AppText>{formatActivationTrend(metrics.activationTrend)}</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            これは記録上の相関にすぎず、睡眠・気分・覚醒が原因だとは判断しません。
          </AppText>
        </Card>
      ) : (
        <EmptyCard
          text={
            metrics.joinedStateAttemptCount < 5
              ? `開始プランと同じ日の状態記録が5組以上になると傾向を表示します（現在${metrics.joinedStateAttemptCount}組）。`
              : '同じ日の記録は5組以上あります。動けそうな感覚が低めの日と、それ以外の日の両方が集まると比べられます。'
          }
        />
      )}

      <AppText variant="heading" style={styles.sectionTitle}>
        最近の計画と開始
      </AppText>
      <View style={styles.history}>
        {summary.attempts.slice(0, 8).map((attempt) => {
          const started = Boolean(attempt.startedAt);
          return (
            <Card key={attempt.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={[styles.historyDot, !started && styles.historyDotPlanned]} />
                <View style={styles.historyCopy}>
                  <AppText variant="label" numberOfLines={2}>
                    {attempt.taskText}
                  </AppText>
                  <AppText variant="caption" color={colors.inkMuted}>
                    {formatAttempt(attempt)} · {attempt.plan.durationMinutes}分
                  </AppText>
                </View>
                <AppText variant="caption" color={started ? colors.primary : colors.inkMuted}>
                  {started ? '開始' : '計画'}
                </AppText>
              </View>
            </Card>
          );
        })}
        {!summary.attempts.length ? <EmptyCard text="まだ計画はありません。「今、始める」から最初の一歩を作れます。" /> : null}
      </View>
    </Screen>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <AppText color={colors.inkMuted}>{text}</AppText>
    </Card>
  );
}

function formatAttempt(attempt: TaskAttempt) {
  const date = new Date(attempt.startedAt ?? attempt.createdAt);
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center' },
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  startsCard: { gap: spacing.xs },
  weekCard: { marginTop: spacing.md },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.md },
  history: { gap: spacing.sm },
  historyCard: { padding: spacing.md, borderRadius: radii.md },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  historyDotPlanned: { backgroundColor: colors.inkMuted },
  historyCopy: { flex: 1, gap: 2 },
});
