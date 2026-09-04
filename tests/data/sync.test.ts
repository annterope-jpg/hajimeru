import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SyncRecord } from '../../src/data/contracts';
import { createLocalRepository } from '../../src/data/repository';
import type { DailyState } from '../../src/domain/types';
import {
  chooseLastWriteWinner,
  consolidateSyncRecords,
  reconcileDailyStateIdentities,
  readSupabaseConfig,
  remotePreferencesToSyncRecord,
  syncRecordsEquivalent,
} from '../../src/services/sync';

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://extra.example.test',
        supabaseAnonKey: 'extra-anon-key',
      },
    },
  },
}));

const originalSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  if (originalSupabaseUrl === undefined) {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  } else {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  }
  if (originalSupabaseAnonKey === undefined) {
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
  }
});

describe('Supabase configuration', () => {
  it('prefers direct Expo public environment variables', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://env.example.test';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'env-anon-key';
    expect(readSupabaseConfig()).toEqual({
      url: 'https://env.example.test',
      anonKey: 'env-anon-key',
    });
  });

  it('falls back to app config extra values', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(readSupabaseConfig()).toEqual({
      url: 'https://extra.example.test',
      anonKey: 'extra-anon-key',
    });
  });
});

function record(
  updatedAt: string,
  deletedAt: string | null = null,
): SyncRecord {
  return {
    entityType: 'task_attempt',
    entityId: 'attempt-1',
    payload: deletedAt ? null : { id: 'attempt-1' },
    updatedAt,
    deletedAt,
  };
}

describe('last-write-wins sync resolution', () => {
  it('chooses the record with the newer timestamp', () => {
    expect(
      chooseLastWriteWinner(
        record('2026-08-13T10:00:00.000Z'),
        record('2026-08-13T09:00:00.000Z'),
      ),
    ).toBe('local');
    expect(
      chooseLastWriteWinner(
        record('2026-08-13T09:00:00.000Z'),
        record('2026-08-13T10:00:00.000Z'),
      ),
    ).toBe('remote');
  });

  it('chooses deletion when timestamps tie', () => {
    const timestamp = '2026-08-13T10:00:00.000Z';
    expect(
      chooseLastWriteWinner(record(timestamp, timestamp), record(timestamp)),
    ).toBe('local');
    expect(
      chooseLastWriteWinner(record(timestamp), record(timestamp, timestamp)),
    ).toBe('remote');
  });

  it('detects equal-time payload divergence independent of key order', () => {
    const timestamp = '2026-08-13T10:00:00.000Z';
    const left = {
      ...record(timestamp),
      payload: { id: 'attempt-1', reflection: { mood: 3, effort: 5 } },
    };
    const reordered = {
      ...record(timestamp),
      payload: { reflection: { effort: 5, mood: 3 }, id: 'attempt-1' },
    };
    const divergent = {
      ...record(timestamp),
      payload: { id: 'attempt-1', reflection: { mood: 4, effort: 5 } },
    };
    expect(syncRecordsEquivalent(left, reordered)).toBe(true);
    expect(syncRecordsEquivalent(left, divergent)).toBe(false);
  });
});

describe('remote record consolidation', () => {
  it('does not let an older tombstone hide a newer recreation', () => {
    const active = record('2026-08-13T11:00:00.000Z');
    const oldDeletion = record(
      '2026-08-13T10:00:00.000Z',
      '2026-08-13T10:00:00.000Z',
    );
    const consolidated = consolidateSyncRecords([active, oldDeletion]);
    expect([...consolidated.values()]).toEqual([active]);
  });

  it('lets an equal-time deletion win regardless of fetch order', () => {
    const timestamp = '2026-08-13T10:00:00.000Z';
    const active = record(timestamp);
    const deletion = record(timestamp, timestamp);
    expect([...consolidateSyncRecords([deletion, active]).values()]).toEqual([
      deletion,
    ]);
    expect([...consolidateSyncRecords([active, deletion]).values()]).toEqual([
      deletion,
    ]);
  });
});

describe('device-local consent', () => {
  it('never activates optional capabilities from remote preference values', () => {
    const record = remotePreferencesToSyncRecord({
      id: 'user-1',
      user_id: 'user-1',
      notifications_enabled: true,
      ai_consent: true,
      sync_enabled: true,
      accessibility: { largeText: true },
      created_at: '2026-09-04T00:00:00.000Z',
      updated_at: '2026-09-04T00:00:00.000Z',
      deleted_at: null,
    });

    expect(record.payload).toMatchObject({
      notificationsEnabled: false,
      aiConsentGranted: false,
      syncEnabled: false,
      accessibility: { largeText: true },
    });
  });
});

describe('daily state identity reconciliation', () => {
  it('rekeys a newer offline state onto the existing remote day UUID', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const localId = '10000000-0000-4000-8000-000000000001';
    const remoteId = '20000000-0000-4000-8000-000000000002';
    const localPayload = {
      id: localId,
      date: '2026-08-13',
      sleepRestfulness: 8,
      mood: 7,
      activation: 6,
      createdAt: '2026-08-13T08:00:00.000Z',
      updatedAt: '2026-08-13T11:00:00.000Z',
    } as DailyState;
    await repository.saveDailyState(localPayload, {
      updatedAt: localPayload.updatedAt,
    });
    const localRecords = await repository.listSyncRecords();
    const remoteRecord: SyncRecord = {
      entityType: 'daily_state',
      entityId: remoteId,
      payload: {
        ...localPayload,
        id: remoteId,
        mood: 2,
        updatedAt: '2026-08-13T10:00:00.000Z',
      },
      updatedAt: '2026-08-13T10:00:00.000Z',
      deletedAt: null,
    };

    expect(
      await reconcileDailyStateIdentities(repository, localRecords, [
        remoteRecord,
      ]),
    ).toBe(true);
    expect(await repository.getDailyState('2026-08-13')).toMatchObject({
      id: remoteId,
      mood: 7,
    });
    expect(await repository.listTombstones()).toContainEqual(
      expect.objectContaining({ entityId: localId }),
    );
  });
});
