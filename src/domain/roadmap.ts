import type {
  RoadmapConcern,
  RoadmapConsultation,
  RoadmapStep,
  TaskCategory,
  TaskRoadmap,
} from './types';

interface RoadmapTemplate {
  goalState: string;
  framing: string;
  later: readonly [
    Omit<RoadmapStep, 'id' | 'kind'>,
    Omit<RoadmapStep, 'id' | 'kind'>,
    Omit<RoadmapStep, 'id' | 'kind'>,
  ];
}

const TEMPLATES: Readonly<Record<TaskCategory, RoadmapTemplate>> = {
  tidying: {
    goalState: '対象にする場所が使える状態になっている',
    framing: '場所を1つに絞り、判断が要る物は保留にして進みます。',
    later: [
      { title: '範囲を1か所に絞る', description: '机の右半分など、今日触る境界を決める。' },
      { title: '迷わない物から動かす', description: '明らかなゴミ、食器、洗濯物の順に1種類ずつ扱う。' },
      { title: '迷う物は保留箱へ', description: '置き場所を今決めず、再開する場所を1つ残す。' },
    ],
  },
  email: {
    goalState: '相手が次に必要な情報を受け取れる状態になっている',
    framing: '文章を完成させる前に、相手の要件と返す要点だけを分けます。',
    later: [
      { title: '相手の要件を1つ拾う', description: '質問・期限・依頼のどれに返すかを1行で書く。' },
      { title: '返す要点を3つ以内にする', description: '挨拶より先に、伝える事実を短い箇条書きにする。' },
      { title: '短い文にして確認する', description: '必要な添付と宛先だけを確認し、送信または下書き保存する。' },
    ],
  },
  paperwork: {
    goalState: '提出・支払い・申請に必要な次の状態が明確になっている',
    framing: '分かる欄と不足物を分け、全部そろうまで待たない進め方です。',
    later: [
      { title: '期限と提出先を確認する', description: '締切、提出方法、必要物の見出しだけを見る。' },
      { title: '手元にある物を集める', description: '身分証、番号、書類など、今ある物だけを置く。' },
      { title: '分かる所から埋める', description: '不足物は別メモにし、次の問い合わせか提出へつなぐ。' },
    ],
  },
  bathing: {
    goalState: '入浴後の身支度まで安全に終えられる',
    framing: '入浴を一つの大きな動作にせず、準備・移動・開始に分けます。',
    later: [
      { title: '出た後の物を先に置く', description: 'タオルと着替えを手の届く場所に用意する。' },
      { title: '浴室まで移動する', description: '服を脱ぐ前に、脱衣所へ行って照明をつける。' },
      { title: 'お湯を出して始める', description: '短いシャワーでもよい終了条件を決める。' },
    ],
  },
  studying: {
    goalState: '次に再開できる印を残して、学習単位を1つ扱えている',
    framing: '「勉強する」から、教材・範囲・終了点の3つを切り出します。',
    later: [
      { title: '教材と範囲を1つにする', description: '1ページ、1問、1見出しのどれかを今日の単位にする。' },
      { title: '分かる・分からないを印にする', description: '理解し切る前に、止まった場所へ印をつける。' },
      { title: '次の再開点を残す', description: '次に開くページと最初の問いを1行だけ残す。' },
    ],
  },
  transition: {
    goalState: '今の活動を安全に中断し、次の活動の入口へ移れている',
    framing: '意志で急停止せず、保存・終了の合図・身体の移動を順に置きます。',
    later: [
      { title: '今の続き場所を保存する', description: 'タブ、ページ、ゲームの状態など再開点を残す。' },
      { title: '終了の合図を実行する', description: '画面を閉じる、端末を伏せるなど1つだけ行う。' },
      { title: '次の場所と道具へ移る', description: '身体を動かし、次に使う物を視界へ入れる。' },
    ],
  },
  other: {
    goalState: '「どこまでなら一区切りか」が見える状態になっている',
    framing: '正しい計画ではなく、判断を減らすための仮の順序を置きます。',
    later: [
      { title: '一区切りの状態を1文にする', description: '「何がどうなれば今日は終わりか」を粗く決める。' },
      { title: '必要物と不明点を分ける', description: '今ある物を1か所へ置き、分からないことは別にメモする。' },
      { title: '一番小さい単位を1つ行う', description: '終えたら、次に再開する場所を1行だけ残す。' },
    ],
  },
};

export interface CreateLocalRoadmapInput {
  taskText: string;
  category: TaskCategory;
  firstAction: string;
  desiredOutcome?: string;
  consultation?: RoadmapConsultation;
  createdAt?: string;
}

export const ROADMAP_CONCERN_COPY: Readonly<
  Record<RoadmapConcern, { label: string; reflection: string; step: Omit<RoadmapStep, 'id' | 'kind'> }>
> = {
  entry: {
    label: 'どこから始めるか決められない',
    reflection: '入口を1つだけ決め、次の判断を後ろへ送る形にしました。',
    step: { title: '入口を1つに決める', description: '最初の一歩の次に触る場所・画面・道具を1つだけ選ぶ。' },
  },
  scope: {
    label: '範囲が広すぎて圧倒される',
    reflection: '今日扱う範囲を小さく囲い、残りをいったん地図の外に置きました。',
    step: { title: '今日の範囲を小さく囲う', description: '場所・時間・対象のどれか1つで、今日触る境界を決める。' },
  },
  information: {
    label: '必要な物や情報が分からない',
    reflection: '「今ある物」と「あとで調べること」を分ける順番にしました。',
    step: { title: '分かっていることを1か所に集める', description: '今ある物や情報だけを置き、不足は「調べる」に分ける。' },
  },
  decisions: {
    label: '決めることが多すぎる',
    reflection: '今決めないことを保留できる順番にし、判断を減らしました。',
    step: { title: '今決めないことを保留にする', description: '迷う物・迷う選択を1つだけ「あとで決める」に移す。' },
  },
  endPoint: {
    label: 'どこまででよいか分からない',
    reflection: '今日の一区切りを先に置き、終わりのない計画にしないようにしました。',
    step: { title: '今日の一区切りを1つ決める', description: '完了ではなく「ここまでなら十分」を短い言葉で決める。' },
  },
};

export function getRoadmapConcerns(consultation?: RoadmapConsultation): RoadmapConcern[] {
  const selected = consultation?.concerns?.length
    ? consultation.concerns
    : consultation?.concern
      ? [consultation.concern]
      : [];
  return [...new Set(selected)].slice(0, 3);
}

function shortDetail(value: string | null | undefined, maxLength = 100): string | null {
  const normalized = value?.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (!normalized) return null;
  const characters = Array.from(normalized);
  return characters.length <= maxLength
    ? normalized
    : `${characters.slice(0, maxLength).join('')}…`;
}

function createConcernStep(
  concern: RoadmapConcern,
  detail: string | null,
  desiredOutcome: string | null,
  knownContext: string | null,
  isFirstConcern: boolean,
): Omit<RoadmapStep, 'id' | 'kind'> {
  const fallback = ROADMAP_CONCERN_COPY[concern].step;
  const clue = isFirstConcern && knownContext ? ` 手がかり：「${knownContext}」` : '';

  if (concern === 'entry' && detail) {
    return { title: '触る場所・物をここに決める', description: `「${detail}」から触る。${clue}`.trim() };
  }
  if (concern === 'scope' && detail) {
    return { title: '今回の範囲をここに絞る', description: `「${detail}」だけを今回の範囲にし、残りは地図の外に置く。${clue}`.trim() };
  }
  if (concern === 'information' && detail) {
    return { title: '最初に確認することを1つにする', description: `まず「${detail}」だけを確認し、ほかの不明点は後ろへ送る。${clue}`.trim() };
  }
  if (concern === 'decisions' && detail) {
    return { title: '迷ったときの扱いを先に決める', description: `迷ったら「${detail}」として扱い、その場で決め切らない。${clue}`.trim() };
  }
  if (concern === 'endPoint' && (desiredOutcome || detail)) {
    const boundary = desiredOutcome || detail;
    return { title: '今日の区切りをこの状態にする', description: `「${boundary}」までを一区切りにし、それ以上は今日の成功条件にしない。${clue}`.trim() };
  }
  return { ...fallback, description: `${fallback.description}${clue}` };
}

export function createLocalRoadmap({
  taskText,
  category,
  firstAction,
  desiredOutcome,
  consultation,
  createdAt = new Date().toISOString(),
}: CreateLocalRoadmapInput): TaskRoadmap {
  const template = TEMPLATES[category];
  const normalizedOutcome = shortDetail(desiredOutcome, 140);
  const goalState = normalizedOutcome || template.goalState;
  const concerns = getRoadmapConcerns(consultation);
  const concernCopies = concerns.map((concern) => ROADMAP_CONCERN_COPY[concern]);
  const knownContext = shortDetail(consultation?.knownContext, 100);
  const details = Object.fromEntries(
    concerns.flatMap((concern) => {
      const detail = shortDetail(consultation?.details?.[concern], 100);
      return detail ? [[concern, detail] as const] : [];
    }),
  ) as Partial<Record<RoadmapConcern, string>>;
  const concernSteps = concerns.map((concern, index) =>
    createConcernStep(
      concern,
      details[concern] ?? null,
      normalizedOutcome,
      knownContext,
      index === 0,
    ),
  );
  const later = concernCopies.length
    ? [...concernSteps, ...template.later].slice(0, 3)
    : template.later;
  const framing = concernCopies.length
    ? `${template.framing} 「今」の後は、選んだ迷いを優先順に扱い、今日のまとまりを作ります。`
    : template.framing;
  return {
    taskText,
    category,
    goalState,
    framing,
    steps: [
      {
        id: 'now',
        kind: 'now',
        title: concerns.includes('entry') ? 'いま：入口を作る' : 'いま：最初の30秒',
        description: firstAction,
      },
      ...later.map((step, index) => ({
        ...step,
        id: `phase-${index + 1}`,
        kind: index === 0 ? ('next' as const) : ('later' as const),
      })),
    ],
    consultation: consultation
      ? {
          concerns,
          concern: concerns[0],
          knownContext: knownContext || null,
          ...(Object.keys(details).length ? { details } : {}),
        }
      : undefined,
    createdAt,
  };
}
