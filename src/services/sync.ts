import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import type { LocalRepository, SyncEntityType, SyncRecord } from '@/data';
import type {
  Assessment,
  AttemptOutcome,
  DailyState,
  InterventionPlan,
  TaskAttempt,
  TaskCategory,
  UserPreferences,
} from '@/domain/types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  unchanged: number;
  purgedTombstones: number;
  syncedAt: string;
}

export interface SyncOptions {
  now?: Date;
}

interface RemoteAttemptRow {
  id: string;
  user_id: string;
  task_text: string;
  task_category: string | null;
  assessment: unknown;
  plan: unknown;
  timer_minutes: number | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  pre_aversion: number | null;
  post_aversion: number | null;
  actual_difficulty: number | null;
  continue_intent: boolean | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RemoteDailyStateRow {
  id: string;
  user_id: string;
  state_date: string;
  sleep_quality: number | null;
  mood: number | null;
  arousal: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RemotePreferencesRow {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  ai_consent: boolean;
  sync_enabled: boolean;
  accessibility: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RemoteTombstoneRow {
  entity_type: 'attempts' | 'daily_states' | 'preferences';
  entity_id: string;
  deleted_at: string;
  expires_at: string;
  updated_at: string;
}

const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PREFERENCES_ID = 'default';

export function readSupabaseConfig(): SupabaseConfig | null {
  // Expo CLI only inlines EXPO_PUBLIC_* values when accessed through direct,
  // statically analyzable process.env properties.
  const environmentUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const environmentAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const url =
    environmentUrl ||
    (typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : undefined);
  const anonKey =
    environmentAnonKey ||
    (typeof extra.supabaseAnonKey === 'string'
      ? extra.supabaseAnonKey
      : undefined);
  return typeof url === 'string' &&
    url.length > 0 &&
    typeof anonKey === 'string' &&
    anonKey.length > 0
    ? { url, anonKey }
    : null;
}

let singletonClient: SupabaseClient | null | undefined;

const lazyAsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    const storage = (await import('@react-native-async-storage/async-storage'))
      .default;
    return storage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    const storage = (await import('@react-native-async-storage/async-storage'))
      .default;
    await storage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    const storage = (await import('@react-native-async-storage/async-storage'))
      .default;
    await storage.removeItem(key);
  },
};

/** Returns null when optional sync/AI environment values are not configured. */
export function getSupabaseClient(
  config: SupabaseConfig | null = readSupabaseConfig(),
): SupabaseClient | null {
  if (!config) return null;
  if (singletonClient !== undefined) return singletonClient;
  singletonClient = createClient(config.url, config.anonKey, {
    auth: {
      storage: lazyAsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return singletonClient;
}

export function resetSupabaseClientForTests(): void {
  singletonClient = undefined;
}

export async function createOptionalSupabaseClient(
  config?: SupabaseConfig | null,
): Promise<SupabaseClient | null> {
  return getSupabaseClient(
    config === undefined ? readSupabaseConfig() : config,
  );
}

export async function defaultAuthRedirectUrl(): Promise<string> {
  try {
    const linking = await import('expo-linking');
    return linking.createURL('/auth/callback');
  } catch {
    return 'hajimeru://auth/callback';
  }
}

export async function sendMagicLink(
  client: SupabaseClient,
  email: string,
  redirectTo?: string,
): Promise<void> {
  const normalizedEmail = email.trim();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new Error('有効なメールアドレスを入力してください。');
  }
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: redirectTo ?? (await defaultAuthRedirectUrl()),
    },
  });
  if (error) throw new Error('サインイン用メールを送信できませんでした。');
}

function callbackParameters(url: string): URLSearchParams {
  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');
  const chunks: string[] = [];
  if (queryStart >= 0) {
    const end = hashStart > queryStart ? hashStart : url.length;
    chunks.push(url.slice(queryStart + 1, end));
  }
  if (hashStart >= 0) chunks.push(url.slice(hashStart + 1));
  return new URLSearchParams(chunks.filter(Boolean).join('&'));
}

export async function completeMagicLink(
  client: SupabaseClient,
  callbackUrl: string,
): Promise<boolean> {
  const parameters = callbackParameters(callbackUrl);
  const code = parameters.get('code');
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw new Error('サインインを完了できませんでした。');
    return true;
  }

  // Supports projects still configured for the legacy implicit link flow.
  const accessToken = parameters.get('access_token');
  const refreshToken = parameters.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw new Error('サインインを完了できませんでした。');
    return true;
  }
  return false;
}

export async function signOutAndKeepLocalData(
  client: SupabaseClient,
): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw new Error('サインアウトできませんでした。');
}

export function chooseLastWriteWinner(
  local: SyncRecord | null,
  remote: SyncRecord | null,
): 'local' | 'remote' | 'equal' {
  if (!local && !remote) return 'equal';
  if (local && !remote) return 'local';
  if (!local && remote) return 'remote';
  if (!local || !remote) return 'equal';
  if (local.updatedAt > remote.updatedAt) return 'local';
  if (remote.updatedAt > local.updatedAt) return 'remote';
  if (local.deletedAt && !remote.deletedAt) return 'local';
  if (remote.deletedAt && !local.deletedAt) return 'remote';
  // The fetched server representation is the stable tie-breaker.
  return 'equal';
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function syncRecordsEquivalent(
  left: SyncRecord,
  right: SyncRecord,
): boolean {
  return (
    left.entityType === right.entityType &&
    left.entityId === right.entityId &&
    left.updatedAt === right.updatedAt &&
    left.deletedAt === right.deletedAt &&
    canonicalJson(left.payload) === canonicalJson(right.payload)
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function recordKey(record: Pick<SyncRecord, 'entityType' | 'entityId'>): string {
  return `${record.entityType}\u0000${record.entityId}`;
}

export function consolidateSyncRecords(
  records: readonly SyncRecord[],
): Map<string, SyncRecord> {
  const consolidated = new Map<string, SyncRecord>();
  for (const candidate of records) {
    const key = recordKey(candidate);
    const existing = consolidated.get(key) ?? null;
    const winner = chooseLastWriteWinner(existing, candidate);
    if (!existing || winner === 'remote') consolidated.set(key, candidate);
  }
  return consolidated;
}

function attemptOutcome(status: string): AttemptOutcome | null {
  return status === 'stopped_success' ||
    status === 'continued' ||
    status === 'stuck'
    ? status
    : null;
}

export function remoteAttemptToSyncRecord(row: RemoteAttemptRow): SyncRecord {
  const payload: TaskAttempt = {
    id: row.id,
    taskText: row.task_text,
    category: (row.task_category ?? 'other') as TaskCategory,
    assessment: row.assessment as Assessment,
    plan: row.plan as InterventionPlan,
    createdAt: row.created_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    outcome: attemptOutcome(row.status),
    reflection: {
      aversionBefore: row.pre_aversion,
      aversionAfter: row.post_aversion,
      actualDifficulty: row.actual_difficulty,
      wantsToContinue: row.continue_intent,
    },
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
  return {
    entityType: 'task_attempt',
    entityId: row.id,
    payload: row.deleted_at ? null : payload,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function remoteDailyStateToSyncRecord(
  row: RemoteDailyStateRow,
): SyncRecord {
  const payload = {
    id: row.id,
    date: row.state_date,
    sleepRestfulness: row.sleep_quality,
    mood: row.mood,
    activation: row.arousal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as DailyState;
  return {
    entityType: 'daily_state',
    entityId: row.id,
    // Keep the date in memory even for a deleted base row so two offline
    // clients that chose different UUIDs for the same day can be reconciled.
    // applySyncRecord still treats deletedAt as authoritative and stores no body.
    payload,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function dailyStateDate(record: SyncRecord): string | null {
  if (record.entityType !== 'daily_state') return null;
  const date = asRecord(record.payload).date;
  return typeof date === 'string' && date.length > 0 ? date : null;
}

/**
 * Reuses an existing server UUID when two offline devices created the same
 * calendar day independently. This avoids violating unique(user_id,state_date)
 * while preserving LWW and marking the abandoned local UUID as deleted.
 */
export async function reconcileDailyStateIdentities(
  repository: LocalRepository,
  localRecords: readonly SyncRecord[],
  remoteRecords: readonly SyncRecord[],
): Promise<boolean> {
  const localByDate = new Map<string, SyncRecord>();
  for (const record of localRecords) {
    const date = dailyStateDate(record);
    if (date && !record.deletedAt) localByDate.set(date, record);
  }

  let changed = false;
  for (const remote of remoteRecords) {
    const date = dailyStateDate(remote);
    if (!date) continue;
    const local = localByDate.get(date);
    if (!local || local.entityId === remote.entityId) continue;

    const winner = chooseLastWriteWinner(local, remote);
    const source = winner === 'local' ? local : remote;
    const canonical: SyncRecord = {
      ...source,
      entityType: 'daily_state',
      entityId: remote.entityId,
      payload: source.deletedAt
        ? source.payload
        : {
            ...asRecord(source.payload),
            id: remote.entityId,
            updatedAt: source.updatedAt,
          },
    };
    await repository.deleteDailyState(date, canonical.updatedAt);
    await repository.applySyncRecord(canonical);
    localByDate.set(date, canonical);
    changed = true;
  }
  return changed;
}

export function remotePreferencesToSyncRecord(
  row: RemotePreferencesRow,
): SyncRecord {
  const accessibility = asRecord(row.accessibility);
  const payload: UserPreferences = {
    notificationsEnabled: row.notifications_enabled,
    aiConsentGranted: row.ai_consent,
    syncEnabled: row.sync_enabled,
    accessibility: {
      reduceMotion: accessibility.reduceMotion === true,
      largeText: accessibility.largeText === true,
      screenReaderOptimized: accessibility.screenReaderOptimized === true,
    },
    updatedAt: row.updated_at,
  };
  return {
    entityType: 'preferences',
    entityId: PREFERENCES_ID,
    payload: row.deleted_at ? null : payload,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function remoteTombstoneToSyncRecord(row: RemoteTombstoneRow): SyncRecord {
  const entityType: SyncEntityType =
    row.entity_type === 'attempts'
      ? 'task_attempt'
      : row.entity_type === 'daily_states'
        ? 'daily_state'
        : 'preferences';
  return {
    entityType,
    entityId:
      entityType === 'preferences' ? PREFERENCES_ID : row.entity_id,
    payload: null,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function localAttemptToRemote(userId: string, record: SyncRecord) {
  const value = asRecord(record.payload);
  const reflection = asRecord(value.reflection);
  const assessment = asRecord(value.assessment);
  const answers = asRecord(assessment.answers);
  const plan = asRecord(value.plan);
  const outcome = value.outcome;
  return {
    id: record.entityId,
    user_id: userId,
    task_text: typeof value.taskText === 'string' ? value.taskText : '',
    task_category:
      typeof value.category === 'string' ? value.category : 'other',
    assessment: value.assessment ?? {},
    plan: value.plan ?? {},
    timer_minutes:
      typeof plan.durationMinutes === 'number' ? plan.durationMinutes : null,
    status:
      typeof outcome === 'string'
        ? outcome
        : value.startedAt
          ? 'started'
          : 'planned',
    started_at: typeof value.startedAt === 'string' ? value.startedAt : null,
    ended_at: typeof value.endedAt === 'string' ? value.endedAt : null,
    pre_aversion:
      typeof reflection.aversionBefore === 'number'
        ? reflection.aversionBefore
        : typeof answers.aversion === 'number'
          ? answers.aversion
          : null,
    post_aversion:
      typeof reflection.aversionAfter === 'number'
        ? reflection.aversionAfter
        : null,
    actual_difficulty:
      typeof reflection.actualDifficulty === 'number'
        ? reflection.actualDifficulty
        : null,
    continue_intent:
      typeof reflection.wantsToContinue === 'boolean'
        ? reflection.wantsToContinue
        : null,
    created_at:
      typeof value.createdAt === 'string' ? value.createdAt : record.updatedAt,
    updated_at: record.updatedAt,
    deleted_at: null,
  };
}

function localDailyStateToRemote(userId: string, record: SyncRecord) {
  const value = asRecord(record.payload);
  return {
    id: record.entityId,
    user_id: userId,
    state_date: typeof value.date === 'string' ? value.date : '',
    sleep_quality:
      typeof value.sleepRestfulness === 'number'
        ? value.sleepRestfulness
        : null,
    mood: typeof value.mood === 'number' ? value.mood : null,
    arousal: typeof value.activation === 'number' ? value.activation : null,
    created_at:
      typeof value.createdAt === 'string' ? value.createdAt : record.updatedAt,
    updated_at: record.updatedAt,
    deleted_at: null,
  };
}

function localPreferencesToRemote(userId: string, record: SyncRecord) {
  const value = asRecord(record.payload);
  return {
    id: userId,
    user_id: userId,
    notifications_enabled: value.notificationsEnabled === true,
    ai_consent: value.aiConsentGranted === true,
    sync_enabled: value.syncEnabled === true,
    accessibility: asRecord(value.accessibility),
    updated_at: record.updatedAt,
    deleted_at: null,
  };
}

async function fetchRemoteRecords(
  client: SupabaseClient,
  userId: string,
): Promise<SyncRecord[]> {
  const [attempts, dailyStates, preferences, tombstones] = await Promise.all([
    client.from('attempts').select('*').eq('user_id', userId),
    client.from('daily_states').select('*').eq('user_id', userId),
    client.from('preferences').select('*').eq('user_id', userId),
    client.from('tombstones').select('*').eq('user_id', userId),
  ]);
  if (
    attempts.error ||
    dailyStates.error ||
    preferences.error ||
    tombstones.error
  ) {
    throw new Error('同期データを取得できませんでした。');
  }
  return [
    ...((attempts.data ?? []) as RemoteAttemptRow[]).map(
      remoteAttemptToSyncRecord,
    ),
    ...((dailyStates.data ?? []) as RemoteDailyStateRow[]).map(
      remoteDailyStateToSyncRecord,
    ),
    ...((preferences.data ?? []) as RemotePreferencesRow[]).map(
      remotePreferencesToSyncRecord,
    ),
    ...((tombstones.data ?? []) as RemoteTombstoneRow[]).map(
      remoteTombstoneToSyncRecord,
    ),
  ];
}

async function pushActiveRecords(
  client: SupabaseClient,
  userId: string,
  records: SyncRecord[],
): Promise<void> {
  const attempts = records
    .filter((item) => item.entityType === 'task_attempt' && !item.deletedAt)
    .map((item) => localAttemptToRemote(userId, item));
  const dailyStates = records
    .filter((item) => item.entityType === 'daily_state' && !item.deletedAt)
    .map((item) => localDailyStateToRemote(userId, item));
  const preferences = records
    .filter((item) => item.entityType === 'preferences' && !item.deletedAt)
    .map((item) => localPreferencesToRemote(userId, item));

  const results = await Promise.all([
    attempts.length
      ? client.from('attempts').upsert(attempts, { onConflict: 'id' })
      : null,
    dailyStates.length
      ? client.from('daily_states').upsert(dailyStates, { onConflict: 'id' })
      : null,
    preferences.length
      ? client
          .from('preferences')
          .upsert(preferences, { onConflict: 'user_id' })
      : null,
  ]);
  if (results.some((result) => result?.error)) {
    throw new Error('ローカルデータを同期できませんでした。');
  }
}

async function pushDeletion(
  client: SupabaseClient,
  userId: string,
  record: SyncRecord,
): Promise<void> {
  const values = { deleted_at: record.deletedAt, updated_at: record.updatedAt };
  const query =
    record.entityType === 'preferences'
      ? client.from('preferences').update(values).eq('user_id', userId)
      : client
          .from(
            record.entityType === 'task_attempt' ? 'attempts' : 'daily_states',
          )
          .update(values)
          .eq('user_id', userId)
          .eq('id', record.entityId);
  const { error } = await query;
  if (error) throw new Error('削除状態を同期できませんでした。');

  // An UPDATE can legitimately affect zero rows when the record was created and
  // deleted entirely offline. Upserting the marker directly ensures another
  // device cannot later resurrect it.
  const deletedAt = record.deletedAt ?? record.updatedAt;
  const remoteEntityType =
    record.entityType === 'task_attempt'
      ? 'attempts'
      : record.entityType === 'daily_state'
        ? 'daily_states'
        : 'preferences';
  const remoteEntityId =
    record.entityType === 'preferences' ? userId : record.entityId;
  const { error: tombstoneError } = await client.from('tombstones').upsert(
    {
      user_id: userId,
      entity_type: remoteEntityType,
      entity_id: remoteEntityId,
      deleted_at: deletedAt,
      expires_at: new Date(
        new Date(deletedAt).getTime() + TOMBSTONE_RETENTION_MS,
      ).toISOString(),
      updated_at: record.updatedAt,
    },
    { onConflict: 'user_id,entity_type,entity_id' },
  );
  if (tombstoneError) throw new Error('削除記録を同期できませんでした。');
}

export async function syncLocalData(
  repository: LocalRepository,
  client: SupabaseClient,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const now = options.now ?? new Date();
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();
  if (sessionError || !session) {
    throw new Error('同期するにはサインインが必要です。');
  }

  const remoteRecords = await fetchRemoteRecords(client, session.user.id);
  let localRecords = await repository.listSyncRecords();
  if (
    await reconcileDailyStateIdentities(
      repository,
      localRecords,
      remoteRecords,
    )
  ) {
    localRecords = await repository.listSyncRecords();
  }
  const remoteByKey = consolidateSyncRecords(remoteRecords);
  const localByKey = consolidateSyncRecords(localRecords);
  const keys = new Set([...remoteByKey.keys(), ...localByKey.keys()]);

  const activeToPush: SyncRecord[] = [];
  const deletionsToPush: SyncRecord[] = [];
  let pulled = 0;
  let unchanged = 0;
  for (const key of keys) {
    const local = localByKey.get(key) ?? null;
    const remote = remoteByKey.get(key) ?? null;
    const winner = chooseLastWriteWinner(local, remote);
    if (winner === 'local' && local) {
      if (local.deletedAt) deletionsToPush.push(local);
      else activeToPush.push(local);
    } else if (winner === 'remote' && remote) {
      if (await repository.applySyncRecord(remote)) pulled += 1;
      else unchanged += 1;
    } else if (local && remote && !syncRecordsEquivalent(local, remote)) {
      // The server is the deterministic authority for same-timestamp live rows,
      // mirroring its bytewise tie-break without leaving clients divergent.
      if (await repository.applySyncRecord(remote)) pulled += 1;
      else unchanged += 1;
    } else {
      unchanged += 1;
    }
  }

  await pushActiveRecords(client, session.user.id, activeToPush);
  for (const deletion of deletionsToPush) {
    await pushDeletion(client, session.user.id, deletion);
  }

  const { error: purgeError } = await client
    .from('tombstones')
    .delete()
    .eq('user_id', session.user.id)
    .lte('expires_at', now.toISOString());
  if (purgeError) {
    // Retention is safe; a later sync can retry expired marker cleanup.
  }
  const purgedTombstones = await repository.purgeExpiredTombstones(now);
  const syncedAt = now.toISOString();
  await repository.setSyncCursor(syncedAt);

  return {
    pushed: activeToPush.length + deletionsToPush.length,
    pulled,
    unchanged,
    purgedTombstones,
    syncedAt,
  };
}

/** Calls the server transaction only after explicit confirmation in the UI. */
export async function deleteSyncedData(client: SupabaseClient): Promise<void> {
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return;
  const { error } = await client.rpc('delete_my_synced_data');
  if (error) throw new Error('同期済みデータを削除できませんでした。');
}
