import { describe, expect, it } from 'vitest';

import {
  ASSESSMENT_AXES,
  PROHIBITED_USER_CLAIMS,
  assessBottlenecks,
  createSafeDiagnosticEvent,
  createUnassessedStateOverlay,
  findProhibitedUserClaims,
  type DecisionRule,
  type FutureCue,
  type StateOverlay,
  type SupportedUseSummary,
} from '../../src/domain';
import { attemptFixture, FIXTURE_NOW } from '../fixtures/domain';

describe('stable clinical domain contracts', () => {
  it('can represent the four planned contracts without persistence or UI dependencies', () => {
    const overlay: StateOverlay = {
      status: 'answered',
      selected: 'low_activation',
      allowedChoices: ['make_smaller', 'change_time', 'rest'],
    };
    const rule: DecisionRule = {
      id: 'cue-when-answered',
      input: 'cueWeakness',
      requiresAnsweredInput: true,
      interventionTag: 'externalize_cue',
      explanation: '戻る目印を外に置く候補を示す',
      evidenceStatus: 'implemented',
    };
    const cue: FutureCue = {
      kind: 'event',
      label: '夕食後',
      localTime: null,
      timeZoneOffsetMinutes: null,
    };
    const summary: SupportedUseSummary = {
      mode: 'together_on_persons_device',
      selectedSections: ['working_hypotheses', 'chosen_experiment'],
      generatedAt: FIXTURE_NOW,
      userInitiatedShareOnly: true,
      containsHiddenAssessment: false,
    };

    expect(overlay.status).toBe('answered');
    expect(rule.requiresAnsweredInput).toBe(true);
    expect(cue.kind).toBe('event');
    expect(summary).toMatchObject({
      userInitiatedShareOnly: true,
      containsHiddenAssessment: false,
    });
  });

  it('keeps an unassessed state empty rather than inferring it', () => {
    expect(createUnassessedStateOverlay()).toEqual({
      status: 'not_assessed',
      selected: null,
      allowedChoices: [],
    });
    const assessment = assessBottlenecks({});
    expect(assessment.axisScores).toEqual([]);
    expect(assessment.primaryBottlenecks).toEqual([]);
    expect(assessment.unansweredAxes).toEqual(ASSESSMENT_AXES);
  });

  it('provides a complete backward-compatible attempt fixture', () => {
    const fixture = attemptFixture();
    expect(JSON.parse(JSON.stringify(fixture))).toEqual(fixture);
    expect(fixture.startedAt).toBeNull();
    expect(fixture.assessment.primaryBottlenecks).toEqual([]);
  });
});

describe('boundary regression guards', () => {
  it('finds prohibited diagnostic, treatment, medication, certainty, and punitive claims', () => {
    for (const claim of PROHIBITED_USER_CLAIMS) {
      expect(findProhibitedUserClaims(`説明：${claim}`)).toEqual([claim]);
    }
    expect(findProhibitedUserClaims('診断や治療を行わない、小さな行動実験です。')).toEqual([]);
  });

  it('only emits allow-listed diagnostic metadata and strips free text from codes', () => {
    const event = createSafeDiagnosticEvent({
      name: 'ai_fallback_used',
      feature: 'ai',
      outcome: 'fallback',
      code: 'timeout: task=患者の自由記述',
    });
    expect(event).toEqual({
      name: 'ai_fallback_used',
      feature: 'ai',
      outcome: 'fallback',
      code: null,
    });
    expect(JSON.stringify(event)).not.toContain('患者');
    expect(JSON.stringify(event)).not.toContain('自由記述');
  });

});
