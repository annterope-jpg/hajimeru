import type { SyncEntityType, Tombstone } from './contracts';
import { runMigrations } from './migrations';

export interface StoredRow {
  entityId: string;
  payload: string;
  updatedAt: string;
}

export interface StorageAdapter {
  readonly kind: 'sqlite' | 'memory';
  initialize(): Promise<void>;
  get(entityType: SyncEntityType, entityId: string): Promise<StoredRow | null>;
  list(entityType: SyncEntityType): Promise<StoredRow[]>;
  put(entityType: SyncEntityType, row: StoredRow): Promise<void>;
  removeWithTombstone(
    entityType: SyncEntityType,
    entityId: string,
    tombstone: Tombstone,
  ): Promise<void>;
  getTombstone(
    entityType: SyncEntityType,
    entityId: string,
  ): Promise<Tombstone | null>;
  listTombstones(): Promise<Tombstone[]>;
  purgeTombstones(expiresBeforeOrAt: string): Promise<number>;
  getSyncCursor(): Promise<string | null>;
  setSyncCursor(cursor: string | null): Promise<void>;
  clearAll(): Promise<void>;
}

type ExpoSQLiteModule = typeof import('expo-sqlite');
type SQLiteDatabase = Awaited<ReturnType<ExpoSQLiteModule['openDatabaseAsync']>>;

const tableByEntity: Record<SyncEntityType, string> = {
  daily_state: 'daily_states',
  task_attempt: 'task_attempts',
  preferences: 'preferences',
};

interface SQLiteRow {
  entity_id: string;
  payload: string;
  updated_at: string;
}

interface SQLiteTombstoneRow {
  entity_type: SyncEntityType;
  entity_id: string;
  deleted_at: string;
  expires_at: string;
}

function toStoredRow(row: SQLiteRow): StoredRow {
  return {
    entityId: row.entity_id,
    payload: row.payload,
    updatedAt: row.updated_at,
  };
}

function toTombstone(row: SQLiteTombstoneRow): Tombstone {
  return {
    entityType: row.entity_type,
    entityId: row.entity_id,
    deletedAt: row.deleted_at,
    expiresAt: row.expires_at,
  };
}

export class SQLiteStorageAdapter implements StorageAdapter {
  readonly kind = 'sqlite' as const;

  constructor(private readonly db: SQLiteDatabase) {}

  async initialize(): Promise<void> {
    await runMigrations(this.db);
  }

  async get(
    entityType: SyncEntityType,
    entityId: string,
  ): Promise<StoredRow | null> {
    const table = tableByEntity[entityType];
    const row = await this.db.getFirstAsync<SQLiteRow>(
      `SELECT entity_id, payload, updated_at FROM ${table} WHERE entity_id = ?`,
      [entityId],
    );
    return row ? toStoredRow(row) : null;
  }

  async list(entityType: SyncEntityType): Promise<StoredRow[]> {
    const table = tableByEntity[entityType];
    const rows = await this.db.getAllAsync<SQLiteRow>(
      `SELECT entity_id, payload, updated_at FROM ${table}`,
    );
    return rows.map(toStoredRow);
  }

  async put(entityType: SyncEntityType, row: StoredRow): Promise<void> {
    const table = tableByEntity[entityType];
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO ${table} (entity_id, payload, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(entity_id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
        [row.entityId, row.payload, row.updatedAt],
      );
      await this.db.runAsync(
        'DELETE FROM tombstones WHERE entity_type = ? AND entity_id = ?',
        [entityType, row.entityId],
      );
    });
  }

  async removeWithTombstone(
    entityType: SyncEntityType,
    entityId: string,
    tombstone: Tombstone,
  ): Promise<void> {
    const table = tableByEntity[entityType];
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(`DELETE FROM ${table} WHERE entity_id = ?`, [
        entityId,
      ]);
      await this.db.runAsync(
        `INSERT INTO tombstones
          (entity_type, entity_id, deleted_at, expires_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(entity_type, entity_id) DO UPDATE SET
           deleted_at = excluded.deleted_at,
           expires_at = excluded.expires_at`,
        [
          tombstone.entityType,
          tombstone.entityId,
          tombstone.deletedAt,
          tombstone.expiresAt,
        ],
      );
    });
  }

  async getTombstone(
    entityType: SyncEntityType,
    entityId: string,
  ): Promise<Tombstone | null> {
    const row = await this.db.getFirstAsync<SQLiteTombstoneRow>(
      `SELECT entity_type, entity_id, deleted_at, expires_at
       FROM tombstones WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId],
    );
    return row ? toTombstone(row) : null;
  }

  async listTombstones(): Promise<Tombstone[]> {
    const rows = await this.db.getAllAsync<SQLiteTombstoneRow>(
      `SELECT entity_type, entity_id, deleted_at, expires_at
       FROM tombstones`,
    );
    return rows.map(toTombstone);
  }

  async purgeTombstones(expiresBeforeOrAt: string): Promise<number> {
    const result = await this.db.runAsync(
      'DELETE FROM tombstones WHERE expires_at <= ?',
      [expiresBeforeOrAt],
    );
    return result.changes;
  }

  async getSyncCursor(): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string | null }>(
      "SELECT value FROM sync_state WHERE key = 'cursor'",
    );
    return row?.value ?? null;
  }

  async setSyncCursor(cursor: string | null): Promise<void> {
    if (cursor === null) {
      await this.db.runAsync("DELETE FROM sync_state WHERE key = 'cursor'");
      return;
    }
    await this.db.runAsync(
      `INSERT INTO sync_state (key, value) VALUES ('cursor', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [cursor],
    );
  }

  async clearAll(): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      for (const table of Object.values(tableByEntity)) {
        await this.db.execAsync(`DELETE FROM ${table};`);
      }
      await this.db.execAsync('DELETE FROM tombstones; DELETE FROM sync_state;');
    });
  }
}

function keyFor(entityType: SyncEntityType, entityId: string): string {
  return `${entityType}\u0000${entityId}`;
}

export class MemoryStorageAdapter implements StorageAdapter {
  readonly kind = 'memory' as const;
  private readonly rows = new Map<string, StoredRow>();
  private readonly tombstones = new Map<string, Tombstone>();
  private cursor: string | null = null;

  async initialize(): Promise<void> {}

  async get(
    entityType: SyncEntityType,
    entityId: string,
  ): Promise<StoredRow | null> {
    return this.rows.get(keyFor(entityType, entityId)) ?? null;
  }

  async list(entityType: SyncEntityType): Promise<StoredRow[]> {
    const prefix = `${entityType}\u0000`;
    return [...this.rows.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, row]) => row);
  }

  async put(entityType: SyncEntityType, row: StoredRow): Promise<void> {
    const key = keyFor(entityType, row.entityId);
    this.rows.set(key, row);
    this.tombstones.delete(key);
  }

  async removeWithTombstone(
    entityType: SyncEntityType,
    entityId: string,
    tombstone: Tombstone,
  ): Promise<void> {
    const key = keyFor(entityType, entityId);
    this.rows.delete(key);
    this.tombstones.set(key, tombstone);
  }

  async getTombstone(
    entityType: SyncEntityType,
    entityId: string,
  ): Promise<Tombstone | null> {
    return this.tombstones.get(keyFor(entityType, entityId)) ?? null;
  }

  async listTombstones(): Promise<Tombstone[]> {
    return [...this.tombstones.values()];
  }

  async purgeTombstones(expiresBeforeOrAt: string): Promise<number> {
    let removed = 0;
    for (const [key, tombstone] of this.tombstones) {
      if (tombstone.expiresAt <= expiresBeforeOrAt) {
        this.tombstones.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  async getSyncCursor(): Promise<string | null> {
    return this.cursor;
  }

  async setSyncCursor(cursor: string | null): Promise<void> {
    this.cursor = cursor;
  }

  async clearAll(): Promise<void> {
    this.rows.clear();
    this.tombstones.clear();
    this.cursor = null;
  }
}

export async function createStorageAdapter(
  databaseName: string,
  forceMemory: boolean,
): Promise<StorageAdapter> {
  if (!forceMemory) {
    try {
      const sqlite = await import('expo-sqlite');
      const db = await sqlite.openDatabaseAsync(databaseName);
      const adapter = new SQLiteStorageAdapter(db);
      await adapter.initialize();
      return adapter;
    } catch (error) {
      // The browser prototype intentionally falls back because SQLite WASM is
      // not available in every preview host. Native must never hide a storage
      // or migration failure behind a volatile in-memory database.
      let isWeb = false;
      try {
        const { Platform } = await import('react-native');
        isWeb = Platform.OS === 'web';
      } catch {
        // A non-React-Native host is treated as native-safe: do not silently
        // discard persistence unless forceMemory was explicitly requested.
      }
      if (!isWeb) throw error;
    }
  }

  const fallback = new MemoryStorageAdapter();
  await fallback.initialize();
  return fallback;
}
