import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import type { DailyState } from '@/domain';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const choices = [
  { value: 0, label: 'かなり低い' },
  { value: 3, label: '低め' },
  { value: 5, label: 'ふつう' },
  { value: 8, label: 'よい' },
  { value: 10, label: 'とてもよい' },
];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CheckInScreen() {
  const [sleepRestfulness, setSleepRestfulness] = useState<number>();
  const [mood, setMood] = useState<number>();
  const [activation, setActivation] = useState<number>();
  const [saving, setSaving] = useState(false);
  const today = useMemo(() => localDateKey(), []);
  const complete = sleepRestfulness !== undefined && mood !== undefined && activation !== undefined;

  async function save() {
    if (!complete) return;
    setSaving(true);
    const now = new Date().toISOString();
    const dailyState: DailyState = {
      id: Crypto.randomUUID(),
      date: today,
      sleepRestfulness,
      mood,
      activation,
      createdAt: now,
      updatedAt: now,
    } as DailyState;
    try {
      await getLocalRepository().saveDailyState(dailyState, { updatedAt: now });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      testID="daily-check-in"
      footer={<AppButton label="今日の状態を保存" loading={saving} disabled={!complete} onPress={() => void save()} />}
    >
      <AppText variant="title">今の状態を、3つだけ</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        良し悪しの評価ではありません。開始しやすさとの「傾向」を見るための任意記録です。
      </AppText>

      <View style={styles.list}>
        <Card>
          <AppText variant="heading">睡眠の回復感</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            長さではなく、休めた感覚
          </AppText>
          <ChoiceChips
            accessibilityLabel="睡眠の回復感"
            choices={choices}
            value={sleepRestfulness}
            onChange={setSleepRestfulness}
          />
        </Card>
        <Card>
          <AppText variant="heading">気分</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            今この瞬間の全体的な気分
          </AppText>
          <ChoiceChips accessibilityLabel="気分" choices={choices} value={mood} onChange={setMood} />
        </Card>
        <Card>
          <AppText variant="heading">動けそうな感覚</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            頭と身体の起動しやすさ
          </AppText>
          <ChoiceChips
            accessibilityLabel="動けそうな感覚"
            choices={choices}
            value={activation}
            onChange={setActivation}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  list: { gap: spacing.md },
});
