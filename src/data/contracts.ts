import type {
  DailyState,
  TaskAttempt,
  UserPreferences,
} from '@/domain/types';

export type StorageKind = 'sqlite' | 'memory';

export type SyncEntityType =
  | 'daily_state'
  | 'task_attempt'
  | 'preferences';

export interface SaveMetadata {
  /** Override the identifier derived from the domain object. */
  entityId?: string;
  /** ISO-8601 timestamp. Intended mainly for deterministic imports/tests. */
  updatedAt?: string;
}

export interface ListOptions {
  limit?: number;
  newestFirst?: boolean;
}

export interface DailyStateListOptions extends ListOptions {
  from?: string;
  to?: string;
}

export interface Tombstone {
  entityType: SyncEntityType;
  entityId: string;
  deletedAt: string;
  expiresAt: string;
}

export interface SyncRecord {
  entityType: SyncEntityType;
  entityId: string;
  payload: unknown | null;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalRepository {
  readonly storageKind: StorageKind;

  initialize(): Promise<void>;

  saveDailyState(
    value: DailyState,
    metadata?: SaveMetadata,
  ): Promise<void>;
  /** Looks up the single daily state by its local calendar date (YYYY-MM-DD). */
  getDailyState(date: string): Promise<DailyState | null>;
  listDailyStates(options?: DailyStateListOptions): Promise<DailyState[]>;
  /** Deletes the state for the date and retains its UUID tombstone for sync. */
  deleteDailyState(date: string, deletedAt?: string): Promise<void>;

  saveAttempt(value: TaskAttempt, metadata?: SaveMetadata): Promise<void>;
  getAttempt(id: string): Promise<TaskAttempt | null>;
  listAttempts(options?: ListOptions): Promise<TaskAttempt[]>;
  deleteAttempt(id: string, deletedAt?: string): Promise<void>;

  savePreferences(
    value: UserPreferences,
    metadata?: Omit<SaveMetadata, 'entityId'>,
  ): Promise<void>;
  getPreferences(): Promise<UserPreferences | null>;
  deletePreferences(deletedAt?: string): Promise<void>;

  /** Returns current payload rows plus retained deletion records. */
  listSyncRecords(): Promise<SyncRecord[]>;
  /** Applies a remote record only when it wins last-write-wins resolution. */
  applySyncRecord(record: SyncRecord): Promise<boolean>;
  listTombstones(): Promise<Tombstone[]>;
  purgeExpiredTombstones(now?: Date): Promise<number>;

  getSyncCursor(): Promise<string | null>;
  setSyncCursor(cursor: string | null): Promise<void>;

  /** Hard-deletes all local records. This must only be called from explicit UI. */
  clearAll(): Promise<void>;
}

export interface LocalRepositoryOptions {
  databaseName?: string;
  /** Useful for web, tests, and environments without the Expo SQLite native module. */
  forceMemory?: boolean;
  now?: () => Date;
}
