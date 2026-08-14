import type {
  DailyState,
  TaskAttempt,
  UserPreferences,
} from '@/domain/types';

import type {
  DailyStateListOptions,
  ListOptions,
  LocalRepository,
  LocalRepositoryOptions,
  SaveMetadata,
  SyncEntityType,
  SyncRecord,
  Tombstone,
} from './contracts';
import {
  createStorageAdapter,
  type StorageAdapter,
  type StoredRow,
} from './store';

const PREFERENCES_ID = 'default';
const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(value: unknown, key: string): string | null {
  const field = asRecord(value)?.[key];
  return typeof field === 'string' && field.trim() !== '' ? field : null;
}

function requireIdentifier(
  explicit: string | undefined,
  value: unknown,
  field: string,
  label: string,
): string {
  const identifier = explicit ?? stringField(value, field);
  if (!identifier) {
    throw new Error(`${label} requires a non-empty ${field}.`);
  }
  return identifier;
}

function serialize(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error('The value cannot be serialized as JSON.');
  }
  return serialized;
}

function deserialize<T>(row: StoredRow | null): T | null {
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    // A malformed row is ignored rather than blocking the start flow.
    return null;
  }
}

function validLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  if (!Number.isFinite(limit) || limit < 0) return 0;
  return Math.floor(limit);
}

function compareIso(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function remoteRecordWins(
  local: SyncRecord | null,
  remote: SyncRecord,
): boolean {
  if (!local) return true;
  const timestampOrder = compareIso(remote.updatedAt, local.updatedAt);
  if (timestampOrder !== 0) return timestampOrder > 0;

  // At the same timestamp a delete wins, preventing an accidental resurrection.
  if (remote.deletedAt && !local.deletedAt) return true;
  if (!remote.deletedAt && local.deletedAt) return false;

  // The server is the stable tie-breaker, avoiding repeated push/pull oscillation.
  return true;
}

class Repository implements LocalRepository {
  private adapter: StorageAdapter | null = null;
  private initializing: Promise<void> | null = null;

  constructor(private readonly options: LocalRepositoryOptions) {}

  get storageKind(): 'sqlite' | 'memory' {
    return this.adapter?.kind ?? 'memory';
  }

  async initialize(): Promise<void> {
    if (this.adapter) return;
    if (!this.initializing) {
      this.initializing = (async () => {
        this.adapter = await createStorageAdapter(
          this.options.databaseName ?? 'hajimeru.db',
          this.options.forceMemory ?? false,
        );
      })();
    }
    await this.initializing;
  }

  private async store(): Promise<StorageAdapter> {
    await this.initialize();
    if (!this.adapter) throw new Error('Local repository failed to initialize.');
    return this.adapter;
  }

  private timestamp(metadata?: { updatedAt?: string }): string {
    return metadata?.updatedAt ?? (this.options.now ?? (() => new Date()))().toISOString();
  }

  private async save(
    entityType: SyncEntityType,
    entityId: string,
    value: unknown,
    updatedAt: string,
  ): Promise<void> {
    const store = await this.store();
    await store.put(entityType, {
      entityId,
      payload: serialize(value),
      updatedAt,
    });
  }

  async saveDailyState(
    value: DailyState,
    metadata?: SaveMetadata,
  ): Promise<void> {
    const requestedId = requireIdentifier(
      metadata?.entityId,
      value,
      'id',
      'DailyState',
    );
    const date = requireIdentifier(undefined, value, 'date', 'DailyState');
    const store = await this.store();
    const sameDate = (await store.list('daily_state'))
      .map((row) => ({ row, value: deserialize<DailyState>(row) }))
      .filter(
        (entry) => entry.value && stringField(entry.value, 'date') === date,
      )
      .sort((a, b) => compareIso(b.row.updatedAt, a.row.updatedAt));
    const existing = sameDate[0];
    const entityId = existing?.row.entityId ?? requestedId;
    const existingCreatedAt = existing?.value
      ? stringField(existing.value, 'createdAt')
      : null;
    const normalized = {
      ...value,
      id: entityId,
      ...(existingCreatedAt ? { createdAt: existingCreatedAt } : {}),
    } as DailyState;
    const updatedAt = this.timestamp(metadata);
    await this.save('daily_state', entityId, normalized, updatedAt);

    // Repair any pre-existing duplicate-day rows locally. The preserved newest
    // UUID remains stable, matching the server's unique user/date constraint.
    for (const duplicate of sameDate.slice(1)) {
      await this.remove('daily_state', duplicate.row.entityId, updatedAt);
    }
  }

  async getDailyState(date: string): Promise<DailyState | null> {
    const rows = await (await this.store()).list('daily_state');
    for (const row of rows) {
      const value = deserialize<DailyState>(row);
      if (value && stringField(value, 'date') === date) return value;
    }
    return null;
  }

  async listDailyStates(
    options: DailyStateListOptions = {},
  ): Promise<DailyState[]> {
    const rows = await (await this.store()).list('daily_state');
    const limit = validLimit(options.limit);
    const filtered = rows
      .map((row) => {
        const value = deserialize<DailyState>(row);
        return { value, date: value ? stringField(value, 'date') : null };
      })
      .filter(
        (
          entry,
        ): entry is {
          value: DailyState;
          date: string;
        } =>
          entry.value !== null &&
          entry.date !== null &&
          (!options.from || entry.date >= options.from) &&
          (!options.to || entry.date <= options.to),
      )
      .sort((a, b) =>
        options.newestFirst === false
          ? compareIso(a.date, b.date)
          : compareIso(b.date, a.date),
      );
    return filtered.slice(0, limit).map((entry) => entry.value);
  }

  async deleteDailyState(date: string, deletedAt?: string): Promise<void> {
    const rows = await (await this.store()).list('daily_state');
    const match = rows.find((row) => {
      const value = deserialize<DailyState>(row);
      return value && stringField(value, 'date') === date;
    });
    if (match) await this.remove('daily_state', match.entityId, deletedAt);
  }

  async saveAttempt(
    value: TaskAttempt,
    metadata?: SaveMetadata,
  ): Promise<void> {
    const id = requireIdentifier(metadata?.entityId, value, 'id', 'TaskAttempt');
    await this.save('task_attempt', id, value, this.timestamp(metadata));
  }

  async getAttempt(id: string): Promise<TaskAttempt | null> {
    const row = await (await this.store()).get('task_attempt', id);
    return deserialize<TaskAttempt>(row);
  }

  async listAttempts(options: ListOptions = {}): Promise<TaskAttempt[]> {
    const rows = await (await this.store()).list('task_attempt');
    const limit = validLimit(options.limit);
    return rows
      .sort((a, b) =>
        options.newestFirst === false
          ? compareIso(a.updatedAt, b.updatedAt)
          : compareIso(b.updatedAt, a.updatedAt),
      )
      .slice(0, limit)
      .map((row) => deserialize<TaskAttempt>(row))
      .filter((value): value is TaskAttempt => value !== null);
  }

  async deleteAttempt(id: string, deletedAt?: string): Promise<void> {
    await this.remove('task_attempt', id, deletedAt);
  }

  async savePreferences(
    value: UserPreferences,
    metadata?: Omit<SaveMetadata, 'entityId'>,
  ): Promise<void> {
    await this.save(
      'preferences',
      PREFERENCES_ID,
      value,
      this.timestamp(metadata),
    );
  }

  async getPreferences(): Promise<UserPreferences | null> {
    const row = await (await this.store()).get('preferences', PREFERENCES_ID);
    return deserialize<UserPreferences>(row);
  }

  async deletePreferences(deletedAt?: string): Promise<void> {
    await this.remove('preferences', PREFERENCES_ID, deletedAt);
  }

  private async remove(
    entityType: SyncEntityType,
    entityId: string,
    deletedAt?: string,
  ): Promise<void> {
    const deleted = deletedAt ?? this.timestamp();
    const deletedTime = new Date(deleted).getTime();
    if (!Number.isFinite(deletedTime)) {
      throw new Error('deletedAt must be a valid ISO-8601 timestamp.');
    }
    const expiresAt = new Date(
      deletedTime + TOMBSTONE_RETENTION_MS,
    ).toISOString();
    await (
      await this.store()
    ).removeWithTombstone(entityType, entityId, {
      entityType,
      entityId,
      deletedAt: deleted,
      expiresAt,
    });
  }

  private async localSyncRecord(
    entityType: SyncEntityType,
    entityId: string,
  ): Promise<SyncRecord | null> {
    const store = await this.store();
    const [row, tombstone] = await Promise.all([
      store.get(entityType, entityId),
      store.getTombstone(entityType, entityId),
    ]);
    if (tombstone && (!row || tombstone.deletedAt >= row.updatedAt)) {
      return {
        entityType,
        entityId,
        payload: null,
        updatedAt: tombstone.deletedAt,
        deletedAt: tombstone.deletedAt,
      };
    }
    if (!row) return null;
    return {
      entityType,
      entityId,
      payload: deserialize<unknown>(row),
      updatedAt: row.updatedAt,
      deletedAt: null,
    };
  }

  async listSyncRecords(): Promise<SyncRecord[]> {
    const store = await this.store();
    const entityTypes: readonly SyncEntityType[] = [
      'daily_state',
      'task_attempt',
      'preferences',
    ];
    const records: SyncRecord[] = [];
    for (const entityType of entityTypes) {
      const rows = await store.list(entityType);
      for (const row of rows) {
        const payload = deserialize<unknown>(row);
        if (payload !== null) {
          records.push({
            entityType,
            entityId: row.entityId,
            payload,
            updatedAt: row.updatedAt,
            deletedAt: null,
          });
        }
      }
    }
    for (const tombstone of await store.listTombstones()) {
      records.push({
        entityType: tombstone.entityType,
        entityId: tombstone.entityId,
        payload: null,
        updatedAt: tombstone.deletedAt,
        deletedAt: tombstone.deletedAt,
      });
    }
    return records;
  }

  async applySyncRecord(record: SyncRecord): Promise<boolean> {
    if (!record.entityId || !record.updatedAt) {
      throw new Error('A sync record requires entityId and updatedAt.');
    }
    const local = await this.localSyncRecord(record.entityType, record.entityId);
    if (!remoteRecordWins(local, record)) return false;

    if (record.deletedAt) {
      await this.remove(record.entityType, record.entityId, record.deletedAt);
      return true;
    }
    await this.save(
      record.entityType,
      record.entityId,
      record.payload,
      record.updatedAt,
    );
    return true;
  }

  async listTombstones(): Promise<Tombstone[]> {
    return (await this.store()).listTombstones();
  }

  async purgeExpiredTombstones(now = new Date()): Promise<number> {
    return (await this.store()).purgeTombstones(now.toISOString());
  }

  async getSyncCursor(): Promise<string | null> {
    return (await this.store()).getSyncCursor();
  }

  async setSyncCursor(cursor: string | null): Promise<void> {
    await (await this.store()).setSyncCursor(cursor);
  }

  async clearAll(): Promise<void> {
    await (await this.store()).clearAll();
  }
}

export function createLocalRepository(
  options: LocalRepositoryOptions = {},
): LocalRepository {
  return new Repository(options);
}

let singleton: LocalRepository | null = null;

export function getLocalRepository(): LocalRepository {
  if (!singleton) singleton = createLocalRepository();
  return singleton;
}

export function resetLocalRepositoryForTests(): void {
  singleton = null;
}
