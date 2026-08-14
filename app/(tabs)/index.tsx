import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const examples = ['机を片付ける', 'メールを1通返す', 'お風呂に入る'];

function formatToday() {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());
}

export default function HomeScreen() {
  const [taskText, setTaskText] = useState('');
  const beginTask = useAppStore((state) => state.beginTask);
  const today = useMemo(() => formatToday(), []);

  function start() {
    const value = taskText.trim();
    if (!value) return;
    beginTask(value);
    router.push('/assessment');
  }

  return (
    <Screen contentStyle={styles.screen} testID="home-screen">
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color={colors.inkMuted}>
            {today}
          </AppText>
          <AppText variant="title">今の一歩だけ。</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="今日の状態を記録"
          onPress={() => router.push('/check-in')}
          style={styles.checkInIcon}
        >
          <Ionicons name="sunny-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="なぜ動けなくなるかを見る"
        onPress={() => router.push('/(tabs)/learn')}
        style={styles.purposeCard}
      >
        <View style={styles.purposeIcon} accessibilityElementsHidden>
          <Ionicons name="compass-outline" size={22} color={colors.info} />
        </View>
        <View style={styles.purposeCopy}>
          <AppText variant="label">「やりたいのに動けない」を分解します</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            意志ではなく、判断・不快感・覚醒・環境の開始コストを軽くします。
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
      </Pressable>

      <Card style={styles.heroCard}>
        <View style={styles.heroIcon} accessibilityElementsHidden>
          <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
        </View>
        <AppText variant="heading">いま、何を始めたいですか？</AppText>
        <AppText color={colors.inkMuted}>
          完成させなくて大丈夫。最初の30秒を一緒に決めます。
        </AppText>
        <TextInput
          testID="task-input"
          accessibilityLabel="始めたいこと"
          placeholder="例：机を片付けたい"
          placeholderTextColor="#89948E"
          value={taskText}
          onChangeText={setTaskText}
          onSubmitEditing={start}
          returnKeyType="go"
          maxLength={500}
          multiline
          style={styles.input}
        />
        <AppText variant="caption" color={colors.inkMuted} style={styles.counter}>
          {taskText.length} / 500
        </AppText>
        <AppButton
          testID="home-start"
          label="今、始める"
          icon="arrow-forward"
          disabled={!taskText.trim()}
          onPress={start}
        />
      </Card>

      <View style={styles.examples}>
        <AppText variant="caption" color={colors.inkMuted}>
          たとえば
        </AppText>
        <View style={styles.chipRow}>
          {examples.map((example) => (
            <Pressable
              key={example}
              accessibilityRole="button"
              onPress={() => setTaskText(example)}
              style={styles.chip}
            >
              <AppText variant="caption">{example}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <Card tone="green" style={styles.reminder}>
        <View style={styles.reminderRow}>
          <Ionicons name="checkmark-circle-outline" size={23} color={colors.primary} />
          <View style={styles.reminderCopy}>
            <AppText variant="label">今日の成功の定義</AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              終わらせることではなく、開始ボタンを押して最初の動きをしたこと。
            </AppText>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  checkInIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  heroCard: {
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
  purposeCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: '#C9DFE8',
  },
  purposeIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  purposeCopy: { flex: 1, gap: 2 },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  input: {
    minHeight: 104,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.canvas,
    color: colors.ink,
    fontSize: 18,
    lineHeight: 27,
    textAlignVertical: 'top',
  },
  counter: { textAlign: 'right', marginTop: -spacing.sm },
  examples: { marginTop: spacing.xl, gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  reminder: { marginTop: spacing.xxl },
  reminderRow: { flexDirection: 'row', gap: spacing.md },
  reminderCopy: { flex: 1, gap: spacing.xs },
});
