import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getLocalRepository } from '@/data';
import {
  deleteSyncedData,
  getSupabaseClient,
  sendMagicLink,
  signOutAndKeepLocalData,
  syncLocalData,
} from '@/services/sync';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/spacing';
import { useAppStore } from '@/state/useAppStore';
import { createDefaultUserPreferences } from '@/domain';
import { cancelAllStartCues } from '@/services/notifications';

type State = 'unconfigured' | 'signed-out' | 'signed-in';

export default function SyncScreen() {
  const client = getSupabaseClient();
  const [state, setState] = useState<State>(client ? 'signed-out' : 'unconfigured');
  const [email, setEmail] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string>();
  const clearShellData = useAppStore((shell) => shell.clearShellData);
  const setAccessibilityShell = useAppStore((shell) => shell.setAccessibilityShell);

  useEffect(() => {
    if (!client) return;
    void client.auth.getSession().then(({ data }) => setState(data.session ? 'signed-in' : 'signed-out'));
    const { data } = client.auth.onAuthStateChange((_event, session) => setState(session ? 'signed-in' : 'signed-out'));
    return () => data.subscription.unsubscribe();
  }, [client]);

  async function sendLink() {
    if (!client) return;
    setWorking(true);
    try {
      await sendMagicLink(client, email);
      setMessage('サインイン用リンクをメールへ送りました。リンクを開くと同期を有効にできます。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'メールを送信できませんでした。');
    } finally {
      setWorking(false);
    }
  }

  async function syncNow() {
    if (!client) return;
    setWorking(true);
    try {
      const result = await syncLocalData(getLocalRepository(), client);
      const repository = getLocalRepository();
      const current = (await repository.getPreferences()) ?? createDefaultUserPreferences();
      await repository.savePreferences({
        ...current,
        syncEnabled: true,
        updatedAt: new Date().toISOString(),
      });
      await setAccessibilityShell(current.accessibility);
      setMessage(`同期しました：送信 ${result.pushed}件、受信 ${result.pulled}件`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '同期できませんでした。');
    } finally {
      setWorking(false);
    }
  }

  async function disableSyncPreference() {
    const repository = getLocalRepository();
    const current = (await repository.getPreferences()) ?? createDefaultUserPreferences();
    await repository.savePreferences({
      ...current,
      syncEnabled: false,
      updatedAt: new Date().toISOString(),
    });
  }

  function confirmCloudDelete() {
    if (!client) return;
    Alert.alert(
      '同期済みデータを削除しますか？',
      'クラウド上の同期データを削除します。端末内のデータは残ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () =>
            void deleteSyncedData(client)
              .then(disableSyncPreference)
              .then(() => signOutAndKeepLocalData(client))
              .then(() => {
                setState('signed-out');
                setMessage('同期済みデータを削除し、同期を停止しました。端末内の記録は残っています。');
              })
              .catch(() => setMessage('同期済みデータを削除できませんでした。')),
        },
      ],
    );
  }

  function confirmAccountDelete() {
    if (!client) return;
    Alert.alert(
      'アカウントと全データを削除しますか？',
      'クラウドの同期記録、認証アカウント、この端末の記録・設定・予定通知を削除します。別のオフライン端末に残るコピーは、その端末で削除が必要です。元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'すべて削除する',
          style: 'destructive',
          onPress: () => {
            setWorking(true);
            void client.functions
              .invoke('delete-account', { body: { confirmation: 'DELETE_MY_ACCOUNT' } })
              .then(async ({ data, error }) => {
                if (error || data?.deleted !== true) {
                  throw new Error('アカウントを削除できませんでした。時間をおいて再度お試しください。');
                }
                await Promise.all([
                  getLocalRepository().clearAll(),
                  clearShellData(),
                  cancelAllStartCues(),
                ]);
                await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
                router.replace('/onboarding');
              })
              .catch((error: unknown) => {
                setMessage(error instanceof Error ? error.message : 'アカウントを削除できませんでした。');
              })
              .finally(() => setWorking(false));
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <AppText variant="title">同期は、使いたい人だけ</AppText>
      <AppText color={colors.inkMuted} style={styles.lead}>
        端末内の記録だけでも全機能を使えます。同期すると、機種変更後に復元しやすくなります。
      </AppText>

      {state === 'unconfigured' ? (
        <Card tone="amber">
          <AppText variant="heading">試作環境では未設定です</AppText>
          <AppText color={colors.inkMuted}>
            `.env`にSupabase URLと公開anon keyを設定すると、メールリンク認証と同期を利用できます。秘密鍵はアプリに含めません。
          </AppText>
        </Card>
      ) : null}

      {state === 'signed-out' ? (
        <Card>
          <AppText variant="heading">メールでサインイン</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            パスワードは使いません。入力したメールは認証目的にだけ使います。
          </AppText>
          <TextInput
            accessibilityLabel="メールアドレス"
            placeholder="you@example.com"
            placeholderTextColor="#89948E"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <AppButton label="サインイン用メールを送る" loading={working} disabled={!email.trim()} onPress={() => void sendLink()} />
        </Card>
      ) : null}

      {state === 'signed-in' ? (
        <View style={styles.list}>
          <Card tone="green">
            <AppText variant="heading">サインイン済み</AppText>
            <AppText color={colors.inkMuted}>同期はボタンを押した時だけ実行します。</AppText>
            <AppButton label="今すぐ同期" loading={working} onPress={() => void syncNow()} />
          </Card>
          <Card>
            <AppButton label="クラウドの記録を削除" variant="danger" onPress={confirmCloudDelete} />
            <AppButton label="アカウントと全データを削除" variant="danger" onPress={confirmAccountDelete} />
            <AppButton
              label="サインアウト（端末データは残す）"
              variant="secondary"
              onPress={() => void signOutAndKeepLocalData(client!).then(() => router.back())}
            />
          </Card>
        </View>
      ) : null}

      {message ? (
        <Card tone="blue" style={styles.message}>
          <AppText>{message}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm, marginBottom: spacing.xl },
  list: { gap: spacing.md },
  input: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  message: { marginTop: spacing.md },
});
