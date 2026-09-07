import { describe, expect, it } from 'vitest';

import { HYPOTHESIS_FIT_OPTIONS, getHypothesisFitGuidance } from '../../src/domain';

describe('shared decision guidance', () => {
  it('offers close, different, and unsure without a correct-answer option', () => {
    expect(HYPOTHESIS_FIT_OPTIONS.map((option) => option.value)).toEqual([
      'close',
      'different',
      'unsure',
    ]);
  });

  it.each(HYPOTHESIS_FIT_OPTIONS)('keeps trying optional for $value', ({ value }) => {
    const guidance = getHypothesisFitGuidance(value);

    expect(guidance.message).not.toMatch(/正解です|必ず|改善/u);
    expect(guidance.startLabel).toContain('試す');
  });

  it('makes disagreement a route to revision or stopping, not failure', () => {
    const guidance = getHypothesisFitGuidance('different');

    expect(guidance.message).toContain('回答を見直す');
    expect(guidance.message).toContain('見送る');
    expect(guidance.message).toContain('失敗にはなりません');
  });
});
