import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import {
  SHARE_SUMMARY_SECTION_COPY,
  SUPPORTED_USE_SECTIONS,
  createShareSummaryCandidates,
  createSupportedUseSummary,
  formatSupportedUseSummary,
  type ShareSummaryEdits,
  type SupportedUseFocus,
  type SupportedUseSection,
  type TaskAttempt,
} from '@/domain';
import { openSummaryShareSheet } from '@/services/shareSummary';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

type ExpiryChoice = 'one_day' | 'seven_days' | 'none';

function expiryIso(choice: ExpiryChoice, now: Date): string | null {
  if (choice === 'none') return null;
  const days = choice === 'one_day' ? 1 : 7;
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

export default function ShareSummaryScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId?: string }>();
  const [attempt, setAttempt] = useState<TaskAttempt | null>();
  const [loadedAttemptId, setLoadedAttemptId] = useState<string>();
  const [focus, setFocus] = useState<SupportedUseFocus>('reflection');
  const [selected, setSelected] = useState<SupportedUseSection[]>([]);
  const [edits, setEdits] = useState<ShareSummaryEdits>();
  const [expiry, setExpiry] = useState<ExpiryChoice>('one_day');
  const [preview, setPreview] = useState<string>();
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!attemptId) {
      return () => { active = false; };
    }
    void getLocalRepository().getAttempt(attemptId).then((value) => {
      if (!active) return;
      setAttempt(value);
      setLoadedAttemptId(attemptId);
      setEdits(value ? createShareSummaryCandidates(value) : undefined);
      setSelected([]);
      setPreview(undefined);
    });
    return () => { active = false; };
  }, [attemptId]);

  const hasSelectedContent = useMemo(
    () => Boolean(edits && selected.some((section) => edits[section].trim().length > 0)),
    [edits, selected],
  );

  function invalidatePreview() {
    setPreview(undefined);
  }

  function toggle(section: SupportedUseSection) {
    setSelected((current) => current.includes(section)
      ? current.filter((item) => item !== section)
      : [...current, section]);
    invalidatePreview();
  }

  function update(section: SupportedUseSection, value: string) {
    setEdits((current) => current ? { ...current, [section]: value } : current);
    invalidatePreview();
  }

  function preparePreview() {
    if (!edits || !hasSelectedContent) return;
    const now = new Date();
    const summary = createSupportedUseSummary({
      focus,
      mode: 'solo',
      selectedSections: selected,
      edits,
      generatedAt: now.toISOString(),
      expiresAt: expiryIso(expiry, now),
    });
    const text = formatSupportedUseSummary(summary);
    if (summary.items.length) setPreview(text);
  }

  async function sharePreview() {
    if (!preview || sharing) return;
    setSharing(true);
    try {
      await openSummaryShareSheet(preview);
    } finally {
      setSharing(false);
    }
  }

  if (attemptId && loadedAttemptId !== attemptId) {
    return <Screen><AppText>記録を読み込んでいます。</AppText></Screen>;
  }
  if (!attempt || !edits) {
    return <Screen><AppText variant="title">この記録は見つかりませんでした</AppText><AppText color={colors.inkMuted}>削除済みの場合は、要約を復元しません。</AppText></Screen>;
  }

  return (
    <Screen testID="share-summary-screen">
      <AppText variant="caption" color={colors.primary}>本人が選ぶ共有メモ</AppText>
      <AppText variant="title">面談に持っていく内容を選ぶ</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        すべて未選択から始まります。選んだ項目を編集し、プレビューした同じ文章だけを共有画面へ渡します。共有しなくても記録は変わりません。
      </AppText>

      <Card tone="blue" style={styles.card}>
        <AppText variant="label">今回の焦点</AppText>
        <ChoiceChips
          accessibilityLabel="共有メモの焦点"
          value={focus}
          onChange={(value) => { setFocus(value); invalidatePreview(); }}
          choices={[
            { value: 'start', label: '開始' },
            { value: 'roadmap', label: 'ロードマップ' },
            { value: 'retry', label: '困った後' },
            { value: 'reflection', label: 'ふりかえり' },
          ]}
        />
      </Card>

      <View style={styles.sections}>
        {SUPPORTED_USE_SECTIONS.map((section) => {
          const checked = selected.includes(section);
          const copy = SHARE_SUMMARY_SECTION_COPY[section];
          return (
            <Card key={section}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(section)}
                style={styles.checkboxRow}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
                <View style={styles.checkboxCopy}>
                  <AppText variant="label">{copy.label}</AppText>
                  <AppText variant="caption" color={colors.inkMuted}>{copy.description}</AppText>
                </View>
              </Pressable>
              {checked ? (
                <TextInput
                  accessibilityLabel={`${copy.label}の編集`}
                  multiline
                  maxLength={500}
                  value={edits[section]}
                  onChangeText={(value) => update(section, value)}
                  placeholder="空欄にすると共有に含まれません"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                />
              ) : null}
            </Card>
          );
        })}
      </View>

      <Card style={styles.card}>
        <AppText variant="label">確認の目安</AppText>
        <AppText variant="caption" color={colors.inkMuted}>期限後も、相手側のコピーをこのアプリから削除することはできません。</AppText>
        <ChoiceChips
          accessibilityLabel="確認の目安"
          value={expiry}
          onChange={(value) => { setExpiry(value); invalidatePreview(); }}
          choices={[
            { value: 'one_day', label: '1日' },
            { value: 'seven_days', label: '7日' },
            { value: 'none', label: '表示しない' },
          ]}
        />
      </Card>

      <AppButton testID="prepare-summary-preview" label="選んだ内容をプレビュー" disabled={!hasSelectedContent} onPress={preparePreview} />

      {preview ? (
        <Card tone="green" style={styles.preview} testID="summary-preview">
          <AppText variant="label">この文章だけを共有画面へ渡します</AppText>
          <AppText selectable>{preview}</AppText>
          <AppButton testID="open-summary-share" label="共有画面を開く" loading={sharing} onPress={() => void sharePreview()} />
          <AppText variant="caption" color={colors.inkMuted}>
            共有画面を開いても、相手が受け取ったことや保存したことをアプリは確認・記録しません。
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  card: { marginBottom: spacing.md },
  sections: { gap: spacing.md, marginBottom: spacing.md },
  checkboxRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.line },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxCopy: { flex: 1, gap: 2 },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.ink,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  preview: { marginTop: spacing.lg, gap: spacing.md },
});
