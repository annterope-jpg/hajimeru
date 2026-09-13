import { describe, expect, it } from 'vitest';

import { createAdjacentTransitionSupport } from '../../src/domain';

describe('createAdjacentTransitionSupport', () => {
  it('returns no support when neither switching nor loss-of-track was identified', () => {
    expect(
      createAdjacentTransitionSupport({ category: 'email', bottlenecks: ['taskClarity'] }),
    ).toEqual({ switchBridge: null, returnBridge: null });
  });

  it('uses an explicitly answered competing reward only for a brief switch bridge', () => {
    const result = createAdjacentTransitionSupport({
      category: 'studying',
      bottlenecks: ['competingReward'],
    });

    expect(result.switchBridge).toContain('10秒だけ止め');
    expect(result.switchBridge).toContain('その後に決める');
    expect(result.returnBridge).toBeNull();
  });

  it('uses cue weakness only for a visible way back', () => {
    const result = createAdjacentTransitionSupport({
      category: 'paperwork',
      bottlenecks: ['cueWeakness'],
    });

    expect(result.switchBridge).toBeNull();
    expect(result.returnBridge).toContain('戻る場所を1つだけ');
  });

  it('supports a transition-category task without blocking the preferred activity', () => {
    const result = createAdjacentTransitionSupport({
      category: 'transition',
      bottlenecks: [],
    });

    expect(result.switchBridge).toContain('10秒だけ止め');
    expect(result.switchBridge).not.toContain('禁止');
    expect(result.switchBridge).not.toContain('完了');
  });
});
