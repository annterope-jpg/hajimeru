import type { DailyState, TaskAttempt, UserPreferences } from '@/domain/types';
import type { LocalRepository } from '@/data';

export type ExportFormat = 'json' | 'csv';

export interface ExportSnapshot {
  schemaVersion: 1;
  exportedAt: string;
  dailyStates: DailyState[];
  attempts: TaskAttempt[];
  preferences: UserPreferences | null;
}

export interface ExportArtifact {
  fileName: string;
  mimeType: string;
  contents: string;
}

export interface SharedExport extends ExportArtifact {
  uri: string | null;
  shared: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function nestedValue(
  record: Record<string, unknown>,
  parentKeys: string[],
  keys: string[],
): unknown {
  for (const parentKey of parentKeys) {
    const parent = asRecord(record[parentKey]);
    for (const key of keys) {
      if (parent[key] !== undefined) return parent[key];
    }
  }
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return '';
}

function csvCell(value: unknown): string {
  let text =
    typeof value === 'string'
      ? value
      : value === null || value === undefined
        ? ''
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

  // Prevent formula execution when the user opens their export in a spreadsheet.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function createExportSnapshot(
  repository: LocalRepository,
  now = new Date(),
): Promise<ExportSnapshot> {
  const [dailyStates, attempts, preferences] = await Promise.all([
    repository.listDailyStates({ newestFirst: false }),
    repository.listAttempts({ newestFirst: false }),
    repository.getPreferences(),
  ]);
  return {
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    dailyStates,
    attempts,
    preferences,
  };
}

export function buildJsonExport(snapshot: ExportSnapshot): ExportArtifact {
  return {
    fileName: `hajimeru-${snapshot.exportedAt.slice(0, 10)}.json`,
    mimeType: 'application/json',
    contents: JSON.stringify(snapshot, null, 2),
  };
}

export function buildCsvExport(snapshot: ExportSnapshot): ExportArtifact {
  const headers = [
    'record_type',
    'record_id',
    'date',
    'task_text',
    'started_at',
    'ended_at',
    'status',
    'before_aversion',
    'after_aversion',
    'actual_difficulty',
    'wants_to_continue',
    'payload_json',
  ];
  const rows: unknown[][] = [];

  for (const dailyState of snapshot.dailyStates) {
    const record = asRecord(dailyState);
    rows.push([
      'daily_state',
      firstString(record, ['date']),
      firstString(record, ['date']),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      dailyState,
    ]);
  }

  for (const attempt of snapshot.attempts) {
    const record = asRecord(attempt);
    rows.push([
      'task_attempt',
      firstString(record, ['id']),
      firstString(record, ['date', 'createdAt']),
      firstString(record, ['taskText', 'input', 'task']),
      firstString(record, ['startedAt', 'startTime']),
      firstString(record, ['endedAt', 'endTime']),
      firstString(record, ['outcome', 'status', 'endState']),
      nestedValue(record, ['assessment', 'reflection'], [
        'beforeAversion',
        'aversionBefore',
      ]),
      nestedValue(record, ['postAssessment', 'reflection'], [
        'afterAversion',
        'aversionAfter',
      ]),
      nestedValue(record, ['postAssessment', 'reflection'], [
        'actualDifficulty',
      ]),
      nestedValue(record, ['postAssessment', 'reflection'], [
        'wantsToContinue',
        'continueIntention',
      ]),
      attempt,
    ]);
  }

  if (snapshot.preferences) {
    rows.push([
      'preferences',
      'default',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      snapshot.preferences,
    ]);
  }

  const contents = [headers, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
  return {
    fileName: `hajimeru-${snapshot.exportedAt.slice(0, 10)}.csv`,
    mimeType: 'text/csv',
    // BOM improves Japanese text handling in desktop spreadsheet apps.
    contents: `\uFEFF${contents}`,
  };
}

export async function prepareExport(
  repository: LocalRepository,
  format: ExportFormat,
  now = new Date(),
): Promise<ExportArtifact> {
  const snapshot = await createExportSnapshot(repository, now);
  return format === 'json'
    ? buildJsonExport(snapshot)
    : buildCsvExport(snapshot);
}

/**
 * Writes and opens the platform share sheet. Nothing calls this automatically;
 * it is intentionally designed for a user-initiated export button.
 */
export async function exportAndShare(
  repository: LocalRepository,
  format: ExportFormat,
): Promise<SharedExport> {
  const artifact = await prepareExport(repository, format);
  try {
    const [fileSystem, sharing] = await Promise.all([
      import('expo-file-system/legacy'),
      import('expo-sharing'),
    ]);
    if (!fileSystem.cacheDirectory) return { ...artifact, uri: null, shared: false };
    const directory = `${fileSystem.cacheDirectory}exports/`;
    await fileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const uri = `${directory}${artifact.fileName}`;
    await fileSystem.writeAsStringAsync(uri, artifact.contents, {
      encoding: fileSystem.EncodingType.UTF8,
    });
    const canShare = await sharing.isAvailableAsync();
    if (canShare) {
      await sharing.shareAsync(uri, {
        mimeType: artifact.mimeType,
        dialogTitle: '記録を書き出す',
        UTI: format === 'json' ? 'public.json' : 'public.comma-separated-values-text',
      });
    }
    return { ...artifact, uri, shared: canShare };
  } catch {
    // Web callers can use artifact.contents to trigger their own download.
    return { ...artifact, uri: null, shared: false };
  }
}
