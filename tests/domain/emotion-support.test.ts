import { describe, expect, it } from 'vitest';

import {
  assessBottlenecks,
  createLocalInterventionPlan,
  needsEmotionReliefChoice,
  selectEmotionSupport,
} from '../../src/domain';

describe('person-selected emotional support', () => {
  it('distinguishes uncertainty, evaluation, shame, and pressure', () => {
    const cases = [
      ['uncertainty', 'uncertainty', '不確かなことを1つ'],
      ['self_evaluation', 'self_evaluation', '人に見せない下書き'],
      ['shame', 'shame_self_blame', '埋め合わせは今決めず'],
      ['pressure', 'pressure', '急ぎや締切を強めず'],
    ] as const;

    for (const [response, kind, phrase] of cases) {
      const result = selectEmotionSupport({
        responses: [response],
        preference: 'yes',
      });
      expect(result?.kind).toBe(kind);
      expect(result?.action).toContain(phrase);
    }
  });

  it('does not place threat-reduction support without an explicit yes', () => {
    for (const preference of [undefined, 'unsure', 'no'] as const) {
      expect(
        selectEmotionSupport({ responses: ['self_evaluation'], preference }),
      ).toBeNull();
    }
  });

  it('handles boredom without urgency or a character judgment', () => {
    const result = selectEmotionSupport({ responses: ['boredom'] });

    expect(result?.kind).toBe('boredom');
    expect(result?.action).toContain('1分');
    expect(`${result?.action}${result?.message}`).not.toMatch(
      /急げ|締切直前|やる気がない|怠け/u,
    );
  });

  it('asks the optional relief question only for threat-like or freeze descriptions', () => {
    expect(needsEmotionReliefChoice(['uncertainty'])).toBe(true);
    expect(needsEmotionReliefChoice(['self_evaluation'])).toBe(true);
    expect(needsEmotionReliefChoice(['shame'])).toBe(true);
    expect(needsEmotionReliefChoice(['pressure'])).toBe(true);
    expect(needsEmotionReliefChoice([], 'freeze')).toBe(true);
    expect(needsEmotionReliefChoice(['boredom'], 'fatigue')).toBe(false);
    expect(needsEmotionReliefChoice(['unclear'])).toBe(false);
  });

  it('uses calming preparation for freeze only when the person requests it', () => {
    const assessment = assessBottlenecks({ aversion: 9, lowActivation: 8 });
    const declined = createLocalInterventionPlan({
      taskText: 'メールを返信する',
      assessment,
      activationSource: 'freeze',
      anxietyReliefPreference: 'no',
    });
    const requested = createLocalInterventionPlan({
      taskText: 'メールを返信する',
      assessment,
      activationSource: 'freeze',
      anxietyReliefPreference: 'yes',
    });

    expect(declined.activationRitual).toBeNull();
    expect(declined.emotionSupport).toBeNull();
    expect(requested.activationRitual).toContain('息を長く1回');
    expect(requested.emotionSupportKind).toBe('freeze_tension');
  });

  it('keeps legacy anxiety records readable as uncertainty support', () => {
    expect(
      selectEmotionSupport({ responses: ['anxiety'], preference: 'yes' })?.kind,
    ).toBe('uncertainty');
  });
});
