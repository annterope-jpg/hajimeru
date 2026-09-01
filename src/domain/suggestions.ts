import type {
  ActionSuggestion,
  ActivationSource,
  AnxietyReliefPreference,
  Assessment,
  Bottleneck,
  EmotionalResponse,
  InterventionPlan,
  Score0To10,
  SuggestionRationaleTag,
  TaskCategory,
  TimerMinutes,
} from "./types";

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

const PUBLIC_SUGGESTION_COUNT = 3;

const FIXED_ACTION_CANDIDATES: Readonly<
  Record<Exclude<TaskCategory, "other">, readonly ActionSuggestion[]>
> = {
  tidying: [
    { action: "目の前の物を1つだけ手に取る", rationaleTag: "make_concrete" },
    { action: "ゴミ袋を1枚だけ取り出す", rationaleTag: "reduce_friction" },
    {
      action: "片付けたい場所を指で1か所示す",
      rationaleTag: "make_concrete",
    },
    {
      action: "身体を起こして、片付けたい場所の方を向く",
      rationaleTag: "activate_body",
    },
    {
      action: "今していることを10秒だけ止め、片付けたい場所の方を向く",
      rationaleTag: "interrupt_competition",
    },
  ],
  email: [
    { action: "返信するメールを1通だけ開く", rationaleTag: "make_concrete" },
    { action: "宛先欄だけ確認する", rationaleTag: "reduce_friction" },
    {
      action: "本文の最初に「ご連絡ありがとうございます」と入力する",
      rationaleTag: "make_concrete",
    },
    {
      action: "身体を起こして、返信する端末に手を置く",
      rationaleTag: "activate_body",
    },
    {
      action: "今していることを10秒だけ止め、返信するメールを1通だけ開く",
      rationaleTag: "interrupt_competition",
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
    {
      action: "身体を起こして、書類か端末に手を置く",
      rationaleTag: "activate_body",
    },
    {
      action: "今していることを10秒だけ止め、書類か手続きの画面に手を伸ばす",
      rationaleTag: "interrupt_competition",
    },
  ],
  bathing: [
    { action: "タオルを1枚だけ用意する", rationaleTag: "reduce_friction" },
    { action: "立って脱衣所の方を向く", rationaleTag: "activate_body" },
    { action: "お湯を出すボタンまで移動する", rationaleTag: "make_concrete" },
    {
      action: "今していることを10秒だけ止め、脱衣所の方を向く",
      rationaleTag: "interrupt_competition",
    },
  ],
  studying: [
    { action: "教材を1つだけ机に置く", rationaleTag: "reduce_friction" },
    { action: "始めるページを1ページだけ開く", rationaleTag: "make_concrete" },
    { action: "問題文の最初の1行だけ読む", rationaleTag: "make_concrete" },
    {
      action: "身体を起こして、教材に手を置く",
      rationaleTag: "activate_body",
    },
    {
      action: "今していることを10秒だけ止め、教材を1つだけ開く",
      rationaleTag: "interrupt_competition",
    },
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

/**
 * Builds the complete internal pool. Some candidates exist only so the plan can
 * respond to a bottleneck without changing the public three-suggestion contract.
 */
function getLocalActionCandidates(
  taskText: string,
  category: TaskCategory = inferTaskCategory(taskText),
): ActionSuggestion[] {
  if (category !== "other") {
    return FIXED_ACTION_CANDIDATES[category].map((suggestion) => ({ ...suggestion }));
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
    {
      action: `今していることを10秒だけ止め、「${label}」の最初の画面か道具に触れる`,
      rationaleTag: "interrupt_competition",
    },
  ];
}

/** Always returns three offline Japanese actions that can start within 30 seconds. */
export function getLocalActionSuggestions(
  taskText: string,
  category: TaskCategory = inferTaskCategory(taskText),
): ActionSuggestion[] {
  return getLocalActionCandidates(taskText, category).slice(0, PUBLIC_SUGGESTION_COUNT);
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
  createdAt?: string;
}

function includes(
  bottlenecks: readonly Bottleneck[],
  bottleneck: Bottleneck,
): boolean {
  return bottlenecks.includes(bottleneck);
}

/**
 * Maps a bottleneck to the rationale that the first action itself can address.
 * Cue, timing and reward distance are deliberately absent: they are handled by
 * startCue, returnCue and microReward, so they fall through to the next
 * bottleneck instead of distorting the opening action.
 */
const BOTTLENECK_RATIONALE: Partial<
  Record<Bottleneck, SuggestionRationaleTag>
> = {
  taskClarity: "make_concrete",
  lowActivation: "activate_body",
  aversion: "reduce_friction",
  competingReward: "interrupt_competition",
};

/**
 * Picks the opening action that matches the highest-ranked bottleneck the action
 * can act on. Falls back to the first candidate so behaviour stays defined when
 * a category offers no suggestion with the preferred rationale.
 */
export function selectActionForBottlenecks(
  suggestions: readonly ActionSuggestion[],
  bottlenecks: readonly Bottleneck[],
): ActionSuggestion | undefined {
  for (const bottleneck of bottlenecks) {
    const rationale = BOTTLENECK_RATIONALE[bottleneck];
    if (!rationale) continue;

    const match = suggestions.find(
      (suggestion) => suggestion.rationaleTag === rationale,
    );
    if (match) return match;
  }

  return suggestions[0];
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
  createdAt = new Date().toISOString(),
}: CreateLocalInterventionPlanInput): InterventionPlan {
  const bottlenecks = [...assessment.primaryBottlenecks];
  const normalizedValueAnchor = valueAnchor?.trim() || null;
  const anxietySelected = emotionalResponses.includes("anxiety");
  const anxietyReductionSelected =
    anxietyReliefPreference === "yes" &&
    (anxietySelected || activationSource === "freeze" || activationSource === "both");
  const suggestion = selectActionForBottlenecks(
    getLocalActionCandidates(taskText, category),
    bottlenecks,
  );

  // The internal candidate builder has a total category map and always returns candidates.
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
    durationMinutes,
    startCue,
    activationRitual: includes(bottlenecks, "lowActivation")
      ? activationSource === "freeze"
        ? "肩を少し下げ、息を長く1回吐く"
        : activationSource === "both"
          ? "息を長く1回吐いてから、立って水を一口飲む"
          : "立って、水を一口飲む"
      : null,
    distractionFriction: includes(bottlenecks, "competingReward")
      ? "スマホの通知を切り、手の届かない所に置く"
      : null,
    microReward: includes(bottlenecks, "rewardDistance")
      ? normalizedValueAnchor
        ? `タイマーが鳴ったら、「${normalizedValueAnchor}」に向けて少し動けた印を1つ付ける`
        : "タイマーが鳴ったら、チェックを1つ付ける"
      : null,
    valueAnchor: normalizedValueAnchor,
    returnCue: includes(bottlenecks, "cueWeakness")
      ? "戻るための目印を外に置く（通知・付箋・開いた画面のどれか1つ）"
      : null,
    reassuranceAction: isHighOptionalScore(forgettingWorry)
      ? "忘れないよう頭で持ち続けず、「次にすること」を1行だけ外に残す"
      : null,
    emotionSupport: anxietyReductionSelected
      ? "不安を1段下げるため、いちばん不確かなことを1つ書き、確認できる最小の一歩にする"
      : null,
    supportiveMessage: includes(bottlenecks, "aversion")
      ? anxietyReductionSelected
        ? "不安を少し下げてからで大丈夫。確認できる一歩だけ始めます。"
        : "嫌なままで大丈夫。30秒だけ始めます。"
      : "終わらせなくて大丈夫。最初の一歩だけです。",
    bottlenecks,
    source: "local",
    createdAt,
  };
}
