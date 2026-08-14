import { describe, expect, it } from 'vitest';

import type { TaskAttempt } from '../../src/domain/types';
import {
  buildCsvExport,
  buildJsonExport,
  type ExportSnapshot,
} from '../../src/services/export';

const snapshot: ExportSnapshot = {
  schemaVersion: 1,
  exportedAt: '2026-08-13T12:00:00.000Z',
  dailyStates: [],
  attempts: [
    {
      id: 'attempt-1',
      taskText: '=HYPERLINK("unsafe")',
      startedAt: '2026-08-13T10:00:00.000Z',
      outcome: 'continued',
    } as unknown as TaskAttempt,
  ],
  preferences: null,
};

describe('explicit export builders', () => {
  it('creates a complete JSON snapshot', () => {
    const artifact = buildJsonExport(snapshot);
    expect(artifact.fileName).toBe('hajimeru-2026-08-13.json');
    expect(JSON.parse(artifact.contents)).toMatchObject({
      schemaVersion: 1,
      attempts: [{ id: 'attempt-1' }],
    });
  });

  it('escapes spreadsheet formulas and preserves Japanese-compatible BOM', () => {
    const artifact = buildCsvExport(snapshot);
    expect(artifact.contents.startsWith('\uFEFF')).toBe(true);
    expect(artifact.contents).toContain("'=HYPERLINK");
    expect(artifact.contents).toContain('attempt-1');
  });

  it('writes the domain outcome to the CSV status column', () => {
    const artifact = buildCsvExport(snapshot);
    const taskRow = artifact.contents.split('\r\n')[1] ?? '';
    const cells = [...taskRow.matchAll(/"((?:""|[^"])*)"(?:,|$)/g)].map(
      (match) => (match[1] ?? '').replace(/""/g, '"'),
    );
    expect(cells[6]).toBe('continued');
  });
});
