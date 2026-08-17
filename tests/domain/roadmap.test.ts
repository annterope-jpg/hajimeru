import { describe, expect, it } from 'vitest';

import { createLocalRoadmap, inferTaskCategory } from '../../src/domain';

describe('createLocalRoadmap', () => {
  it('keeps the immediate action separate from later orientation steps', () => {
    const roadmap = createLocalRoadmap({
      taskText: '部屋全体を片付けたい',
      category: inferTaskCategory('部屋全体を片付けたい'),
      firstAction: 'ゴミ袋を1枚だけ取り出す',
      createdAt: '2026-08-14T00:00:00.000Z',
    });

    expect(roadmap.steps).toHaveLength(4);
    expect(roadmap.steps[0]).toMatchObject({
      kind: 'now',
      description: 'ゴミ袋を1枚だけ取り出す',
    });
    expect(roadmap.steps.slice(1).every((step) => step.kind !== 'now')).toBe(true);
    expect(
      roadmap.steps.some((step) => `${step.title}${step.description}`.includes('保留')),
    ).toBe(true);
  });

  it('uses an optional user-defined end state without requiring one', () => {
    const custom = createLocalRoadmap({
      taskText: '確定申告をする',
      category: 'paperwork',
      firstAction: '申告ページを開く',
      desiredOutcome: '必要書類の不足が分かる状態',
    });
    const fallback = createLocalRoadmap({
      taskText: '確定申告をする',
      category: 'paperwork',
      firstAction: '申告ページを開く',
    });

    expect(custom.goalState).toBe('必要書類の不足が分かる状態');
    expect(fallback.goalState.length).toBeGreaterThan(0);
  });

  it('adapts the first future step to the person\'s current uncertainty', () => {
    const roadmap = createLocalRoadmap({
      taskText: '確定申告をする',
      category: 'paperwork',
      firstAction: '申告ページを開く',
      consultation: {
        concerns: ['information'],
        knownContext: '締切は月末、必要書類は不明',
      },
    });

    expect(roadmap.consultation).toEqual({
      concerns: ['information'],
      concern: 'information',
      knownContext: '締切は月末、必要書類は不明',
    });
    expect(roadmap.steps[1]).toMatchObject({ title: '分かっていることを1か所に集める' });
    expect(roadmap.steps[1]?.description).toContain('締切は月末');
  });

  it('keeps multiple concerns in priority order and reflects each in the roadmap', () => {
    const roadmap = createLocalRoadmap({
      taskText: '部屋全体を片付けたい',
      category: 'tidying',
      firstAction: 'ゴミ袋を1枚取り出す',
      consultation: {
        concerns: ['scope', 'decisions', 'endPoint'],
        knownContext: null,
      },
    });

    expect(roadmap.consultation?.concerns).toEqual(['scope', 'decisions', 'endPoint']);
    expect(roadmap.steps.slice(1).map(({ title }) => title)).toEqual([
      '今日の範囲を小さく囲う',
      '今決めないことを保留にする',
      '今日の一区切りを1つ決める',
    ]);
    expect(roadmap.framing).toContain('優先順');
  });

  it('uses the entered boundary, scope, and parking rule directly in later steps', () => {
    const roadmap = createLocalRoadmap({
      taskText: '部屋全体を片付けたい',
      category: 'tidying',
      firstAction: '目の前の物を1つだけ手に取る',
      desiredOutcome: '大きな物と床の捨てられる物だけ処分できている',
      consultation: {
        concerns: ['endPoint', 'scope', 'decisions'],
        knownContext: '書類や細かい物は多い',
        details: {
          scope: '床の大きな物と、明らかに捨てられる物だけ',
          decisions: '迷う物は保留箱へ入れる',
        },
      },
    });

    expect(roadmap.steps[0]?.title).toBe('いま：最初の30秒');
    expect(roadmap.steps[1]?.description).toContain('大きな物と床の捨てられる物だけ処分');
    expect(roadmap.steps[2]?.description).toContain('床の大きな物と、明らかに捨てられる物だけ');
    expect(roadmap.steps[3]?.description).toContain('迷う物は保留箱へ入れる');
    expect(roadmap.consultation?.details).toEqual({
      scope: '床の大きな物と、明らかに捨てられる物だけ',
      decisions: '迷う物は保留箱へ入れる',
    });
  });

  it.each(['email', 'bathing', 'studying', 'transition', 'other'] as const)(
    'builds an offline roadmap for %s',
    (category) => {
      const roadmap = createLocalRoadmap({
        taskText: '大きな課題',
        category,
        firstAction: '使う物を1つ手に取る',
      });

      expect(roadmap.steps[0]?.kind).toBe('now');
      expect(roadmap.steps).toHaveLength(4);
      expect(roadmap.framing).toBeTruthy();
    },
  );
});
