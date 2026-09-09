import { describe, expect, it } from 'vitest';

import {
  RETRY_REASONS,
  createRetryAdjustment,
} from '../../src/domain';
import { attemptFixture } from '../fixtures/domain';

describe('stuck retry adjustment', () => {
  it('covers four adjustment hypotheses and the choice not to continue', () => {
    expect(RETRY_REASONS).toEqual([
      'action_too_large',
      'decision_remains',
      'freeze_or_tension',
      'low_activation',
      'not_choose_now',
    ]);
  });

  it('makes an oversized action one physical step smaller without mutating the original', () => {
    const plan = attemptFixture().plan;
    const originalAction = plan.firstAction;
    const result = createRetryAdjustment(plan, 'action_too_large');

    expect(result.adjustedPlan?.firstAction).toContain('対象を1つ、指で示す');
    expect(result.adjustedPlan?.firstActionRationaleTag).toBe('make_concrete');
    expect(result.choices).toContain('retry');
    expect(plan.firstAction).toBe(originalAction);
  });

  it('reduces a remaining decision instead of asking for a better decision', () => {
    const result = createRetryAdjustment(attemptFixture().plan, 'decision_remains');

    expect(result.adjustedPlan?.firstAction).toBe(
      '候補を1つだけ目の前に置き、決めるのはあとにする',
    );
    expect(result.adjustedPlan?.firstActionRationaleTag).toBe('reduce_friction');
    expect(result.message).toContain('判断を完成させず');
    expect(result.message).not.toMatch(/正しい|良い判断/u);
  });

  it('keeps freeze and low activation as separate, non-diagnostic adjustments', () => {
    const plan = attemptFixture().plan;
    const freeze = createRetryAdjustment(plan, 'freeze_or_tension');
    const lowActivation = createRetryAdjustment(plan, 'low_activation');

    expect(freeze.adjustedPlan?.stateOverlay?.selected).toBe('freeze_or_tension');
    expect(freeze.choices).toEqual(['retry', 'change_time', 'rest', 'end']);
    expect(lowActivation.adjustedPlan?.stateOverlay?.selected).toBe('low_activation');
    expect(lowActivation.choices).toEqual(['retry', 'change_time', 'rest']);
    expect(`${freeze.message}${lowActivation.message}`).not.toMatch(/診断|原因|症状/u);
  });

  it('respects choosing nothing now and offers no retry plan', () => {
    const result = createRetryAdjustment(attemptFixture().plan, 'not_choose_now');

    expect(result.adjustedPlan).toBeNull();
    expect(result.choices).toEqual(['end']);
    expect(`${result.heading}${result.message}`).not.toMatch(/必ず|失敗|改善/u);
  });
});
