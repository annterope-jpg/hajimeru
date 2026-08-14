import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors } from '@/theme/colors';
import { useAppStore } from '@/state/useAppStore';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AppText({
  children,
  variant = 'body',
  color = colors.ink,
  style,
  maxFontSizeMultiplier,
  accessibilityLanguage,
  ...props
}: PropsWithChildren<AppTextProps>) {
  const largeText = useAppStore((state) => state.largeText);
  const screenReaderOptimized = useAppStore((state) => state.screenReaderOptimized);
  return (
    <Text
      {...props}
      allowFontScaling
      accessibilityLanguage={accessibilityLanguage ?? (screenReaderOptimized ? 'ja-JP' : undefined)}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        styles.base,
        styles[variant],
        largeText && styles[`large_${variant}`],
        { color },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: undefined,
    letterSpacing: 0.1,
  },
  display: {
    fontSize: 34,
    lineHeight: 43,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '400',
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  large_display: { fontSize: 40, lineHeight: 50 },
  large_title: { fontSize: 31, lineHeight: 40 },
  large_heading: { fontSize: 24, lineHeight: 34 },
  large_body: { fontSize: 19, lineHeight: 30 },
  large_caption: { fontSize: 16, lineHeight: 23 },
  large_label: { fontSize: 18, lineHeight: 25 },
});
