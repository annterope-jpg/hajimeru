import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';

interface CardProps extends ViewProps {
  tone?: 'default' | 'green' | 'amber' | 'blue' | 'danger';
}

export function Card({ children, tone = 'default', style, ...props }: PropsWithChildren<CardProps>) {
  return (
    <View {...props} style={[styles.base, styles[tone], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  green: {
    backgroundColor: colors.primarySoft,
    borderColor: '#C7DDD1',
  },
  amber: {
    backgroundColor: colors.secondarySoft,
    borderColor: '#ECD5B2',
  },
  blue: {
    backgroundColor: colors.infoSoft,
    borderColor: '#C9DFE8',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#EFCBC8',
  },
});
