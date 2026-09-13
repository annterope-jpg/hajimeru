import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { MultiChoiceChips } from '@/components/MultiChoiceChips';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import {
  createSupportedUseSharePreview,
  SUPPORTED_USE_SECTION_COPY,
  SUPPORTED_USE_SECTIONS,
  type SupportedUseSection,
  type TaskAttempt,
} from '@/domain';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const choices = SUPPORTED_USE_SECTIONS.map((value) => ({
  value,
  label: SUPPORTED_USE_SECTION_COPY[value].label,
  description: SUPPORTED_USE_SECTION_COPY[value].description,
}));

export default function ShareSummaryScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId?: string }>();
  const [attempt, setAttempt] = useState<TaskAttempt | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedSections, setSelectedSections] = useState<SupportedUseSection[]>([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!attemptId) {
      setLoaded(true);
      return () => {
        active = false;
      };
    }
    void getLocalRepository()
      .getAttempt(attemptId)
      .then((value) => {
        if (active) setAttempt(value ?? null);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [attemptId]);

  const preview = useMemo(
    () =>
      attempt
        ? createSupportedUseSharePreview(attempt, selectedSections, new Date().toISOString())
        : null,
    [attempt, selectedSections],
  );

  async function shareSelected() {
    if (!preview?.isShareable) return;
    setSharing(true);
    try {
      await Share.share({ message: preview.text });
    } finally {
      setSharing(false);
    }
  }

  if (!loaded) {
    return (
      <Screen testID="share-summary-screen">
        <AppText variant="title">共有用メモを準備しています</AppText>
      </Screen>
    );
  }

  if (!attempt) {
    return (
      <Screen
        testID="share-summary-screen"
        footer={<AppButton label="記録へ戻る" variant="quiet" onPress={() => router.back()} />}
      >
        <AppText variant="title">共有する記録が見つかりませんでした</AppText>
        <AppText color={colors.inkMuted} style={styles.lead}>
          元の記録は変更していません。記録一覧へ戻って、共有したい一歩を選び直してください。
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen
      testID="share-summary-screen"
      footer={
        <View style={styles.footer}>
          <AppButton
            testID="share-selected-summary"
            label="この内容を共有する"
            loading={sharing}
            disabled={!preview?.isShareable}
            onPress={() => void shareSelected()}
          />
          <AppButton label="共有せず戻る" variant="quiet" onPress={() => router.back()} />
        </View>
      }
    >
      <AppText variant="title">見せる内容を自分で選ぶ</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        最初は何も選ばれていません。選んだ項目だけを確認してから、端末の共有画面へ渡します。共有しなくても記録は変わりません。
      </AppText>

      <Card>
        <AppText variant="label">共有用メモに入れる項目</AppText>
        <AppText variant="caption" color={colors.inkMuted} style={styles.caption}>
          点数、未選択の項目、診断や原因の推定、支援者だけに見える情報は追加しません。
        </AppText>
        <MultiChoiceChips
          accessibilityLabel="共有用メモに入れる項目"
          choices={choices}
          value={selectedSections}
          onChange={setSelectedSections}
        />
      </Card>

      <AppText variant="heading" style={styles.sectionTitle}>
        共有前の確認
      </AppText>
      <Card tone="blue">
        {preview?.isShareable ? (
          <AppText selectable>{preview.text}</AppText>
        ) : (
          <AppText color={colors.inkMuted}>見せてもよい項目だけ選んでください。何も選ばず戻ることもできます。</AppText>
        )}
      </Card>

      <AppText variant="caption" color={colors.inkMuted} style={styles.note}>
        共有先の選択と送信は端末の共有機能で行います。このアプリは受け取り相手を保存せず、自動送信もしません。
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  caption: { marginTop: spacing.xs, marginBottom: spacing.md },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.md },
  note: { marginTop: spacing.md },
  footer: { gap: spacing.xs },
});
