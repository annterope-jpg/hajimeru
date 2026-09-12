import { describe, expect, it } from 'vitest';

import {
  assessBottlenecks,
  createEpisodicFutureScene,
  formatEpisodicFutureScene,
  isFutureSceneEligible,
} from '../../src/domain';

function assessment(rewardDistance: number | null) {
  return assessBottlenecks({
    taskClarity: false,
    aversion: 10,
    lowActivation: 10,
    rewardDistance,
    timeAmbiguity: null,
    cueWeakness: null,
    competingReward: null,
  });
}

describe('episodic future scene', () => {
  it('is offered at an answered score of 6, even outside the top two', () => {
    const result = assessment(6);
    expect(result.primaryBottlenecks).not.toContain('rewardDistance');
    expect(isFutureSceneEligible(result)).toBe(true);
    expect(isFutureSceneEligible(assessment(5))).toBe(false);
    expect(isFutureSceneEligible(assessment(null))).toBe(false);
  });

  it('requires an explicit focus and at least one person-supplied detail', () => {
    expect(createEpisodicFutureScene({ scene: '机が少し空く' })).toBeNull();
    expect(createEpisodicFutureScene({ focus: 'outcome' })).toBeNull();
    expect(createEpisodicFutureScene({ focus: 'process', scene: '  書類を1枚分けている  ' })).toEqual({
      focus: 'process',
      whenWhere: null,
      scene: '書類を1枚分けている',
      feeling: null,
    });
  });

  it('keeps partial scenes partial and truncates oversized fields', () => {
    const result = createEpisodicFutureScene({
      focus: 'outcome',
      whenWhere: '明日の朝、机の前で',
      scene: '見'.repeat(140),
      feeling: '',
    });
    expect(result?.scene).toHaveLength(120);
    expect(result?.feeling).toBeNull();
    expect(formatEpisodicFutureScene(result!)).toBe(`明日の朝、机の前で。${'見'.repeat(120)}`);
  });

  it('does not create defaults from malformed restored values', () => {
    expect(createEpisodicFutureScene({ focus: 'other' as 'outcome', scene: 'text' })).toBeNull();
    expect(createEpisodicFutureScene({ focus: 'outcome', scene: 42 as unknown as string })).toBeNull();
  });
});
