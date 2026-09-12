import { describe, expect, it } from 'vitest';

import {
  SOCIAL_SUPPORT_MODES,
  createSocialSupportSelection,
  getSocialSupportTemplate,
} from '../../src/domain';

describe('person-controlled social support', () => {
  it('offers the four Phase 16 modes without a default selection', () => {
    expect(SOCIAL_SUPPORT_MODES).toEqual([
      'solo',
      'quiet_presence',
      'announce_start',
      'report_start',
    ]);
    expect(createSocialSupportSelection(undefined, undefined)).toBeNull();
    expect(createSocialSupportSelection('invalid', 'comfortable')).toBeNull();
  });

  it('keeps solo valid without interpreting a comfort response', () => {
    expect(createSocialSupportSelection('solo', 'pressure')).toEqual({
      mode: 'solo',
      comfort: null,
    });
  });

  it('requires the person to describe comfort for a social mode', () => {
    expect(createSocialSupportSelection('quiet_presence', undefined)).toBeNull();
    expect(createSocialSupportSelection('announce_start', 'pressure')).toEqual({
      mode: 'announce_start',
      comfort: 'pressure',
    });
    expect(createSocialSupportSelection('report_start', 'unsure')).toEqual({
      mode: 'report_start',
      comfort: 'unsure',
    });
  });

  it('uses fixed task-free templates and makes no sent-state claim', () => {
    expect(getSocialSupportTemplate('solo')).toBeNull();
    for (const mode of ['quiet_presence', 'announce_start', 'report_start'] as const) {
      const template = getSocialSupportTemplate(mode)!;
      expect(template).not.toMatch(/タスク|課題|完了|送信しました|既読/u);
      expect(template).toContain('不要です');
    }
  });
});
