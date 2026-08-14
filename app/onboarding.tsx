import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const principles = [
  ['play-circle-outline', '開始を成功にする', '終わらせなくても、始めた時点で一歩です。'],
  ['resize-outline', '最初の動きを小さくする', '30秒以内の具体的な行動まで一緒に下げます。'],
  ['leaf-outline', '評価しない', 'ストリークや未達警告は使いません。'],
] as const;

export default function OnboardingScreen() {
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);

  async function continueToApp() {
    await finishOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <Screen
      testID="onboarding-screen"
      footer={
        <AppButton
          testID="onboarding-continue"
          label="はじめる"
          icon="arrow-forward"
          disabled={!adultConfirmed}
          onPress={() => void continueToApp()}
        />
      }
    >
      <View style={styles.mark} accessibilityElementsHidden>
        <Ionicons name="footsteps" size={30} color={colors.primary} />
      </View>
      <AppText variant="display" style={styles.title}>
        やる気を待たずに、{`\n`}最初の一歩へ。
      </AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        「いま、はじめる」は、したい気持ちを採点せず、着手しづらい日常の行動を小さく整えるセルフマネジメントツールです。
      </AppText>

      <Card tone="amber" style={styles.modelCard}>
        <AppText variant="label">できない＝意志が弱い、とは限りません</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          課題が大きく曖昧、結果が遠い、身体が重い、イヤな感じが強い——今の開始コストが目標の価値を上回ると、やりたいことでも止まりやすくなります。
        </AppText>
      </Card>

      <View style={styles.principles}>
        {principles.map(([icon, title, body]) => (
          <View key={title} style={styles.principle}>
            <View style={styles.iconCircle}>
              <Ionicons name={icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.principleCopy}>
              <AppText variant="label">{title}</AppText>
              <AppText variant="caption" color={colors.inkMuted}>
                {body}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <Card tone="blue" style={styles.notice}>
        <AppText variant="label">医療サービスではありません</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          ADHDの診断・治療・服薬の判断は行いません。診断や治療については、専門の医療機関へご相談ください。
        </AppText>
      </Card>

      <Pressable
        testID="age-confirm-checkbox"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: adultConfirmed }}
        accessibilityLabel="18歳以上です"
        onPress={() => setAdultConfirmed((value) => !value)}
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, adultConfirmed && styles.checkboxChecked]}>
          {adultConfirmed ? <Ionicons name="checkmark" color={colors.white} size={18} /> : null}
        </View>
        <AppText variant="label" style={styles.checkboxText}>
          18歳以上です
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { marginBottom: spacing.md },
  lead: { marginBottom: spacing.xxl },
  principles: { gap: spacing.xl, marginBottom: spacing.xxl },
  modelCard: { marginBottom: spacing.xxl },
  principle: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  principleCopy: { flex: 1, gap: 2 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  notice: { marginBottom: spacing.xl },
  checkboxRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkboxText: { marginLeft: spacing.md, flex: 1 },
});
