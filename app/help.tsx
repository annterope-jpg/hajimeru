import * as Linking from 'expo-linking';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function HelpScreen() {
  return (
    <Screen>
      <AppText variant="title">日常の「始める」を支える道具</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        「はじめる」は、やる気の有無を評価せず、最初の動き・時間・環境を整えるセルフマネジメントアプリです。
      </AppText>

      <View style={styles.list}>
        <Card tone="blue">
          <AppText variant="heading">診断・治療は行いません</AppText>
          <AppText>
            ADHDの診断には、訓練を受けた専門家による生活歴・発達歴を含む評価が必要です。このアプリは医療、心理療法、服薬判断の代わりにはなりません。
          </AppText>
        </Card>
        <Card>
          <AppText variant="heading">受診を考えるとき</AppText>
          <AppText color={colors.inkMuted}>
            生活・仕事・学業への困りごとが続く、睡眠や気分の問題が強い、服薬について相談したい場合は、精神科・心療内科などの医療機関へご相談ください。
          </AppText>
        </Card>
        <Card tone="danger">
          <AppText variant="heading">今すぐ安全が心配なとき</AppText>
          <AppText>差し迫った危険がある場合：119</AppText>
          <AppText>よりそいホットライン：0120-279-338（24時間）</AppText>
          <AppText>こころの健康相談統一ダイヤル：0570-064-556</AppText>
          <AppButton
            label="厚生労働省「まもろうよ こころ」を開く"
            variant="secondary"
            onPress={() => void Linking.openURL('https://www.mhlw.go.jp/mamorouyokokoro/soudan/')}
          />
        </Card>
        <Card>
          <AppText variant="heading">設計の背景</AppText>
          <AppText color={colors.inkMuted}>
            成人ADHDへの構造化された心理的支援、環境調整、行動修正と整合する考え方を参考にしています。ただし、短時間スターターや小さな報酬などの個別技法を、確立した単独治療とは表現しません。
          </AppText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  list: { gap: spacing.md },
});
