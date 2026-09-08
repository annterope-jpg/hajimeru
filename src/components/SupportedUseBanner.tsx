import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SUPPORTED_USE_END_POINT_COPY, SUPPORTED_USE_FOCUS_COPY } from '@/domain';
import { useAppStore } from '@/state/useAppStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { AppText } from './AppText';

export function SupportedUseBanner() {
  const session = useAppStore((state) => state.supportedUseSession);
  const endSupportedUse = useAppStore((state) => state.endSupportedUse);

  if (!session) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View accessibilityRole="summary" style={styles.banner} testID="supported-use-banner">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="伴走モードの内容を確認"
          onPress={() => router.push('./supported-use')}
          style={styles.copy}
        >
          <AppText variant="label" color={colors.white}>一緒に見るモード</AppText>
          <AppText variant="caption" color={colors.white} numberOfLines={1}>
            {SUPPORTED_USE_FOCUS_COPY[session.focus].label}・{SUPPORTED_USE_END_POINT_COPY[session.endPoint].label}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="一緒に見るモードを終了"
          onPress={endSupportedUse}
          style={styles.endButton}
        >
          <AppText variant="label" color={colors.white}>終了</AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.primary },
  banner: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingLeft: spacing.lg,
  },
  copy: { flex: 1, minHeight: 58, justifyContent: 'center', paddingVertical: spacing.xs },
  endButton: {
    minWidth: 76,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.35)',
  },
});
