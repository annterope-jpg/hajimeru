import { describe, expect, it } from 'vitest';

import {
  DATA_CAPABILITIES,
  DATA_PERMISSION_DEFINITIONS,
  getDataPermissionDefinition,
} from '../../src/domain';

describe('data permission definitions', () => {
  it('defines every capability exactly once', () => {
    expect(DATA_PERMISSION_DEFINITIONS.map((item) => item.capability)).toEqual(DATA_CAPABILITIES);
    expect(new Set(DATA_PERMISSION_DEFINITIONS.map((item) => item.capability)).size).toBe(DATA_CAPABILITIES.length);
  });

  it('keeps every network or sharing capability optional', () => {
    for (const capability of ['notifications', 'aiSuggestions', 'sync', 'therapistShare'] as const) {
      expect(getDataPermissionDefinition(capability).required).toBe(false);
    }
  });

  it('describes selective person-initiated sharing as optional', () => {
    const definition = getDataPermissionDefinition('therapistShare');
    expect(definition).toMatchObject({ status: 'available', required: false });
    expect(definition.destination).toContain('OS');
    expect(definition.data).toHaveLength(1);
  });

  it('describes destination, retention, and withdrawal for every capability', () => {
    for (const item of DATA_PERMISSION_DEFINITIONS) {
      expect(item.destination).not.toBe('');
      expect(item.retention).not.toBe('');
      expect(item.withdrawal).not.toBe('');
    }
  });
});
