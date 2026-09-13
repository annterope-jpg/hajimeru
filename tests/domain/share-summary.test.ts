import { describe, expect, it } from 'vitest';

import { createSupportedUseSharePreview, type TaskAttempt } from '../../src/domain';

function makeAttempt(): TaskAttempt {
  return {
    id: 'attempt-1',
    taskText: '申請書を開く',
    category: 'paperwork',
    assessment: {
      answers: {
        taskClarity: false,
        aversion: 8,
        lowActivation: 3,
        rewardDistance: 7,
        timeAmbiguity: 2,
        cueWeakness: 6,
        competingReward: 4,
      },
      unansweredAxes: [],
      axisScores: [],
      primaryBottlenecks: ['taskClarity', 'rewardDistance'],
    },
    plan: {
      firstAction: '申請書のファイルを開く',
      firstActionRationaleTag: 'make_concrete',
      durationMinutes: 3,
      startCue: '昼食後',
      activationRitual: null,
      distractionFriction: null,
      microReward: null,
      valueAnchor: '今日の自分を少し楽にする',
      returnCue: '開いた申請書を画面に残す',
      reassuranceAction: null,
      emotionSupport: null,
      emotionSupportLabel: null,
      emotionSupportKind: null,
      supportiveMessage: '一歩だけ試します',
      bottlenecks: ['taskClarity', 'rewardDistance'],
      source: 'local',
      createdAt: '2026-09-14T00:00:00.000Z',
    },
    roadmap: null,
    createdAt: '2026-09-14T00:00:00.000Z',
    startedAt: '2026-09-14T00:01:00.000Z',
    endedAt: '2026-09-14T00:04:00.000Z',
    outcome: 'stopped_success',
    reflection: {
      aversionBefore: 8,
      aversionAfter: 4,
      actualDifficulty: 3,
      wantsToContinue: false,
    },
    updatedAt: '2026-09-14T00:04:00.000Z',
    deletedAt: null,
  };
}

describe('createSupportedUseSharePreview', () => {
  it('shares nothing until the person selects a section', () => {
    const preview = createSupportedUseSharePreview(makeAttempt(), [], '2026-09-14T01:00:00.000Z');

    expect(preview.isShareable).toBe(false);
    expect(preview.text).toBe('');
    expect(preview.summary.selectedSections).toEqual([]);
    expect(preview.summary.userInitiatedShareOnly).toBe(true);
    expect(preview.summary.containsHiddenAssessment).toBe(false);
  });

  it('includes only person-selected sections', () => {
    const preview = createSupportedUseSharePreview(
      makeAttempt(),
      ['task_label', 'chosen_experiment'],
      '2026-09-14T01:00:00.000Z',
    );

    expect(preview.text).toContain('申請書を開く');
    expect(preview.text).toContain('申請書のファイルを開く');
    expect(preview.text).toContain('3分');
    expect(preview.text).not.toContain('今回の作業仮説');
    expect(preview.text).not.toContain('戻るための目印');
    expect(preview.text).not.toContain('ふりかえり');
  });

  it('uses qualitative working hypotheses and never exposes raw assessment scores', () => {
    const preview = createSupportedUseSharePreview(
      makeAttempt(),
      ['working_hypotheses'],
      '2026-09-14T01:00:00.000Z',
    );

    expect(preview.text).toContain('最初の動作を具体化する余地がある');
    expect(preview.text).toContain('変化や報酬が遠く感じやすい');
    expect(preview.text).not.toContain('8');
    expect(preview.text).not.toContain('7');
    expect(preview.text).not.toMatch(/診断|原因は|ADHD|うつ/);
  });

  it('keeps reflection qualitative rather than sharing 0-10 ratings', () => {
    const preview = createSupportedUseSharePreview(
      makeAttempt(),
      ['reflection'],
      '2026-09-14T01:00:00.000Z',
    );

    expect(preview.text).toContain('ここで一区切りにした');
    expect(preview.text).toContain('ここで十分という感覚');
    expect(preview.text).not.toContain('8');
    expect(preview.text).not.toContain('4');
    expect(preview.text).not.toContain('3');
  });

  it('deduplicates sections before creating the share contract', () => {
    const preview = createSupportedUseSharePreview(
      makeAttempt(),
      ['task_label', 'task_label'],
      '2026-09-14T01:00:00.000Z',
    );

    expect(preview.summary.selectedSections).toEqual(['task_label']);
    expect(preview.text.match(/【取り組んだ課題】/g)).toHaveLength(1);
  });
});
