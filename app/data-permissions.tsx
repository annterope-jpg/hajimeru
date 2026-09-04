import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { DATA_PERMISSION_DEFINITIONS } from '@/domain';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function DataPermissionsScreen() {
  return (
    <Screen>
      <AppText variant="title">何を、どこへ渡すか</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        任意機能は別々に選べます。画面を一緒に見ることは、同期やセラピストへの自動共有への同意にはなりません。
      </AppText>
      <View style={styles.list}>
        {DATA_PERMISSION_DEFINITIONS.map((item) => (
          <Card key={item.capability} tone={item.required ? 'blue' : undefined}>
            <View style={styles.headingRow}>
              <AppText variant="heading">{item.title}</AppText>
              <AppText variant="caption" color={colors.inkMuted}>
                {item.required ? 'コア機能' : item.status === 'not_implemented' ? '自動共有なし' : '任意'}
              </AppText>
            </View>
            <Detail label="扱うもの" value={item.data.length ? item.data.join('、') : 'なし'} />
            <Detail label="渡る先" value={item.destination} />
            <Detail label="保持" value={item.retention} />
            <Detail label="やめるとき" value={item.withdrawal} />
          </Card>
        ))}
      </View>
      <Card tone="amber" style={styles.note}>
        <AppText variant="label">同意をOFFにした後</AppText>
        <AppText color={colors.inkMuted}>
          今後の利用は止まりますが、すでに同期した記録は自動では消えません。同期画面からクラウド記録の削除を別に選べます。
        </AppText>
      </Card>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="caption" color={colors.inkMuted}>{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  list: { gap: spacing.md },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  detail: { gap: 2 },
  note: { marginTop: spacing.md },
});
