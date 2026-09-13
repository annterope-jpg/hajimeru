import type {
  Bottleneck,
  SupportedUseSection,
  SupportedUseSummary,
  TaskAttempt,
} from "./types";

export interface SupportedUseSharePreview {
  summary: SupportedUseSummary;
  text: string;
  isShareable: boolean;
}

export const SUPPORTED_USE_SECTION_COPY: Readonly<
  Record<SupportedUseSection, { label: string; description: string }>
> = {
  task_label: {
    label: "取り組んだ課題",
    description: "自分で入力した課題名",
  },
  working_hypotheses: {
    label: "今回の作業仮説",
    description: "原因や診断ではなく、開始しにくさを整理した仮説",
  },
  chosen_experiment: {
    label: "選んだ小さな実験",
    description: "最初の一歩と試す長さ",
  },
  return_cue: {
    label: "戻るための目印",
    description: "脱線したときに戻るために選んだ手がかり",
  },
  reflection: {
    label: "ふりかえり",
    description: "開始後に本人が残した短い記録",
  },
};

const BOTTLENECK_LABELS: Readonly<Record<Bottleneck, string>> = {
  taskClarity: "最初の動作を具体化する余地がある",
  aversion: "近づくとイヤさが強くなりやすい",
  lowActivation: "今は動き出しにくい状態が重なっている",
  rewardDistance: "変化や報酬が遠く感じやすい",
  timeAmbiguity: "始めるタイミングが曖昧になりやすい",
  cueWeakness: "戻るための合図が弱くなりやすい",
  competingReward: "別の活動へ流れやすい",
};

const OUTCOME_LABELS = {
  stopped_success: "ここで一区切りにした",
  continued: "もう少し続けることを選んだ",
  stuck: "困った・止まったため、一歩を調整した",
} as const;

const VALID_SECTIONS = new Set<SupportedUseSection>([
  "task_label",
  "working_hypotheses",
  "chosen_experiment",
  "return_cue",
  "reflection",
]);

function normalizeSections(sections: readonly SupportedUseSection[]) {
  return sections.filter(
    (section, index) => VALID_SECTIONS.has(section) && sections.indexOf(section) === index,
  );
}

function formatWorkingHypotheses(attempt: TaskAttempt) {
  const hypotheses = attempt.plan.bottlenecks.map((item) => BOTTLENECK_LABELS[item]).filter(Boolean);
  if (!hypotheses.length) return "今回は共有する作業仮説がありません。";
  return hypotheses.map((item) => `・${item}`).join("\n");
}

function formatReflection(attempt: TaskAttempt) {
  if (!attempt.startedAt) return "まだ開始後のふりかえりはありません。";

  const lines: string[] = [];
  if (attempt.outcome) lines.push(`・${OUTCOME_LABELS[attempt.outcome]}`);
  if (attempt.reflection.wantsToContinue === true) lines.push("・その時点では、もう少し続けたい感覚があった");
  if (attempt.reflection.wantsToContinue === false) lines.push("・その時点では、ここで十分という感覚だった");

  return lines.length ? lines.join("\n") : "開始した記録はありますが、共有するふりかえりは残していません。";
}

export function createSupportedUseSharePreview(
  attempt: TaskAttempt,
  selectedSections: readonly SupportedUseSection[],
  generatedAt: string,
): SupportedUseSharePreview {
  const sections = normalizeSections(selectedSections);
  const blocks: string[] = [];

  for (const section of sections) {
    if (section === "task_label") {
      blocks.push(`【取り組んだ課題】\n${attempt.taskText}`);
    } else if (section === "working_hypotheses") {
      blocks.push(`【今回の作業仮説】\n${formatWorkingHypotheses(attempt)}`);
    } else if (section === "chosen_experiment") {
      blocks.push(
        `【選んだ小さな実験】\n最初の一歩：${attempt.plan.firstAction}\n試す長さ：${attempt.plan.durationMinutes}分`,
      );
    } else if (section === "return_cue") {
      blocks.push(`【戻るための目印】\n${attempt.plan.returnCue ?? "戻る目印はまだありません。"}`);
    } else if (section === "reflection") {
      blocks.push(`【ふりかえり】\n${formatReflection(attempt)}`);
    }
  }

  return {
    summary: {
      mode: "solo",
      selectedSections: [...sections],
      generatedAt,
      userInitiatedShareOnly: true,
      containsHiddenAssessment: false,
    },
    text: blocks.join("\n\n"),
    isShareable: blocks.length > 0,
  };
}
