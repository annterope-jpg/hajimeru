import { describe, expect, it } from 'vitest';

import {
  createShareSummaryCandidates,
  createSupportedUseSummary,
  formatSupportedUseSummary,
} from '../../src/domain';
import { attemptFixture } from '../fixtures/domain';

describe('person-led share summary', () => {
  it('starts with a blank task label and never reconstructs excluded content', () => {
    const base = attemptFixture();
    const attempt = attemptFixture({
      taskText: 'SECRET_FULL_TASK_TEXT',
      plan: { ...base.plan, valueAnchor: 'SECRET_VALUE_ANCHOR', emotionSupport: 'SECRET_EMOTION_TEXT' },
    });
    const candidates = createShareSummaryCandidates(attempt);
    expect(candidates.task_label).toBe('');
    expect(JSON.stringify(candidates)).not.toMatch(/SECRET_FULL_TASK_TEXT|SECRET_VALUE_ANCHOR|SECRET_EMOTION_TEXT/u);
  });

  it('includes only selected, nonblank, edited allowlisted fields', () => {
    const edits = {
      ...createShareSummaryCandidates(attemptFixture()),
      task_label: '編集した短い呼び名', helpful_point: '30秒なら試せた',
      difficult_point: '   ', next_change: '合図を見える場所へ置く',
    };
    const summary = createSupportedUseSummary({
      focus: 'reflection', mode: 'solo',
      selectedSections: ['task_label', 'helpful_point', 'difficult_point'], edits,
      generatedAt: '2026-09-14T00:00:00.000Z', expiresAt: '2026-09-15T00:00:00.000Z',
    });
    expect(summary.selectedSections).toEqual(['task_label', 'helpful_point']);
    expect(summary.items.map((item) => item.value)).toEqual(['編集した短い呼び名', '30秒なら試せた']);
    expect(JSON.stringify(summary)).not.toContain(edits.next_change);
  });

  it('formats only the allowlisted preview without rates, ids, or raw task text', () => {
    const attempt = attemptFixture({ id: 'SECRET_ATTEMPT_ID', taskText: 'SECRET_TASK' });
    const edits = { ...createShareSummaryCandidates(attempt), next_change: '次は1分にする' };
    const text = formatSupportedUseSummary(createSupportedUseSummary({
      focus: 'reflection', mode: 'solo', selectedSections: ['next_change'], edits,
      generatedAt: '2026-09-14T00:00:00.000Z', expiresAt: null,
    }));
    expect(text).toContain('次は1分にする');
    expect(text).not.toMatch(/SECRET_ATTEMPT_ID|SECRET_TASK|開始率|startedAt/u);
  });
});
