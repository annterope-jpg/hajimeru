import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const items = [
  ['端末中心', '開始記録と状態記録は、まず端末内のSQLiteへ保存します。ネット接続やアカウントは必須ではありません。'],
  ['機能ごとの同意', '通知、AI提案、同期はそれぞれ利用直前に選べ、後から撤回できます。'],
  ['AIへ送る範囲', '同意時も、送信するのはそのタスク文、分類、最大2つのボトルネックだけです。履歴・睡眠・気分・メールアドレスは送りません。'],
  ['広告・外部分析なし', '広告SDKや外部行動分析SDKは組み込みません。記録を広告目的で利用しません。'],
  ['自分で書き出し・削除', 'JSON/CSVの共有は本人がボタンを押した時だけ行います。端末と同期先のデータは個別に削除できます。'],
] as const;

export default function PrivacyScreen() {
  return (
    <Screen>
      <AppText variant="title">記録は、あなたのものです</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        試作版における取扱い方針です。正式公開前に法務・セキュリティレビューを行います。
      </AppText>
      <View style={styles.list}>
        {items.map(([title, body]) => (
          <Card key={title}>
            <AppText variant="heading">{title}</AppText>
            <AppText color={colors.inkMuted}>{body}</AppText>
          </Card>
        ))}
      </View>
      <AppText variant="caption" color={colors.inkMuted} style={styles.note}>
        健康、障害、服薬等に関する情報は慎重な取扱いが必要です。目的外利用、広告利用、同意のない第三者提供を行わない設計とします。
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  list: { gap: spacing.md },
  note: { marginTop: spacing.xl },
});
