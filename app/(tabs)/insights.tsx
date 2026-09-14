import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import {
  createPersonalInsightSummary,
  formatPersonalActivationPattern,
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
  const [summary, setSummary] = useState<Summary>({ attempts: [], dailyStates: [] });

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

  const personalInsights = useMemo(
    () =>
      createPersonalInsightSummary(
        summary,
      ),
    [summary],
  );

  return (
    <Screen testID="insights-screen">
      <AppText variant="title">試した条件のメモ</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        始めた一歩も、あとで見返すために残した一歩も、今の条件を知る手がかりです。回数や連続日数で評価しません。
      </AppText>

      <AppText variant="heading" style={styles.sectionTitle}>
        一歩のあとに残った手がかり
      </AppText>
      {personalInsights.topIntervention ? (
        <Card>
          <AppText variant="label">ふりかえりと一緒に残っていた工夫</AppText>
          <AppText variant="heading" color={colors.primary}>
            {INTERVENTION_LABELS[personalInsights.topIntervention]}
          </AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            開始後に区切りをつけた、もう少し続けた、またはイヤさの数値が下がった場面に一緒に残っていた条件です。この工夫の効果や、動けた原因を示すものではありません。
          </AppText>
        </Card>
      ) : (
        <EmptyCard text="開始後にふりかえりを残したときは、その場面に一緒にあった工夫をここで見返せます。残さなくても大丈夫です。" />
      )}

      <AppText variant="heading" style={styles.sectionTitle}>
        状態と一歩の記録
      </AppText>
      {personalInsights.hasActivationPattern ? (
        <Card tone="blue">
          <AppText variant="label">記録の並び方から見えること</AppText>
          <AppText>{formatPersonalActivationPattern()}</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            これは記録上の相関にすぎず、睡眠・気分・覚醒が原因だとは判断しません。
          </AppText>
        </Card>
      ) : (
        <EmptyCard text="状態と開始プランを同じ日に記録した場面がいくつか集まると、時間帯や動作の大きさを考える手がかりを表示します。記録を増やす必要はありません。" />
      )}

      <AppText variant="heading" style={styles.sectionTitle}>
        最近残した一歩
      </AppText>
      <View style={styles.history}>
        {summary.attempts.slice(0, 8).map((attempt) => {
          const started = Boolean(attempt.startedAt);
          return (
            <Card key={attempt.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={styles.historyCopy}>
                  <AppText variant="label" numberOfLines={2}>
                    {attempt.taskText}
                  </AppText>
                  <AppText variant="caption" color={colors.inkMuted}>
                    {formatAttempt(attempt)} · {attempt.plan.durationMinutes}分だけ試す案
                  </AppText>
                  <AppText variant="caption" color={colors.inkMuted} numberOfLines={2}>
                    最初の一歩：{attempt.plan.firstAction}
                  </AppText>
                  <AppText
                    accessibilityRole="link"
                    variant="caption"
                    color={colors.primary}
                    onPress={() => router.push({ pathname: '/share-summary', params: { attemptId: attempt.id } } as never)}
                  >
                    面談に持っていくメモを作る
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.primary}>
                  {started ? '試した一歩' : '残してある一歩'}
                </AppText>
              </View>
            </Card>
          );
        })}
        {!summary.attempts.length ? <EmptyCard text="ここには、作った一歩を必要なときだけ残せます。記録がなくても問題ありません。" /> : null}
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
  const date = new Date(attempt.createdAt);
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.md },
  history: { gap: spacing.sm },
  historyCard: { padding: spacing.md, borderRadius: radii.md },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyCopy: { flex: 1, gap: 2 },
});
