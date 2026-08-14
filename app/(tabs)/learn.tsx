import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

const axes = [
  ['git-branch-outline', '判断が多い', '最初の動作や終わりが曖昧で、始める前に選択が積み重なる。'],
  ['hourglass-outline', '手応えが遠い', '今ある面倒さに対し、得られる結果が先に感じられる。'],
  ['battery-dead-outline', '覚醒が低い', '眠さ、疲労、ぼんやりが身体を動かすコストを上げる。'],
  ['cloud-outline', 'イヤな感じが強い', '退屈、不安、羞恥、自己批判から離れると一時的に楽になる。'],
  ['notifications-off-outline', '合図が弱い', '「あとで」の意図を、ちょうどよい瞬間に思い出しにくい。'],
  ['phone-portrait-outline', '別の報酬が近い', 'スマホなど、すぐ楽になれる行動へ注意が移りやすい。'],
] as const;

const protocol = [
  ['1', '詰まりを見つける', '7つの要因から、今の場面で強いものを最大2つだけ選びます。'],
  ['2', '開始コストを下げる', '30秒以内の身体動作、外部の合図、環境調整へ変えます。'],
  ['3', '1・3・5分だけ試す', '嫌な感じが残っていてもよく、開始した時点を成功にします。'],
  ['4', '予想と実際を比べる', '完了率ではなく、何が開始を助けたかを次の仮説にします。'],
] as const;

export default function LearnScreen() {
  return (
    <Screen testID="learn-screen">
      <AppText variant="title">「したい」と「動ける」は、別です</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        目標に価値を感じていても、今この瞬間の判断・努力・不快感が大きいと、開始コストが上回ります。意志の弱さと決めつけず、その場の条件を分けて見ます。
      </AppText>

      <Card tone="amber" style={styles.equationCard}>
        <AppText variant="caption" color={colors.inkMuted}>起きているかもしれないこと</AppText>
        <AppText variant="heading">目標の価値 ＜ 今の開始コスト</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          締切が近づくと、優先順位が明確になり覚醒も上がるため、急に動けることがあります。これは「本当はいつでもできた」という意味ではありません。
        </AppText>
      </Card>

      <AppText variant="heading" style={styles.sectionTitle}>なぜスタックする？</AppText>
      <View style={styles.axisList}>
        {axes.map(([icon, title, body]) => (
          <View key={title} style={styles.axisRow}>
            <View style={styles.iconCircle} accessibilityElementsHidden>
              <Ionicons name={icon} size={21} color={colors.primary} />
            </View>
            <View style={styles.copy}>
              <AppText variant="label">{title}</AppText>
              <AppText variant="caption" color={colors.inkMuted}>{body}</AppText>
            </View>
          </View>
        ))}
      </View>

      <AppText variant="heading" style={styles.sectionTitle}>このアプリの介入プロトコル</AppText>
      <Card style={styles.protocolCard}>
        {protocol.map(([number, title, body], index) => (
          <View key={number} style={[styles.protocolRow, index > 0 && styles.protocolDivider]}>
            <View style={styles.numberCircle}>
              <AppText variant="label" color={colors.white}>{number}</AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="label">{title}</AppText>
              <AppText variant="caption" color={colors.inkMuted}>{body}</AppText>
            </View>
          </View>
        ))}
      </Card>

      <Card tone="blue" style={styles.noteCard}>
        <AppText variant="label">大きな課題には「仮の地図」</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          細かな予定表を完成させるのではなく、「今・次・あとで」の粗い順序、保留のルール、次の再開点を示します。全部を守る必要はありません。
        </AppText>
      </Card>

      <AppText variant="caption" color={colors.inkMuted} style={styles.disclaimer}>
        これは着手困難に対する日常のセルフマネジメント支援です。ADHDは単一の原因では説明できず、睡眠、気分、不安、身体状態、環境などでも動きやすさは変わります。診断や治療の代わりにはなりません。
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  equationCard: { padding: spacing.xl },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.md },
  axisList: { gap: spacing.lg },
  axisRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 3 },
  protocolCard: { padding: spacing.xl, gap: 0 },
  protocolRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  protocolDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  numberCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCard: { marginTop: spacing.xl },
  disclaimer: { marginTop: spacing.xl, lineHeight: 21 },
});
