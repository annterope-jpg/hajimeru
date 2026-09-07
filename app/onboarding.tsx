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

const mechanisms = [
  ['git-branch-outline', '判断や曖昧さ', '最初の動作や区切りが見えず、選ぶ負担が増えている。'],
  ['cloud-outline', '不快感や緊張', '不安、退屈、恥などから離れると、一時的に楽になる。'],
  ['battery-dead-outline', '今の身体や環境', '眠さ、ぼんやり、弱い合図、スマホなどが切り替えを難しくする。'],
] as const;

const promises = [
  ['search-outline', '原因や診断を決めない', '答えは正解・不正解ではなく、今の場面を考える材料です。'],
  ['flask-outline', '小さく試して確かめる', '30秒の一歩を、合えば使い、違えば直せます。'],
  ['hand-left-outline', '使い方は本人が選ぶ', '一人でも、誰かと一緒でも。見送る・休む・共有しないことも選べます。'],
] as const;

export default function OnboardingScreen() {
  const [step, setStep] = useState<1 | 2>(1);
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
        step === 1 ? (
          <AppButton
            testID="onboarding-next"
            label="使い方と選べることへ"
            icon="arrow-forward"
            onPress={() => setStep(2)}
          />
        ) : (
          <AppButton
            testID="onboarding-continue"
            label="はじめる"
            icon="arrow-forward"
            disabled={!adultConfirmed}
            onPress={() => void continueToApp()}
          />
        )
      }
    >
      {step === 1 ? (
        <>
          <View style={styles.mark} accessibilityElementsHidden>
            <Ionicons name="footsteps" size={30} color={colors.primary} />
          </View>
          <AppText variant="display" style={styles.title}>はじめの地図</AppText>
          <AppText variant="heading" style={styles.tagline}>始めにくさをほどく、{`\n`}小さな行動実験。</AppText>
          <AppText color={colors.inkMuted} style={styles.lead}>
            したい気持ちを採点せず、今の「動きにくさ」を整理し、次に試す一歩を本人が選ぶセルフマネジメントツールです。
          </AppText>
          <Card tone="amber" style={styles.modelCard}>
            <AppText variant="label">同じ「動けない」でも、支え方は同じとは限りません</AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              目標が大切でも、今の判断・不快感・身体状態などの開始コストが大きいと止まりやすくなります。このアプリは原因を決めず、今の場面に合いそうな仮説を小さく試します。
            </AppText>
          </Card>
          <View style={styles.principles}>
            {mechanisms.map(([icon, title, body]) => (
              <View key={title} style={styles.principle}>
                <View style={styles.iconCircle} accessibilityElementsHidden>
                  <Ionicons name={icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.principleCopy}>
                  <AppText variant="label">{title}</AppText>
                  <AppText variant="caption" color={colors.inkMuted}>{body}</AppText>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <AppText variant="caption" color={colors.primary}>このアプリの3つの約束</AppText>
          <AppText variant="title" style={styles.choiceTitle}>使う人が、進み方を選べます</AppText>
          <AppText color={colors.inkMuted} style={styles.lead}>
            覚えるためのテストではありません。迷ったときに、この3点へ戻れます。
          </AppText>
          <View style={styles.principles}>
            {promises.map(([icon, title, body]) => (
              <View key={title} style={styles.principle}>
                <View style={styles.iconCircle} accessibilityElementsHidden>
                  <Ionicons name={icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.principleCopy}>
                  <AppText variant="label">{title}</AppText>
                  <AppText variant="caption" color={colors.inkMuted}>{body}</AppText>
                </View>
              </View>
            ))}
          </View>
          <Card tone="blue" style={styles.notice}>
            <AppText variant="label">記録は自動で誰かに送られません</AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              誰かと一緒に画面を見る場合も、見せる内容は本人が選びます。AI・通知・同期は、必要な機能を使う直前に別々に確認します。
            </AppText>
          </Card>
          <Card style={styles.notice}>
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
            <AppText variant="label" style={styles.checkboxText}>18歳以上です</AppText>
          </Pressable>
          <AppButton label="説明に戻る" variant="quiet" compact onPress={() => setStep(1)} />
        </>
      )}
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
  title: { marginBottom: spacing.sm },
  choiceTitle: { marginTop: spacing.xs, marginBottom: spacing.sm },
  tagline: { marginBottom: spacing.md },
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
