import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

import { AppText } from './AppText';

export interface Choice<T extends string | number | boolean> {
  value: T;
  label: string;
  description?: string;
}

interface ChoiceChipsProps<T extends string | number | boolean> {
  choices: Choice<T>[];
  value?: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

export function ChoiceChips<T extends string | number | boolean>({
  choices,
  value,
  onChange,
  accessibilityLabel,
}: ChoiceChipsProps<T>) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.container}>
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <Pressable
            key={String(choice.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(choice.value)}
            style={[styles.choice, selected && styles.selected]}
          >
            <AppText variant="label" color={selected ? colors.primary : colors.ink}>
              {choice.label}
            </AppText>
            {choice.description ? (
              <AppText variant="caption" color={colors.inkMuted}>
                {choice.description}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
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
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
});
