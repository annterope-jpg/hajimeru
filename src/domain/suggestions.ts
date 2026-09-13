import type {
  ActionSuggestion,
  ActivationSource,
  AnxietyReliefPreference,
  Assessment,
  Bottleneck,
  EmotionalResponse,
  EffortCostChoice,
  InterventionPlan,
  LocalTimeContext,
  Score0To10,
  StateOverlay,
  StateExperience,
  TaskCategory,
  TaskBottleneck,
  TimerMinutes,
} from "./types";
import { createEffortCostOverlay, selectDecisionReduction } from "./decisionFriction";
import { selectEmotionSupport } from "./emotionSupport";
import { createStateOverlay } from "./stateSupport";
import { createAdjacentTransitionSupport } from "./transitionSupport";

export const TASK_CATEGORY_LABELS: Readonly<Record<TaskCategory, string>> = {
  tidying: "片付け",
  email: "メール返信",
  paperwork: "事務手続き",
  bathing: "入浴",
  studying: "勉強",
  transition: "活動の切り替え",
  other: "その他",
};

const CATEGORY_PATTERNS: readonly {
  category: Exclude<TaskCategory, "other">;
  pattern: RegExp;
}[] = [
  {
    category: "transition",
    pattern:
      /切り?替|やめて|止めて|終えて|離れ|抜け出|ゲームをやめ|動画を止め|スマホを置/iu,
  },
  {
    category: "tidying",
    pattern: /片[づ付]け|掃除|整理|整頓|ゴミ|ごみ|洗濯|しまう|収納/iu,
  },
  {
    category: "email",
    pattern: /メール|返信|返事|受信箱|e-?mail|inbox/iu,
  },
  {
    category: "paperwork",
    pattern: /書類|手続|申請|支払|振込|経費|フォーム|役所|確定申告|請求/iu,
  },
  {
    category: "bathing",
    pattern: /風呂|入浴|シャワー|湯船|浴室/iu,
  },
  {
    category: "studying",
    pattern: /勉強|学習|宿題|教材|教科書|問題集|試験|資格|レポート|読書/iu,
  },
];

function normalizeTaskText(taskText: string): string {
  return taskText.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
}

export function inferTaskCategory(taskText: string): TaskCategory {
  const normalized = normalizeTaskText(taskText);
  const match = CATEGORY_PATTERNS.find(({ pattern }) => pattern.test(normalized));
  return match?.category ?? "other";
}

const FIXED_SUGGESTIONS: Readonly<
  Record<Exclude<TaskCategory, "other">, readonly ActionSuggestion[]>
> = {
  tidying: [
    { action: "目の前の物を1つだけ手に取る", rationaleTag: "make_concrete" },
    { action: "ゴミ袋を1枚だけ取り出す", rationaleTag: "reduce_friction" },
    {
      action: "片付けたい場所を指で1か所示す",
      rationaleTag: "make_concrete",
    },
  ],
  email: [
    { action: "返信するメールを1通だけ開く", rationaleTag: "make_concrete" },
    { action: "宛先欄だけ確認する", rationaleTag: "reduce_friction" },
    {
      action: "本文の最初に「ご連絡ありがとうございます」と入力する",
      rationaleTag: "make_concrete",
    },
  ],
  paperwork: [
    {
      action: "必要そうな書類を1枚だけ机に置く",
      rationaleTag: "make_concrete",
    },
    { action: "手続きのページを1つだけ開く", rationaleTag: "reduce_friction" },
    {
      action: "ペンか身分証を1つ手元に置く",
      rationaleTag: "reduce_friction",
    },
  ],
  bathing: [
    { action: "タオルを1枚だけ用意する", rationaleTag: "reduce_friction" },
    { action: "立って脱衣所の方を向く", rationaleTag: "activate_body" },
    { action: "お湯を出すボタンまで移動する", rationaleTag: "make_concrete" },
  ],
  studying: [
    { action: "教材を1つだけ机に置く", rationaleTag: "reduce_friction" },
    { action: "始めるページを1ページだけ開く", rationaleTag: "make_concrete" },
    { action: "問題文の最初の1行だけ読む", rationaleTag: "make_concrete" },
  ],
  transition: [
    { action: "今見ている画面をいったん閉じる", rationaleTag: "interrupt_competition" },
    { action: "端末を伏せて立ち上がる", rationaleTag: "activate_body" },
    {
      action: "次の行動で使う物を1つ手に取る",
      rationaleTag: "make_concrete",
    },
  ],
};

function shortTaskLabel(taskText: string): string {
  const normalized = taskText.normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (!normalized) {
    return "今やりたいこと";
  }

  return Array.from(normalized).slice(0, 40).join("");
}

const BOTTLENECK_RATIONALE: Readonly<
  Record<TaskBottleneck, ActionSuggestion["rationaleTag"]>
> = {
  taskClarity: "make_concrete",
  aversion: "accept_discomfort",
  rewardDistance: "bring_reward_closer",
  timeAmbiguity: "externalize_cue",
  cueWeakness: "externalize_cue",
  competingReward: "interrupt_competition",
};

function genericSuggestionForBottleneck(
  taskText: string,
  bottleneck: TaskBottleneck,
): ActionSuggestion {
  const label = shortTaskLabel(taskText);
  const suggestions: Readonly<Record<TaskBottleneck, string>> = {
    taskClarity: `「${label}」に使う物を1つだけ手に取る`,
    aversion: `嫌さはそのままで、「${label}」に使う物へ手を伸ばす`,
    rewardDistance: `「${label}」で、30秒後に変化が見える対象を1つ指で示す`,
    timeAmbiguity: `「${label}」を始める合図を1つだけ決める`,
    cueWeakness: `「${label}」に戻る目印を1つ、見える所へ置く`,
    competingReward: "今している画面や道具から、いったん手を離す",
  };
  return {
    action: suggestions[bottleneck],
    rationaleTag: BOTTLENECK_RATIONALE[bottleneck],
  };
}

/** Selects the visible first action from the highest-priority answered task hypothesis. */
export function getFirstActionSuggestion(
  taskText: string,
  category: TaskCategory,
  bottlenecks: readonly TaskBottleneck[],
): ActionSuggestion {
  const primary = bottlenecks[0];
  const categorySuggestions = getLocalActionSuggestions(taskText, category);
  if (!primary) return categorySuggestions[0]!;
  const rationale = BOTTLENECK_RATIONALE[primary];
  return (
    categorySuggestions.find((suggestion) => suggestion.rationaleTag === rationale) ??
    genericSuggestionForBottleneck(taskText, primary)
  );
}

/** Always returns three offline Japanese actions that can start within 30 seconds. */
export function getLocalActionSuggestions(
  taskText: string,
  category: TaskCategory = inferTaskCategory(taskText),
): ActionSuggestion[] {
  if (category !== "other") {
    return FIXED_SUGGESTIONS[category].map((suggestion) => ({ ...suggestion }));
  }

  const label = shortTaskLabel(taskText);
  return [
    {
      action: `「${label}」に使う物を1つだけ手に取る`,
      rationaleTag: "make_concrete",
    },
    {
      action: `「${label}」をする場所へ一歩だけ近づく`,
      rationaleTag: "activate_body",
    },
    {
      action: `「${label}」の最初の画面や道具を開く`,
      rationaleTag: "reduce_friction",
    },
  ];
}

export interface CreateLocalInterventionPlanInput {
  taskText: string;
  assessment: Assessment;
  category?: TaskCategory;
  durationMinutes?: TimerMinutes;
  /** Optional wording chosen by the person, never used to score a bottleneck. */
  valueAnchor?: string;
  /** Worry about forgetting is distinct from actual cue/attention difficulty. */
  forgettingWorry?: Score0To10 | null;
  emotionalResponses?: EmotionalResponse[];
  anxietyReliefPreference?: AnxietyReliefPreference;
  activationSource?: ActivationSource;
  stateExperience?: StateExperience;
  effortCostChoice?: EffortCostChoice;
  localTimeContext?: LocalTimeContext;
  createdAt?: string;
}

function includes(
  bottlenecks: readonly Bottleneck[],
  bottleneck: Bottleneck,
): boolean {
  return bottlenecks.includes(bottleneck);
}

function isHighOptionalScore(value: Score0To10 | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 6;
}

export function createLocalInterventionPlan({
  taskText,
  assessment,
  category = inferTaskCategory(taskText),
  durationMinutes = 3,
  valueAnchor,
  forgettingWorry,
  emotionalResponses = [],
  anxietyReliefPreference,
  activationSource,
  stateExperience,
  effortCostChoice,
  localTimeContext,
  createdAt = new Date().toISOString(),
}: CreateLocalInterventionPlanInput): InterventionPlan {
  const bottlenecks = [...assessment.primaryBottlenecks];
  const normalizedValueAnchor = valueAnchor?.trim() || null;
  const selectedEmotionSupport = selectEmotionSupport({
    responses: emotionalResponses,
    preference: anxietyReliefPreference,
    activationSource,
  });
  const suggestion = getFirstActionSuggestion(taskText, category, bottlenecks);
  const transitionSupport = createAdjacentTransitionSupport({ category, bottlenecks });
  const legacyStateOverlay: StateOverlay =
    assessment.stateOverlay?.selected === "low_activation"
      ? {
          ...assessment.stateOverlay,
          selected:
            activationSource === "freeze"
              ? "freeze_or_tension"
              : activationSource === "both"
                ? "both"
                : "low_activation",
        }
      : (assessment.stateOverlay ?? {
          status: "not_assessed",
          selected: null,
          allowedChoices: [],
        });
  const stateOverlay = createStateOverlay({
    experience: stateExperience,
    localTimeContext,
    reliefPreference: anxietyReliefPreference,
    legacyOverlay: legacyStateOverlay,
  });
  const effortCost = createEffortCostOverlay(effortCostChoice);
  const decisionReduction = selectDecisionReduction(effortCostChoice);

  // getLocalActionSuggestions has a total category map and always returns three.
  if (!suggestion) {
    throw new Error("ローカル提案を作成できませんでした");
  }

  const startCue = includes(bottlenecks, "timeAmbiguity")
    ? "次に立ち上がったら"
    : includes(bottlenecks, "cueWeakness")
      ? "この通知を閉じたら"
      : "この画面を閉じたら";

  return {
    firstAction: suggestion.action,
    firstActionRationaleTag: suggestion.rationaleTag,
    durationMinutes,
    startCue,
    activationRitual: stateOverlay.support?.action ?? null,
    distractionFriction: transitionSupport.switchBridge,
    microReward: includes(bottlenecks, "rewardDistance")
      ? normalizedValueAnchor
        ? `タイマーが鳴ったら、「${normalizedValueAnchor}」に向けて少し動けた印を1つ付ける`
        : "タイマーが鳴ったら、チェックを1つ付ける"
      : null,
    valueAnchor: normalizedValueAnchor,
    returnCue: transitionSupport.returnBridge,
    reassuranceAction: isHighOptionalScore(forgettingWorry)
      ? "忘れないよう頭で持ち続けず、「次にすること」を1行だけ外に残す"
      : null,
    emotionSupport: selectedEmotionSupport?.action ?? null,
    emotionSupportLabel: selectedEmotionSupport?.label ?? null,
    emotionSupportKind: selectedEmotionSupport?.kind ?? null,
    supportiveMessage: includes(bottlenecks, "aversion")
      ? selectedEmotionSupport
        ? selectedEmotionSupport.message
        : "嫌なままで大丈夫。30秒だけ始めます。"
      : "終わらせなくて大丈夫。最初の一歩だけです。",
    bottlenecks,
    stateOverlay,
    effortCost,
    decisionReduction,
    source: "local",
    createdAt,
  };
}
