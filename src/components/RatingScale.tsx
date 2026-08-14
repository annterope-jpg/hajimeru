import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

import { AppText } from './AppText';

interface RatingScaleProps {
  value?: number;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  accessibilityLabel: string;
}

export function RatingScale({
  value,
  onChange,
  lowLabel,
  highLabel,
  accessibilityLabel,
}: RatingScaleProps) {
  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: 11 }, (_, index) => {
          const selected = value === index;
          return (
            <Pressable
              key={index}
              accessibilityRole="radio"
              accessibilityLabel={`${accessibilityLabel} ${index}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(index)}
              hitSlop={4}
              style={[styles.dot, selected && styles.dotSelected]}
            >
              <AppText variant="caption" color={selected ? colors.white : colors.ink}>
                {index}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" color={colors.inkMuted}>
          {lowLabel}
        </AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          {highLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
