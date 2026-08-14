import type {
  AttemptReflection,
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
