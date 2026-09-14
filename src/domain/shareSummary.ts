import { BOTTLENECK_LABELS } from "./assessment";
import type {
  SupportedUseFocus,
  SupportedUseSection,
  SupportedUseSummary,
  TaskAttempt,
} from "./types";

export const SHARE_SUMMARY_SECTION_COPY: Readonly<
  Record<SupportedUseSection, { label: string; description: string }>
> = {
  task_label: { label: "課題の短い呼び名", description: "氏名や詳しい内容を省いた呼び名に編集できます" },
  working_hypotheses: { label: "今回の作業仮説", description: "確定した原因ではなく、開始時に選んだ見立てです" },
  chosen_experiment: { label: "試した条件", description: "最初の1動作と時間だけを含めます" },
  return_cue: { label: "戻る目印", description: "開始プランにあった目印を編集・除外できます" },
  helpful_point: { label: "合った点", description: "本人が今、言葉にした内容だけです" },
  difficult_point: { label: "負担だった点", description: "回答しないこともできます" },
  next_change: { label: "次に1つ変える点", description: "次回の共同実験の候補です" },
};

export type ShareSummaryEdits = Record<SupportedUseSection, string>;

export function createShareSummaryCandidates(attempt: TaskAttempt): ShareSummaryEdits {
  return {
    task_label: "",
    working_hypotheses: attempt.assessment.primaryBottlenecks
      .map((item) => BOTTLENECK_LABELS[item])
      .join("、"),
    chosen_experiment: `最初の1動作：${attempt.plan.firstAction}\n時間：${attempt.plan.durationMinutes}分`,
    return_cue: attempt.plan.returnCue ?? "",
    helpful_point: "",
    difficult_point: "",
    next_change: "",
  };
}

function clean(value: string): string {
  return value.trim().slice(0, 500);
}

export function createSupportedUseSummary(input: {
  focus: SupportedUseFocus;
  mode: SupportedUseSummary["mode"];
  selectedSections: readonly SupportedUseSection[];
  edits: ShareSummaryEdits;
  generatedAt: string;
  expiresAt: string | null;
}): SupportedUseSummary {
  const selected = new Set(input.selectedSections);
  const selectedSections = (Object.keys(SHARE_SUMMARY_SECTION_COPY) as SupportedUseSection[])
    .filter((section) => selected.has(section) && clean(input.edits[section]).length > 0);
  return {
    mode: input.mode,
    focus: input.focus,
    selectedSections,
    items: selectedSections.map((section) => ({
      section,
      label: SHARE_SUMMARY_SECTION_COPY[section].label,
      value: clean(input.edits[section]),
    })),
    generatedAt: input.generatedAt,
    expiresAt: input.expiresAt,
    userInitiatedShareOnly: true,
    containsHiddenAssessment: false,
  };
}

export function formatSupportedUseSummary(summary: SupportedUseSummary): string {
  const lines = ["面談に持っていくメモ", "本人が選び、プレビューした項目だけです。"];
  for (const item of summary.items) lines.push("", `【${item.label}】`, item.value);
  if (summary.expiresAt) {
    lines.push("", `確認の目安：${summary.expiresAt.slice(0, 10)}まで`);
  }
  lines.push("", "このメモは診断・評価・治療効果の判定ではありません。");
  return lines.join("\n");
}
