import { describe, expect, it } from 'vitest';

import {
  assessBottlenecks,
  captureLocalTimeContext,
  createLocalInterventionPlan,
  createStateOverlay,
} from '../../src/domain';

describe('person-described state support', () => {
  it.each([
    ['sleepiness', '眠気'],
    ['fatigue', '疲れ'],
    ['brain_fog', '頭の霧'],
    ['body_heaviness', '身体の重さ'],
    ['mixed', '重なる'],
    ['unclear', '決めなくて'],
  ] as const)('keeps %s distinct without diagnosing a cause', (experience, phrase) => {
    const overlay = createStateOverlay({ experience });

    expect(`${overlay.support?.heading}${overlay.support?.message}`).toContain(phrase);
    expect(overlay.allowedChoices).toContain('rest');
    expect(overlay.allowedChoices).toContain('change_time');
    expect(overlay.allowedChoices).toContain('seek_support');
    expect(`${overlay.support?.heading}${overlay.support?.message}`).not.toMatch(
      /診断|原因は|ADHD|うつ|睡眠障害|薬が効/u,
    );
  });

  it('adds a freeze preparation only after an explicit yes', () => {
    expect(createStateOverlay({ experience: 'freeze' }).support?.action).toBeNull();
    expect(
      createStateOverlay({ experience: 'freeze', reliefPreference: 'no' }).support?.action,
    ).toBeNull();
    expect(
      createStateOverlay({ experience: 'freeze', reliefPreference: 'yes' }).support?.action,
    ).toContain('息を長く1回');
  });

  it('keeps legacy or unanswered state detail unassessed instead of inventing it', () => {
    const legacy = createStateOverlay({
      legacyOverlay: {
        status: 'answered',
        selected: 'low_activation',
        allowedChoices: ['continue', 'rest'],
      },
    });

    expect(legacy.experience).toBeUndefined();
    expect(legacy.localTimeContext).toBeUndefined();
    expect(legacy.support).toBeUndefined();
  });

  it('captures the local clock and offset at observation time', () => {
    const observedAt = new Date(2026, 8, 11, 6, 30, 0, 0);
    const context = captureLocalTimeContext(observedAt, 'Device/Local');

    expect(context.observedAt).toBe(observedAt.toISOString());
    expect(context.localDate).toBe('2026-09-11');
    expect(context.localHour).toBe(6);
    expect(context.localMinute).toBe(30);
    expect(context.timeZone).toBe('Device/Local');
    expect(context.timeZoneOffsetMinutes).toBe(-observedAt.getTimezoneOffset());
  });

  it('honors an explicit state description even below the numeric threshold', () => {
    const context = captureLocalTimeContext(new Date(2026, 8, 11, 6, 30));
    const plan = createLocalInterventionPlan({
      taskText: 'メールを確認する',
      assessment: assessBottlenecks({ lowActivation: 2 }),
      stateExperience: 'sleepiness',
      localTimeContext: context,
    });

    expect(plan.stateOverlay?.experience).toBe('sleepiness');
    expect(plan.stateOverlay?.localTimeContext).toEqual(context);
    expect(plan.activationRitual).toBeNull();
    expect(plan.stateOverlay?.allowedChoices).toContain('rest');
  });
});
