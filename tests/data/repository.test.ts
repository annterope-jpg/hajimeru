import { describe, expect, it } from 'vitest';

import type {
  DailyState,
  TaskAttempt,
  UserPreferences,
} from '../../src/domain/types';
import {
  createLocalRepository,
  remoteRecordWins,
} from '../../src/data/repository';

const asDailyState = (value: unknown) => value as DailyState;
const asAttempt = (value: unknown) => value as TaskAttempt;
const asPreferences = (value: unknown) => value as UserPreferences;

describe('memory local repository', () => {
  it('stores and reads core records without a native module', async () => {
    const repository = createLocalRepository({
      forceMemory: true,
      now: () => new Date('2026-08-13T00:00:00.000Z'),
    });

    await repository.saveDailyState(
      asDailyState({
        id: '10000000-0000-4000-8000-000000000001',
        date: '2026-08-13',
        sleep: 2,
        mood: 3,
        alertness: 1,
      }),
    );
    await repository.saveAttempt(
      asAttempt({ id: 'attempt-1', taskText: '机の上を片付けたい' }),
    );
    await repository.savePreferences(
      asPreferences({ notificationsEnabled: false, aiConsent: false }),
    );

    expect(repository.storageKind).toBe('memory');
    expect(await repository.getDailyState('2026-08-13')).toMatchObject({
      alertness: 1,
    });
    expect(await repository.getAttempt('attempt-1')).toMatchObject({
      taskText: '机の上を片付けたい',
    });
    expect(await repository.getPreferences()).toMatchObject({
      aiConsent: false,
    });
  });

  it('retains a deletion tombstone for thirty days', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    await repository.saveAttempt(
      asAttempt({ id: 'attempt-1', taskText: 'test' }),
      { updatedAt: '2026-08-01T00:00:00.000Z' },
    );
    await repository.deleteAttempt(
      'attempt-1',
      '2026-08-13T00:00:00.000Z',
    );

    expect(await repository.getAttempt('attempt-1')).toBeNull();
    expect(await repository.listTombstones()).toEqual([
      {
        entityType: 'task_attempt',
        entityId: 'attempt-1',
        deletedAt: '2026-08-13T00:00:00.000Z',
        expiresAt: '2026-09-12T00:00:00.000Z',
      },
    ]);
    expect(
      await repository.purgeExpiredTombstones(
        new Date('2026-09-11T23:59:59.999Z'),
      ),
    ).toBe(0);
    expect(
      await repository.purgeExpiredTombstones(
        new Date('2026-09-12T00:00:00.000Z'),
      ),
    ).toBe(1);
  });

  it('replaces the same calendar day while preserving its original UUID', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const firstId = '10000000-0000-4000-8000-000000000001';
    await repository.saveDailyState(
      asDailyState({
        id: firstId,
        date: '2026-08-13',
        sleepRestfulness: 2,
        mood: 3,
        activation: 4,
        createdAt: '2026-08-13T00:00:00.000Z',
        updatedAt: '2026-08-13T00:00:00.000Z',
      }),
      { updatedAt: '2026-08-13T00:00:00.000Z' },
    );
    await repository.saveDailyState(
      asDailyState({
        id: '20000000-0000-4000-8000-000000000002',
        date: '2026-08-13',
        sleepRestfulness: 8,
        mood: 7,
        activation: 6,
        createdAt: '2026-08-13T10:00:00.000Z',
        updatedAt: '2026-08-13T10:00:00.000Z',
      }),
      { updatedAt: '2026-08-13T10:00:00.000Z' },
    );

    expect(await repository.getDailyState('2026-08-13')).toMatchObject({
      id: firstId,
      mood: 7,
      createdAt: '2026-08-13T00:00:00.000Z',
    });
    expect(await repository.listDailyStates()).toHaveLength(1);
  });

  it('filters and sorts daily states by payload date rather than UUID', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const states = [
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        date: '2026-08-11',
        sleepRestfulness: 1,
        mood: 1,
        activation: 1,
        createdAt: '2026-08-11T00:00:00.000Z',
        updatedAt: '2026-08-11T00:00:00.000Z',
      },
      {
        id: '00000000-0000-4000-8000-000000000001',
        date: '2026-08-13',
        sleepRestfulness: 3,
        mood: 3,
        activation: 3,
        createdAt: '2026-08-13T00:00:00.000Z',
        updatedAt: '2026-08-13T00:00:00.000Z',
      },
      {
        id: '77777777-7777-4777-8777-777777777777',
        date: '2026-08-12',
        sleepRestfulness: 2,
        mood: 2,
        activation: 2,
        createdAt: '2026-08-12T00:00:00.000Z',
        updatedAt: '2026-08-12T00:00:00.000Z',
      },
    ];
    for (const state of states) {
      await repository.saveDailyState(asDailyState(state), {
        updatedAt: state.updatedAt,
      });
    }

    expect(
      (await repository.listDailyStates()).map((state) => state.date),
    ).toEqual(['2026-08-13', '2026-08-12', '2026-08-11']);
    expect(
      (
        await repository.listDailyStates({
          from: '2026-08-12',
          to: '2026-08-13',
          newestFirst: false,
        })
      ).map((state) => state.date),
    ).toEqual(['2026-08-12', '2026-08-13']);
  });

  it('does not let an older remote record overwrite a local record', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    await repository.saveAttempt(
      asAttempt({ id: 'attempt-1', taskText: 'new' }),
      { updatedAt: '2026-08-13T10:00:00.000Z' },
    );

    expect(
      await repository.applySyncRecord({
        entityType: 'task_attempt',
        entityId: 'attempt-1',
        payload: { id: 'attempt-1', taskText: 'old' },
        updatedAt: '2026-08-13T09:00:00.000Z',
        deletedAt: null,
      }),
    ).toBe(false);
    expect(await repository.getAttempt('attempt-1')).toMatchObject({
      taskText: 'new',
    });
  });

  it('hard-clears all local state only when explicitly called', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    await repository.saveAttempt(asAttempt({ id: 'attempt-1' }));
    await repository.deleteDailyState(
      '2026-08-13',
      '2026-08-13T00:00:00.000Z',
    );
    await repository.setSyncCursor('2026-08-13T01:00:00.000Z');

    await repository.clearAll();

    expect(await repository.listAttempts()).toEqual([]);
    expect(await repository.listTombstones()).toEqual([]);
    expect(await repository.getSyncCursor()).toBeNull();
  });
});

describe('remoteRecordWins', () => {
  it('prefers deletion when timestamps tie', () => {
    const active = {
      entityType: 'task_attempt' as const,
      entityId: 'a',
      payload: { id: 'a' },
      updatedAt: '2026-08-13T00:00:00.000Z',
      deletedAt: null,
    };
    expect(
      remoteRecordWins(active, {
        ...active,
        payload: null,
        deletedAt: active.updatedAt,
      }),
    ).toBe(true);
  });
});
