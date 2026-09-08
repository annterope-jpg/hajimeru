import { describe, expect, it } from 'vitest';

import {
  SUPPORTED_USE_END_POINT_COPY,
  SUPPORTED_USE_FOCUS_COPY,
  createSupportedUseSession,
  getSupportedUseStartRoute,
} from '../../src/domain';

describe('same-device supported use', () => {
  it('creates a person-initiated, same-device-only temporary contract', () => {
    expect(createSupportedUseSession('start', 'choice', '2026-09-09T06:00:00.000Z')).toEqual({
      focus: 'start',
      endPoint: 'choice',
      startedAt: '2026-09-09T06:00:00.000Z',
      personInitiated: true,
      sameDeviceOnly: true,
    });
  });

  it('routes new formulation locally and review focuses to person-facing records', () => {
    expect(getSupportedUseStartRoute('start')).toBe('/(tabs)');
    expect(getSupportedUseStartRoute('roadmap')).toBe('/(tabs)');
    expect(getSupportedUseStartRoute('retry')).toBe('/(tabs)/insights');
    expect(getSupportedUseStartRoute('reflection')).toBe('/(tabs)/insights');
  });

  it('provides copy for every selectable focus and stopping point', () => {
    expect(Object.keys(SUPPORTED_USE_FOCUS_COPY)).toEqual(['start', 'roadmap', 'retry', 'reflection']);
    expect(Object.keys(SUPPORTED_USE_END_POINT_COPY)).toEqual(['overview', 'choice', 'experiment']);
  });
});
