import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readDoc = (name) => readFileSync(join(process.cwd(), 'docs', name), 'utf8');

describe('therapist materials v0.1', () => {
  const spec = readDoc('THERAPIST_SPEC.md');
  const guide = readDoc('THERAPIST_GUIDE.md');

  it('contains the required operational, safety, privacy, and supervision sections', () => {
    expect(guide).toContain('1ページ導入ガイド');
    expect(guide).toContain('10分共同利用台本');
    expect(guide).toContain('仮説―質問―介入対応表');
    expect(guide).toContain('「困った」後の応答カード');
    expect(guide).toContain('安全・プライバシー');
    expect(guide).toContain('スーパービジョンと逸脱防止');
  });

  it('keeps the person in control and does not describe a hidden therapist channel', () => {
    for (const document of [spec, guide]) {
      expect(document).toContain('本人が端末');
      expect(document).toContain('自動共有');
      expect(document).toContain('見送');
      expect(document).not.toMatch(/セラピスト専用ダッシュボードを実装済み/u);
    }
  });

  it('states that safety screening and app hypotheses do not replace clinical judgment', () => {
    expect(spec).toContain('臨床的リスク評価ではない');
    expect(spec).toContain('所属機関の手順');
    expect(guide).toContain('アプリの安全ゲートをリスク評価や安全確認に使わない');
    expect(guide).toContain('診断や正解として説明しない');
  });
});
