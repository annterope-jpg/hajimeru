import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readDoc = (name) => readFileSync(join(process.cwd(), 'docs', name), 'utf8');

describe('Phase 19 pilot protocol', () => {
  const protocol = readDoc('PILOT_PROTOCOL.md');
  const sheet = readDoc('PILOT_SESSION_SHEET.md');

  it('keeps the pilot formative rather than claiming clinical effectiveness', () => {
    expect(protocol).toContain('有効性試験');
    expect(protocol).toContain('開始率');
    expect(protocol).toContain('診断');
    expect(protocol).toContain('服薬評価');
    expect(protocol).toContain('AIだけの模擬評価');
  });

  it('requires person control, separate sharing consent, and stop criteria', () => {
    expect(protocol).toContain('本人が端末');
    expect(protocol).toContain('中止、休息');
    expect(protocol).toContain('共有メモを作ること、OS共有を使うこと、診療録へ転記することを別々');
    expect(protocol).toContain('停止基準');
    expect(sheet).toContain('本人回答の強制・上書き・採点');
  });

  it('does not allow an automated run to mark a human pilot complete', () => {
    expect(protocol).toContain('実際の当事者とセラピスト');
    expect(protocol).toContain('自動改修では実施済みと記録しない');
    expect(protocol).toContain('実施準備完了・人間参加の実施待ち');
  });

  it('keeps identifiable clinical material out of public development records', () => {
    expect(protocol).toContain('実症例・患者情報');
    expect(protocol).toContain('公開GitHub');
    expect(sheet).toContain('実症例・患者情報・氏名・連絡先');
  });
});
