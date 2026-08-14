import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import {
  BOTTLENECK_LABELS,
  assessBottlenecks,
  classifySafety,
  createDefaultUserPreferences,
  createLocalInterventionPlan,
  inferTaskCategory,
  type ActionSuggestion,
  type InterventionPlan,
  type TaskAttempt,
  type UserPreferences,
} from '@/domain';
import { requestEntrySuggestions } from '@/services/ai';
import { requestNotificationPermission, scheduleStartCue } from '@/services/notifications';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const fallbackPreferences = createDefaultUserPreferences();

const BOTTLENECK_EXPLANATIONS: Record<keyof typeof BOTTLENECK_LABELS, string> = {
  taskClarity: '課題全体に判断が多く、最初の身体動作を選ぶ前に負荷が上がっています。',
  lowActivation: '眠さやぼんやり、身体の重さが、動き出すためのコストを上げています。',
  aversion: '退屈、不安、面倒さなどから離れると一時的に楽になるため、回避が起きやすい状態です。',
  cueWeakness: '脱線したり次の行動を見失ったりしたときに、外から戻る目印が不足しています。',
  competingReward: 'スマホなど、すぐ楽になる別の行動のほうが近く選びやすい状態です。',
  rewardDistance: '課題の手応えが先にあり、今感じる努力に比べて遠くなっています。',
  timeAmbiguity: '開始時点が「あとで」のままで、行動へ切り替える瞬間が見えにくい状態です。',
};

function labelOrFallback(key: string) {
  return BOTTLENECK_LABELS[key as keyof typeof BOTTLENECK_LABELS] ?? key;
}

export default function PlanScreen() {
  const { attemptId: linkedAttemptId } = useLocalSearchParams<{ attemptId?: string | string[] }>();
  const taskText = useAppStore((state) => state.taskText);
  const draft = useAppStore((state) => state.assessmentDraft);
  const selectedDuration = useAppStore((state) => state.selectedDurationMinutes);
  const setDuration = useAppStore((state) => state.setDuration);
  const activePlan = useAppStore((state) => state.activePlan);
  const activeAttemptId = useAppStore((state) => state.activeAttemptId);
  const activeRoadmap = useAppStore((state) => state.activeRoadmap);
  const setPlan = useAppStore((state) => state.setPlan);
  const setRoadmap = useAppStore((state) => state.setRoadmap);
  const updateAssessment = useAppStore((state) => state.updateAssessment);
  const startTimer = useAppStore((state) => state.startTimer);
  const prepareAttempt = useAppStore((state) => state.prepareAttempt);
  const restoreAttempt = useAppStore((state) => state.restoreAttempt);

  const [preferences, setPreferences] = useState<UserPreferences>(fallbackPreferences);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string>();
  const [aiSuggestions, setAiSuggestions] = useState<ActionSuggestion[]>([]);
  const [restoreState, setRestoreState] = useState<'idle' | 'loading' | 'done'>(
    linkedAttemptId ? 'loading' : 'idle',
  );
  const [beginning, setBeginning] = useState(false);
  const [cueOpen, setCueOpen] = useState(false);
  const [cueHour, setCueHour] = useState('19');
  const [cueMinute, setCueMinute] = useState('00');
  const [cueSaving, setCueSaving] = useState(false);

  useEffect(() => {
    const id = Array.isArray(linkedAttemptId) ? linkedAttemptId[0] : linkedAttemptId;
    if (!id) return;
    let active = true;
    void getLocalRepository()
      .getAttempt(id)
      .then((attempt) => {
        if (!active) return;
        if (attempt) restoreAttempt(attempt);
        else router.replace('/(tabs)');
      })
      .finally(() => {
        if (active) setRestoreState('done');
      });
    return () => {
      active = false;
    };
  }, [linkedAttemptId, restoreAttempt]);

  const restoring = restoreState === 'loading';

  const assessment = useMemo(
    () =>
      assessBottlenecks({
        taskClarity: draft.taskClarity ?? null,
        aversion: draft.aversion ?? null,
        lowActivation: draft.lowActivation ?? null,
        rewardDistance: draft.rewardDistance ?? null,
        timeAmbiguity: draft.timeAmbiguity ?? null,
        cueWeakness: draft.cueWeakness ?? null,
        competingReward: draft.competingReward ?? null,
      }),
    [draft],
  );
  const category = useMemo(() => inferTaskCategory(taskText), [taskText]);
  const safety = useMemo(() => classifySafety(taskText), [taskText]);

  const createAttempt = useCallback(
    (id: string, startedAt: string | null, createdAt?: string): TaskAttempt => {
      const now = new Date().toISOString();
      return {
        id,
        taskText,
        category,
        assessment,
        plan: activePlan!,
        roadmap: activeRoadmap ?? null,
        createdAt: createdAt ?? now,
        startedAt,
        endedAt: null,
        outcome: null,
        reflection: {
          aversionBefore: assessment.answers.aversion,
          aversionAfter: null,
          actualDifficulty: null,
          wantsToContinue: null,
        },
        updatedAt: now,
        deletedAt: null,
      };
    },
    [activePlan, activeRoadmap, assessment, category, taskText],
  );

  useEffect(() => {
    if (restoring) return;
    if (!taskText) {
      router.replace('/(tabs)');
      return;
    }
    if (!linkedAttemptId) {
      const plan = createLocalInterventionPlan({
        taskText,
        assessment,
        category,
        durationMinutes: selectedDuration,
        valueAnchor: draft.valueAnchor,
        forgettingWorry: draft.forgettingWorry ?? null,
      });
      const adjustedPlan = applyDraftOverrides(plan, draft.eventCue, draft.competingAction);
      setPlan(adjustedPlan);
      if (!draft.roadmapRequested) setRoadmap(undefined);
    }
    void getLocalRepository()
      .getPreferences()
      .then((stored) => setPreferences(stored ?? fallbackPreferences))
      .catch(() => undefined);
  }, [assessment, category, draft.competingAction, draft.eventCue, draft.forgettingWorry, draft.roadmapRequested, draft.valueAnchor, linkedAttemptId, restoring, selectedDuration, setPlan, setRoadmap, taskText]);

  function openRoadmap() {
    if (!activeRoadmap) updateAssessment({ roadmapRequested: true });
    router.push('/roadmap');
  }

  useEffect(() => {
    if (restoring || !activePlan || !taskText || safety.level !== 'safe') return;
    let active = true;
    const id = activeAttemptId ?? Crypto.randomUUID();
    void getLocalRepository()
      .getAttempt(id)
      .then(async (existing) => {
        if (!active || existing?.startedAt) return;
        const attempt = createAttempt(id, null, existing?.createdAt);
        await getLocalRepository().saveAttempt(attempt, {
          entityId: id,
          updatedAt: attempt.updatedAt,
        });
        if (active && !activeAttemptId) prepareAttempt(id);
      });
    return () => {
      active = false;
    };
  }, [activeAttemptId, activePlan, createAttempt, prepareAttempt, restoring, safety.level, taskText]);

  async function toggleAi(value: boolean) {
    const next: UserPreferences = {
      ...preferences,
      aiConsentGranted: value,
      updatedAt: new Date().toISOString(),
    };
    setPreferences(next);
    await getLocalRepository().savePreferences(next);
  }

  async function askAi() {
    if (!activePlan || !preferences.aiConsentGranted) return;
    setAiLoading(true);
    setAiNote(undefined);
    setAiSuggestions([]);
    try {
      const result = await requestEntrySuggestions(
        {
          taskText,
          taskCategory: category,
          bottlenecks: assessment.primaryBottlenecks,
        },
        { consentGranted: preferences.aiConsentGranted },
      );
      if (result.source === 'ai') {
        setAiSuggestions(result.suggestions);
        setAiNote('3案から、今いちばん軽く感じるものを選べます。');
      } else {
        setAiNote(result.guidance ?? '通信せず、端末内の案をそのまま使います。');
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function begin() {
    if (!activePlan || beginning) return;
    setBeginning(true);
    try {
      const now = new Date();
      const linkedId = Array.isArray(linkedAttemptId) ? linkedAttemptId[0] : linkedAttemptId;
      const attemptId = linkedId ?? activeAttemptId ?? Crypto.randomUUID();
      const storedAttempt = await getLocalRepository().getAttempt(attemptId);
      const startedAt = now.toISOString();
      const endsAt = new Date(now.getTime() + activePlan.durationMinutes * 60_000).toISOString();
      const attempt = createAttempt(attemptId, startedAt, storedAttempt?.createdAt);
      await getLocalRepository().saveAttempt(attempt, { entityId: attemptId, updatedAt: attempt.updatedAt });
      await startTimer(attemptId, startedAt, endsAt);
      router.replace('/timer');
    } finally {
      setBeginning(false);
    }
  }

  async function scheduleCue() {
    if (!activePlan || cueSaving) return;
    const hour = Number(cueHour);
    const minute = Number(cueMinute);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
      Alert.alert('時刻を確認してください', '0〜23時、0〜59分で入力してください。');
      return;
    }
    setCueSaving(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        Alert.alert('通知は設定されませんでした', '通知なしでも、いつでもホームから開始できます。');
        return;
      }
      const notificationPreferences: UserPreferences = {
        ...preferences,
        notificationsEnabled: true,
        updatedAt: new Date().toISOString(),
      };
      setPreferences(notificationPreferences);
      await getLocalRepository().savePreferences(notificationPreferences);
      const id = activeAttemptId ?? Crypto.randomUUID();
      const existing = await getLocalRepository().getAttempt(id);
      const attempt = createAttempt(id, null, existing?.createdAt);
      await getLocalRepository().saveAttempt(attempt, { entityId: id, updatedAt: attempt.updatedAt });
      const result = await scheduleStartCue({
        attemptId: id,
        eventName: activePlan.startCue,
        hour,
        minute,
      });
      if (!result.scheduled) {
        Alert.alert('通知を設定できませんでした', '入力は失われていません。今すぐ開始することもできます。');
        return;
      }
      prepareAttempt(id);
      Alert.alert(
        '開始の合図を設定しました',
        `${cueHour.padStart(2, '0')}:${cueMinute.padStart(2, '0')}ごろに端末内で知らせます。`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
      );
    } finally {
      setCueSaving(false);
    }
  }

  if (restoring || !taskText || !activePlan) return null;

  if (safety.level !== 'safe') {
    return <SafetyRoute level={safety.level} guidance={safety.guidance} />;
  }

  return (
    <Screen
      testID="plan-screen"
      footer={
        <AppButton
          testID="plan-start"
          label="開始できた"
          icon="play"
          loading={beginning}
          onPress={() => void begin()}
        />
      }
    >
      <AppText variant="caption" color={colors.primary}>
        開始プラン
      </AppText>
      <AppText variant="title" style={styles.title}>
        最初の一歩は、これだけ
      </AppText>
      <Card tone="green" style={styles.actionCard}>
        <View style={styles.stepBadge}>
          <AppText variant="caption" color={colors.white}>
            30秒以内
          </AppText>
        </View>
        <AppText variant="heading">{activePlan.firstAction}</AppText>
        <AppText color={colors.inkMuted}>{activePlan.supportiveMessage}</AppText>
      </Card>

      {activePlan.bottlenecks.length ? (
        <Card tone="blue" style={styles.hypothesisCard}>
          <AppText variant="label">今回の「動けない」の仮説</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            回答した範囲から、開始コストを上げていそうな要因を最大2つに絞りました。診断ではなく、今この場面で試す仮説です。
          </AppText>
          <View style={styles.chipRow}>
            {activePlan.bottlenecks.map((item) => (
              <View key={item} style={styles.hypothesisRow}>
                <AppText variant="label" color={colors.primary}>
                  {labelOrFallback(item)}
                </AppText>
                <AppText variant="caption" color={colors.inkMuted}>
                  {BOTTLENECK_EXPLANATIONS[item]}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card tone={activeRoadmap ? 'amber' : 'default'} style={styles.roadmapCard}>
        <View style={styles.roadmapHeader}>
          <View style={styles.roadmapIcon} accessibilityElementsHidden>
            <Ionicons name="map-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.planCopy}>
            <AppText variant="label">{activeRoadmap ? '相談内容を反映した、仮の地図があります' : '課題が大きすぎて、入口が見えないとき'}</AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              {activeRoadmap ? '今の一歩だけを強調し、その後は粗い見通しとして表示します。' : '先に「何が分からないか」を短く確認してから、「今・次・あとで」の仮の地図にします。'}
            </AppText>
          </View>
        </View>
        <AppButton
          testID="open-roadmap"
          label={activeRoadmap ? 'ロードマップを見る' : '迷いを整理して地図を作る'}
          variant="secondary"
          compact
          icon="map-outline"
          onPress={openRoadmap}
        />
      </Card>

      <View style={styles.planItems}>
        <PlanRow label="始めるきっかけ" value={activePlan.startCue} />
        {activePlan.activationRitual ? <PlanRow label="起動の準備" value={activePlan.activationRitual} /> : null}
        {activePlan.distractionFriction ? (
          <PlanRow label="妨害を減らす" value={activePlan.distractionFriction} />
        ) : null}
        {activePlan.microReward ? <PlanRow label="小さな手応え" value={activePlan.microReward} /> : null}
        {activePlan.valueAnchor ? <PlanRow label="この一歩の意味" value={activePlan.valueAnchor} /> : null}
        {activePlan.returnCue ? <PlanRow label="脱線・失念から戻る目印" value={activePlan.returnCue} /> : null}
        {activePlan.reassuranceAction ? <PlanRow label="忘れる心配を頭から下ろす" value={activePlan.reassuranceAction} /> : null}
      </View>

      <AppText variant="label" style={styles.sectionTitle}>
        何分だけ試しますか？
      </AppText>
      <View style={styles.durationRow}>
        {([1, 3, 5] as const).map((minutes) => (
          <Pressable
            key={minutes}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedDuration === minutes }}
            onPress={() => setDuration(minutes)}
            style={[styles.duration, selectedDuration === minutes && styles.durationSelected]}
          >
            <AppText
              variant="heading"
              color={selectedDuration === minutes ? colors.white : colors.ink}
            >
              {minutes}
            </AppText>
            <AppText variant="caption" color={selectedDuration === minutes ? colors.white : colors.inkMuted}>
              分
            </AppText>
          </Pressable>
        ))}
      </View>

      <Card style={styles.cueCard}>
        <AppButton
          label={cueOpen ? '通知の設定を閉じる' : '今ではなく、開始の合図を作る'}
          variant="secondary"
          compact
          icon="notifications-outline"
          onPress={() => setCueOpen((value) => !value)}
        />
        {cueOpen ? (
          <View style={styles.cueEditor}>
            <AppText variant="caption" color={colors.inkMuted}>
              「{activePlan.startCue}」を目印に、おおよその時刻で1回だけ知らせます。
            </AppText>
            <View style={styles.timeRow}>
              <TextInput
                accessibilityLabel="通知する時"
                value={cueHour}
                onChangeText={setCueHour}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.timeInput}
              />
              <AppText variant="heading">:</AppText>
              <TextInput
                accessibilityLabel="通知する分"
                value={cueMinute}
                onChangeText={setCueMinute}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.timeInput}
              />
            </View>
            <AppButton
              label="この合図を端末に設定"
              compact
              loading={cueSaving}
              onPress={() => void scheduleCue()}
            />
          </View>
        ) : null}
      </Card>

      <Card style={styles.aiCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <AppText variant="label">AIで最初の動きを言い換える</AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              任意。同期用メールでサインイン後、今回のタスク文・分類・最大2つのボトルネックだけをOpenAIへ送ります。履歴や状態記録は送りません。
            </AppText>
          </View>
          <Switch
            accessibilityLabel="AI提案への同意"
            value={preferences.aiConsentGranted}
            onValueChange={(value) => void toggleAi(value)}
            trackColor={{ false: colors.line, true: colors.primarySoft }}
            thumbColor={preferences.aiConsentGranted ? colors.primary : '#909992'}
          />
        </View>
        {preferences.aiConsentGranted ? (
          <AppButton label="AIの案を試す" variant="secondary" compact loading={aiLoading} onPress={() => void askAi()} />
        ) : null}
        {aiNote ? (
          <AppText variant="caption" color={colors.inkMuted}>
            {aiNote}
          </AppText>
        ) : null}
        {aiSuggestions.length ? (
          <View style={styles.aiSuggestions}>
            {aiSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion.action}
                accessibilityRole="button"
                accessibilityLabel={`最初の行動にする：${suggestion.action}`}
                onPress={() => {
                  setPlan({ ...activePlan, firstAction: suggestion.action, source: 'ai' });
                  if (activeRoadmap) {
                    setRoadmap({
                      ...activeRoadmap,
                      steps: activeRoadmap.steps.map((step) =>
                        step.kind === 'now' ? { ...step, description: suggestion.action } : step,
                      ),
                    });
                  }
                  setAiSuggestions([]);
                  setAiNote('選んだ案で開始プランを更新しました。');
                }}
                style={styles.aiSuggestion}
              >
                <AppText variant="label">{suggestion.action}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

function applyDraftOverrides(plan: InterventionPlan, eventCue?: string, competingAction?: string) {
  return {
    ...plan,
    startCue: eventCue?.trim() || plan.startCue,
    distractionFriction: competingAction?.trim()
      ? `${competingAction.trim()}を手の届きにくい状態にする`
      : plan.distractionFriction,
  };
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.planRow}>
      <View style={styles.planDot} />
      <View style={styles.planCopy}>
        <AppText variant="caption" color={colors.inkMuted}>
          {label}
        </AppText>
        <AppText variant="label">{value}</AppText>
      </View>
    </View>
  );
}

function SafetyRoute({ level, guidance }: { level: string; guidance: string | null }) {
  const crisis = level === 'crisis';
  return (
    <Screen footer={<AppButton label="ホームへ戻る" onPress={() => router.replace('/(tabs)')} />}>
      <Card tone="danger" style={styles.safetyCard}>
        <AppText variant="title">{crisis ? '今は、安全を優先してください' : 'この内容はアプリでは案内できません'}</AppText>
        <AppText>{guidance}</AppText>
        {crisis ? (
          <>
            <AppText variant="heading">緊急の危険があるとき：119</AppText>
            <AppText>よりそいホットライン：0120-279-338（24時間）</AppText>
            <AppText>こころの健康相談統一ダイヤル：0570-064-556</AppText>
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs, marginBottom: spacing.xl },
  actionCard: { padding: spacing.xl, gap: spacing.md },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  hypothesisCard: { marginTop: spacing.xl, padding: spacing.xl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hypothesisRow: { width: '100%', gap: 2, paddingTop: spacing.sm },
  roadmapCard: { marginTop: spacing.lg },
  roadmapHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  roadmapIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planItems: { marginTop: spacing.xl, gap: spacing.lg },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  planDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondary, marginTop: 7 },
  planCopy: { flex: 1, gap: 2 },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.md },
  durationRow: { flexDirection: 'row', gap: spacing.md },
  duration: {
    flex: 1,
    minHeight: 74,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  durationSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  cueCard: { marginTop: spacing.xxl },
  cueEditor: { marginTop: spacing.md, gap: spacing.md },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  timeInput: {
    width: 72,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
    textAlign: 'center',
    color: colors.ink,
    fontSize: 20,
  },
  aiCard: { marginTop: spacing.xxl },
  aiSuggestions: { gap: spacing.sm },
  aiSuggestion: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  switchRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  switchCopy: { flex: 1, gap: spacing.xs },
  safetyCard: { padding: spacing.xl, gap: spacing.lg },
});
