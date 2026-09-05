import type {
  AttemptReflection,
  StateOverlay,
  UserPreferences,
} from "./types";

export function createEmptyAttemptReflection(): AttemptReflection {
  return {
    aversionBefore: null,
    aversionAfter: null,
    actualDifficulty: null,
    wantsToContinue: null,
  };
}

export function createDefaultUserPreferences(
  updatedAt = new Date().toISOString(),
): UserPreferences {
  return {
    notificationsEnabled: false,
    aiConsentGranted: false,
    syncEnabled: false,
    accessibility: {
      reduceMotion: false,
      largeText: false,
      screenReaderOptimized: false,
    },
    updatedAt,
  };
}

/** Unanswered state remains explicit and must not trigger an intervention. */
export function createUnassessedStateOverlay(): StateOverlay {
  return {
    status: "not_assessed",
    selected: null,
    allowedChoices: [],
  };
}
