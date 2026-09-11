import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  findProhibitedUserClaims,
} from '../src/domain/regressionGuards';

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

describe('source boundary regressions', () => {
  it('keeps prohibited claims out of current app source copy', () => {
    const appRoot = join(process.cwd(), 'app');
    const combined = sourceFiles(appRoot).map((path) => readFileSync(path, 'utf8')).join('\n');
    expect(findProhibitedUserClaims(combined)).toEqual([]);
  });

  it('keeps direct console logging out of app, domain, and edge-function source', () => {
    const roots = ['app', 'src/domain', 'supabase/functions'].map((path) => join(process.cwd(), path));
    const offenders = roots
      .flatMap(sourceFiles)
      .filter((path) => /console\.(?:log|info|debug|warn|error)\s*\(/u.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('keeps analysis-only performance metrics out of the person-facing insights screen', () => {
    const insightsPath = join(process.cwd(), 'app', '(tabs)', 'insights.tsx');
    const source = readFileSync(insightsPath, 'utf8');

    expect(source).not.toMatch(/calculateInsightMetrics|plannedCount|startedCount|startRate|weekStarts/u);
    expect(source).not.toMatch(/開始率|作った開始プラン|開始した回数|直近7日/u);
    expect(source).toContain('残してある一歩');
    expect(source).toContain('記録がなくても問題ありません');
  });

  it('keeps shared-decision choices visible and does not persist hypothesis fit', () => {
    const onboarding = readFileSync(join(process.cwd(), 'app', 'onboarding.tsx'), 'utf8');
    const plan = readFileSync(join(process.cwd(), 'app', 'plan.tsx'), 'utf8');
    const choices = readFileSync(join(process.cwd(), 'src', 'domain', 'sharedDecision.ts'), 'utf8');
    const store = readFileSync(join(process.cwd(), 'src', 'state', 'useAppStore.ts'), 'utf8');

    expect(onboarding).toContain('原因や診断を決めない');
    expect(onboarding).toContain('見送る・休む・共有しない');
    expect(choices).toContain('近い');
    expect(choices).toContain('違う');
    expect(choices).toContain('まだ分からない');
    expect(plan).toContain('正解を選ぶ質問ではありません');
    expect(store).not.toMatch(/hypothesisFit/u);
  });

  it('keeps the therapist guide visible to the person and free of remote sharing claims', () => {
    const help = readFileSync(join(process.cwd(), 'app', 'help.tsx'), 'utf8');
    const guide = readFileSync(join(process.cwd(), 'app', 'therapist-guide.tsx'), 'utf8');

    expect(help).toContain('支援者と一緒に使うときのガイド');
    expect(guide).toContain('本人にも見える共通ガイド');
    expect(guide).toContain('自動送信しません');
    expect(guide).toContain('所属機関の手順を優先');
    expect(guide).not.toMatch(/fetch\s*\(|supabase|sendMessage|postMessage/u);
  });

  it('keeps supported-use session state local, temporary, and person-controlled', () => {
    const screen = readFileSync(join(process.cwd(), 'app', 'supported-use.tsx'), 'utf8');
    const banner = readFileSync(join(process.cwd(), 'src', 'components', 'SupportedUseBanner.tsx'), 'utf8');
    const store = readFileSync(join(process.cwd(), 'src', 'state', 'useAppStore.ts'), 'utf8');
    const snapshot = store.slice(store.indexOf('function persistedSnapshot'), store.indexOf('function persistShell'));

    expect(screen).toContain('本人が開始・終了します');
    expect(screen).toContain('自動共有はありません');
    expect(screen).toContain('支援者による回答の上書き');
    expect(banner).toContain('一緒に見るモードを終了');
    expect(snapshot).not.toMatch(/supportedUseSession/u);
    expect(screen).not.toMatch(/fetch\s*\(|supabase|AsyncStorage|saveAttempt/u);
  });

  it('treats getting stuck as an optional adjustment rather than a failure judgment', () => {
    const reflection = readFileSync(join(process.cwd(), 'app', 'reflection.tsx'), 'utf8');
    const screen = readFileSync(join(process.cwd(), 'app', 'stuck.tsx'), 'utf8');
    const retry = readFileSync(join(process.cwd(), 'src', 'domain', 'retry.ts'), 'utf8');
    const plan = readFileSync(join(process.cwd(), 'app', 'plan.tsx'), 'utf8');

    expect(reflection).toContain("router.push('./stuck')");
    expect(screen).toContain('できなかった理由を決める画面ではありません');
    expect(screen).toContain('理由を選ばず、ここで終える');
    expect(screen).toContain("outcome: 'stuck'");
    expect(screen).toContain('prepareRetry(adjustment.adjustedPlan)');
    expect(retry).toContain('まだ大きかった');
    expect(retry).toContain('決めることが残った');
    expect(retry).toContain('不安・緊張で固まった');
    expect(retry).toContain('眠さ・頭の霧が強かった');
    expect(retry).toContain('今は選ばない');
    expect(`${screen}\n${retry}`).not.toMatch(/なぜできなかった|次は必ず/u);
    expect(plan).toContain("retry !== '1'");
  });

  it('keeps emotional support person-selected, specific, and free of urgency pressure', () => {
    const assessment = readFileSync(join(process.cwd(), 'app', 'assessment.tsx'), 'utf8');
    const plan = readFileSync(join(process.cwd(), 'app', 'plan.tsx'), 'utf8');
    const support = readFileSync(join(process.cwd(), 'src', 'domain', 'emotionSupport.ts'), 'utf8');
    const store = readFileSync(join(process.cwd(), 'src', 'state', 'useAppStore.ts'), 'utf8');

    expect(assessment).toContain('分からなさ・見通しの不安');
    expect(assessment).toContain('失敗・評価が怖い');
    expect(assessment).toContain('恥・自責');
    expect(assessment).toContain('急かされる・反発したくなる');
    expect(assessment).toContain('面倒・退屈');
    expect(assessment).toContain('先に1つ置きたい');
    expect(support).toContain("input.preference === 'yes'");
    expect(support).toContain('圧力を動機づけに足さず');
    expect(plan).toContain('emotionSupportLabel');
    expect(store).toContain("response === 'anxiety' ? 'uncertainty'");
    expect(`${assessment}\n${support}`).not.toMatch(/急げば|締切直前なら|本当の原因/u);
  });

  it('keeps state support non-diagnostic, compact, local-time aware, and outside AI', () => {
    const assessment = readFileSync(join(process.cwd(), 'app', 'assessment.tsx'), 'utf8');
    const plan = readFileSync(join(process.cwd(), 'app', 'plan.tsx'), 'utf8');
    const support = readFileSync(join(process.cwd(), 'src', 'domain', 'stateSupport.ts'), 'utf8');
    const retry = readFileSync(join(process.cwd(), 'src', 'domain', 'retry.ts'), 'utf8');
    const ai = readFileSync(join(process.cwd(), 'src', 'services', 'ai.ts'), 'utf8');

    expect(assessment).toContain('頭の霧・ぼんやり');
    expect(assessment).toContain('身体の重さ');
    expect(assessment).toContain('原因や病名は判断しません');
    expect(plan).toContain('compactStateView');
    expect(plan).toContain('記録した現地時刻');
    expect(support).toContain('timeZoneOffsetMinutes');
    expect(support).toContain('医療機関へ相談できます');
    expect(support).toContain('服薬の変更は処方した医師・薬剤師に相談');
    expect(retry).toContain('activationRitual: null');
    expect(ai).not.toMatch(/StateExperience|stateExperience|localTimeContext|sleepiness|brain_fog/u);
    expect(`${assessment}\n${plan}\n${support}`).not.toMatch(/原因は|概日リズム障害|睡眠障害です|薬が効いて/u);
  });

  it('keeps effort cost separate, optional, singleton, and outside AI', () => {
    const assessment = readFileSync(join(process.cwd(), 'app', 'assessment.tsx'), 'utf8');
    const support = readFileSync(join(process.cwd(), 'src', 'domain', 'decisionFriction.ts'), 'utf8');
    const suggestions = readFileSync(join(process.cwd(), 'src', 'domain', 'suggestions.ts'), 'utf8');
    const ai = readFileSync(join(process.cwd(), 'src', 'services', 'ai.ts'), 'utf8');

    expect(assessment).toContain('イヤさとは別に');
    expect(support).toContain('今は決めずに進む');
    expect(support).toContain('Returns either one intervention or none');
    expect(suggestions).toContain('selectDecisionReduction(effortCostChoice)');
    expect(ai).not.toMatch(/effortCost|decisionReduction|EffortCost/u);
  });

  it('keeps roadmap boundaries optional, editable, and outside scoring or AI', () => {
    const screen = readFileSync(join(process.cwd(), 'app', 'roadmap.tsx'), 'utf8');
    const roadmap = readFileSync(join(process.cwd(), 'src', 'domain', 'roadmap.ts'), 'utf8');
    const assessment = readFileSync(join(process.cwd(), 'src', 'domain', 'assessment.ts'), 'utf8');
    const ai = readFileSync(join(process.cwd(), 'src', 'services', 'ai.ts'), 'utf8');

    expect(screen).toContain('今日の枠を、短い言葉で仮置きします');
    expect(screen).toContain('地図を少し直す');
    expect(screen).toContain('変更せず戻る');
    expect(screen).toContain('空欄はアプリが推測しません');
    expect(roadmap).toContain('hasBoundaries');
    expect(assessment).not.toMatch(/RoadmapBoundaries|restartCue/u);
    expect(ai).not.toMatch(/RoadmapBoundaries|restartCue|todayScope|holdBox/u);
  });
});
