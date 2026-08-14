import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

import { AppText } from './AppText';

interface StepIndicatorProps {
  current: number;
  total: number;
  label?: string;
}

export function StepIndicator({ current, total, label }: StepIndicatorProps) {
  const percent = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: current }}>
      <View style={styles.labels}>
        <AppText variant="caption" color={colors.inkMuted}>
          {label ?? `ステップ ${current} / ${total}`}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    marginBottom: spacing.sm,
  },
  track: {
    height: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.line,
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
});
