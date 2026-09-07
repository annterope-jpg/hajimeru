import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const steps = [
  ['1', '本人の許可を確認', '一緒に見ること、扱う課題、途中でやめられることを確認します。'],
  ['2', '本人が端末を操作', '支援者は一度に1問だけ補助し、本人の言葉と選択を優先します。'],
  ['3', '仮説を照合', '「近い・違う・まだ分からない」のどれかを尋ね、正解として説明しません。'],
  ['4', '一歩を共同で選ぶ', '試す・直す・見送る・休むから本人が選びます。開始後は完了を求めません。'],
] as const;

export default function TherapistGuideScreen() {
  return (
    <Screen testID="therapist-guide-screen">
      <AppText variant="caption" color={colors.primary}>本人と支援者が同じ画面を見るとき</AppText>
      <AppText variant="title" style={styles.title}>共同利用の短いガイド</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        この画面は本人にも見える共通ガイドです。専門職だけの評価画面や自動共有はありません。
      </AppText>

      <Card tone="amber" style={styles.card}>
        <AppText variant="label">最初に伝えること</AppText>
        <AppText color={colors.inkMuted}>
          「やる気や能力を採点せず、今の始めにくさに合う小さな実験を一緒に探します。使わない、途中でやめる、記録を見せないことも選べます」
        </AppText>
      </Card>

      <View style={styles.steps}>
        {steps.map(([number, title, body]) => (
          <View key={number} style={styles.step}>
            <View style={styles.number} accessibilityElementsHidden>
              <AppText variant="label" color={colors.white}>{number}</AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="label">{title}</AppText>
              <AppText variant="caption" color={colors.inkMuted}>{body}</AppText>
            </View>
          </View>
        ))}
      </View>

      <Card tone="danger" style={styles.card}>
        <AppText variant="label">安全上の懸念が出たら</AppText>
        <AppText color={colors.inkMuted}>
          アプリの操作を止め、専門職としての責務と所属機関の手順を優先します。アプリの安全表示は臨床的リスク評価の代わりではありません。
        </AppText>
      </Card>

      <Card tone="blue" style={styles.card}>
        <AppText variant="label">記録と共有</AppText>
        <AppText color={colors.inkMuted}>
          同じ画面を見ることはデータ共有への同意ではありません。タスク文や記録を見せる範囲は本人が選び、アプリから支援者へ自動送信しません。
        </AppText>
      </Card>

      <AppText variant="caption" color={colors.inkMuted}>
        現在はUX確認用試作です。このガイドは診療手順や専門職の判断を置き換えません。
      </AppText>
      <AppButton label="データと同意を確認" variant="secondary" onPress={() => router.push('/data-permissions')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xs },
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  card: { marginBottom: spacing.md },
  steps: { gap: spacing.lg, marginVertical: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  number: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
});
