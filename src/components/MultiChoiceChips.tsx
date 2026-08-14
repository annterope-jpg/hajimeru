import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

import { AppText } from './AppText';
import type { Choice } from './ChoiceChips';

interface MultiChoiceChipsProps<T extends string | number> {
  choices: Choice<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  accessibilityLabel: string;
  maxSelections?: number;
  showPriority?: boolean;
}

export function MultiChoiceChips<T extends string | number>({
  choices,
  value,
  onChange,
  accessibilityLabel,
  maxSelections,
  showPriority = false,
}: MultiChoiceChipsProps<T>) {
  function toggle(choiceValue: T) {
    const currentIndex = value.indexOf(choiceValue);
    if (currentIndex >= 0) {
      onChange(value.filter((item) => item !== choiceValue));
      return;
    }
    if (maxSelections !== undefined && value.length >= maxSelections) return;
    onChange([...value, choiceValue]);
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.container}>
      {choices.map((choice) => {
        const selectedIndex = value.indexOf(choice.value);
        const selected = selectedIndex >= 0;
        const disabled = !selected && maxSelections !== undefined && value.length >= maxSelections;
        return (
          <Pressable
            key={String(choice.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled }}
            accessibilityLabel={showPriority && selected ? `優先${selectedIndex + 1}：${choice.label}` : choice.label}
            disabled={disabled}
            onPress={() => toggle(choice.value)}
            style={[styles.choice, selected && styles.selected, disabled && styles.disabled]}
          >
            <View style={styles.titleRow}>
              {showPriority && selected ? (
                <View style={styles.priorityBadge}>
                  <AppText variant="caption" color={colors.white}>{selectedIndex + 1}</AppText>
                </View>
              ) : null}
              <AppText variant="label" color={selected ? colors.primary : colors.ink} style={styles.title}>
                {choice.label}
              </AppText>
            </View>
            {choice.description ? (
              <AppText variant="caption" color={colors.inkMuted}>{choice.description}</AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  choice: {
    minHeight: 54,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.45 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priorityBadge: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  title: { flex: 1 },
});
