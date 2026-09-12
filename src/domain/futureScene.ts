import type { Assessment, EpisodicFutureScene } from './types';

export const FUTURE_SCENE_FIELD_LIMIT = 120;

export interface FutureSceneDraft {
  focus?: EpisodicFutureScene['focus'];
  whenWhere?: unknown;
  scene?: unknown;
  feeling?: unknown;
}

function normalizeField(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().slice(0, FUTURE_SCENE_FIELD_LIMIT);
  return normalized.length > 0 ? normalized : null;
}

/** Eligibility is based on the answered axis, even when it is not top-two. */
export function isFutureSceneEligible(assessment: Assessment): boolean {
  return typeof assessment.answers.rewardDistance === 'number' &&
    assessment.answers.rewardDistance >= 6;
}

/** Never supplies a focus or invents missing details. */
export function createEpisodicFutureScene(
  draft: FutureSceneDraft,
): EpisodicFutureScene | null {
  if (draft.focus !== 'outcome' && draft.focus !== 'process') return null;
  const result: EpisodicFutureScene = {
    focus: draft.focus,
    whenWhere: normalizeField(draft.whenWhere),
    scene: normalizeField(draft.scene),
    feeling: normalizeField(draft.feeling),
  };
  return result.whenWhere || result.scene || result.feeling ? result : null;
}

/** Preview only what the person supplied; no inferred future is added. */
export function formatEpisodicFutureScene(value: EpisodicFutureScene): string {
  return [value.whenWhere, value.scene, value.feeling].filter(Boolean).join('。');
}
