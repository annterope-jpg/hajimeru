import { describe, expect, it } from 'vitest';

import { createLocalRepository } from '../../src/data/repository';
import { attemptFixture } from '../fixtures/domain';

describe('domain persistence contract', () => {
  it('round-trips a complete attempt through the local repository', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const attempt = attemptFixture();

    await repository.saveAttempt(attempt, {
      entityId: attempt.id,
      updatedAt: attempt.updatedAt,
    });

    await expect(repository.getAttempt(attempt.id)).resolves.toEqual(attempt);
  });

  it('does not invent new optional domain contracts in older stored attempts', async () => {
    const repository = createLocalRepository({ forceMemory: true });
    const attempt = attemptFixture();
    await repository.saveAttempt(attempt);

    const restored = await repository.getAttempt(attempt.id);
    expect(restored).not.toHaveProperty('stateOverlay');
    expect(restored).not.toHaveProperty('decisionRule');
    expect(restored).not.toHaveProperty('futureCue');
    expect(restored).not.toHaveProperty('supportedUseSummary');
  });
});
