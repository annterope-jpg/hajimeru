import { describe, expect, it } from 'vitest';

import {
  buildStartPlanDeepLink,
  nextClockOccurrence,
} from '../../src/services/notifications';

describe('notification helpers', () => {
  it('builds a deep link to the existing plan route', () => {
    expect(buildStartPlanDeepLink('attempt / 1')).toBe(
      'hajimeru://plan?attemptId=attempt%20%2F%201',
    );
  });

  it('moves an elapsed clock time to the following local day', () => {
    const now = new Date(2026, 7, 13, 20, 0, 0);
    const next = nextClockOccurrence(19, 30, now);
    expect(next?.getFullYear()).toBe(2026);
    expect(next?.getMonth()).toBe(7);
    expect(next?.getDate()).toBe(14);
    expect(next?.getHours()).toBe(19);
    expect(next?.getMinutes()).toBe(30);
  });

  it('rejects invalid clock times', () => {
    expect(nextClockOccurrence(24, 0)).toBeNull();
    expect(nextClockOccurrence(12, 60)).toBeNull();
  });
});
