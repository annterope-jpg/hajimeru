import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import {
  SOCIAL_SUPPORT_COMFORT_COPY,
  SOCIAL_SUPPORT_COMFORTS,
  SOCIAL_SUPPORT_MODE_COPY,
  SOCIAL_SUPPORT_MODES,
  createSocialSupportSelection,
  getSocialSupportTemplate,
  type SocialSupportComfort,
  type SocialSupportMode,
} from '@/domain';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function SocialSupportScreen() {
  const existing = useAppStore((state) => state.socialSupportSelection);
  const setSelection = useAppStore((state) => state.setSocialSupportSelection);
  const [mode, setMode] = useState<SocialSupportMode | undefined>(existing?.mode);
  const [comfort, setComfort] = useState<SocialSupportComfort | undefined>(
    existing?.comfort ?? undefined,
  );
  const [step, setStep] = useState<'mode' | 'comfort' | 'preview'>(
    existing ? 'preview' : 'mode',
  );

  function chooseMode(next: SocialSupportMode) {
    setMode(next);
    setComfort(undefined);
    setStep(next === 'solo' ? 'preview' : 'comfort');
  }

  function save(selectedMode = mode) {
    const result = createSocialSupportSelection(selectedMode, comfort);
    if (!result) return;
    setSelection(result);
    router.back();
  }

  if (step === 'mode') {
    return (
      <Screen>
        <AppText variant="title">人との関わり方を選ぶ（任意）</AppText>
        <AppText color={colors.inkMuted}>
          人の存在が助けになる日も、圧力になる日もあります。どれも同じように選べ、使わなくても開始できます。
        </AppText>
        <Card>
          <ChoiceChips<SocialSupportMode>
            accessibilityLabel="今回の人との関わり方"
            value={mode}
            onChange={chooseMode}
            choices={SOCIAL_SUPPORT_MODES.map((value) => ({
              value,
              label: SOCIAL_SUPPORT_MODE_COPY[value].label,
              description: SOCIAL_SUPPORT_MODE_COPY[value].description,
            }))}
          />
        </Card>
        <AppButton label="今は選ばず開始プランへ戻る" variant="quiet" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (step === 'comfort' && mode) {
    return (
      <Screen>
        <AppText variant="title">この関わり方は、今どう感じそうですか？</AppText>
        <AppText color={colors.inkMuted}>
          合うかを本人が判断するための確認です。圧力や迷いがあれば、一人に戻すか選ばず戻れます。
        </AppText>
        <Card tone="blue">
          <AppText variant="label">{SOCIAL_SUPPORT_MODE_COPY[mode].label}</AppText>
          <ChoiceChips<SocialSupportComfort>
            accessibilityLabel="人が関わるときの感じ"
            value={comfort}
            onChange={(next) => { setComfort(next); setStep('preview'); }}
            choices={SOCIAL_SUPPORT_COMFORTS.map((value) => ({
              value,
              label: SOCIAL_SUPPORT_COMFORT_COPY[value].label,
              description: SOCIAL_SUPPORT_COMFORT_COPY[value].description,
            }))}
          />
        </Card>
        <AppButton label="一人で進めるにする" variant="secondary" onPress={() => save('solo')} />
        <AppButton label="今は選ばず開始プランへ戻る" variant="quiet" onPress={() => router.back()} />
      </Screen>
    );
  }

  const template = mode ? getSocialSupportTemplate(mode) : null;
  return (
    <Screen>
      <AppText variant="title">今回の関わり方</AppText>
      <Card tone={comfort === 'pressure' ? 'amber' : 'blue'} style={styles.card}>
        <AppText variant="label">{mode ? SOCIAL_SUPPORT_MODE_COPY[mode].label : ''}</AppText>
        {comfort ? (
          <AppText color={colors.inkMuted}>{SOCIAL_SUPPORT_COMFORT_COPY[comfort].label}</AppText>
        ) : null}
        {comfort === 'pressure' || comfort === 'unsure' ? (
          <AppText color={colors.inkMuted}>
            無理に人を使う必要はありません。一人に戻す、今回は使わない、をいつでも選べます。
          </AppText>
        ) : null}
        {template ? (
          <View style={styles.template}>
            <AppText variant="caption" color={colors.inkMuted}>必要なら使える定型文</AppText>
            <AppText selectable>{template}</AppText>
          </View>
        ) : null}
      </Card>
      <AppText color={colors.inkMuted}>
        送るかどうか・誰に伝えるかは、いつもの連絡手段で自分で選べます。連絡せずに進めても大丈夫です。アプリは送信や確認をしません。
      </AppText>
      <View style={styles.actions}>
        <AppButton label="この関わり方を選ぶ" onPress={() => save()} />
        <AppButton label="一人で進めるにする" variant="secondary" onPress={() => save('solo')} />
        <AppButton label="選び直す" variant="secondary" onPress={() => setStep('mode')} />
        <AppButton label="今は選ばず開始プランへ戻る" variant="quiet" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  template: { gap: spacing.xs, paddingTop: spacing.sm },
  actions: { gap: spacing.sm },
});
