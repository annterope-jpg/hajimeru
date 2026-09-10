import type {
  AnxietyReliefPreference,
  LocalTimeContext,
  StateExperience,
  StateOverlay,
  StateSupport,
} from './types';

export function captureLocalTimeContext(
  date: Date,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null,
): LocalTimeContext {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    observedAt: date.toISOString(),
    localDate: `${year}-${month}-${day}`,
    localHour: date.getHours(),
    localMinute: date.getMinutes(),
    timeZone,
    timeZoneOffsetMinutes: -date.getTimezoneOffset(),
  };
}

const CONSULTATION_GUIDANCE =
  '強い眠気、頭の霧、疲れ、身体の重さが続く、生活に影響する、急に強くなったときは、病名を決めず医療機関へ相談できます。服薬の変更は処方した医師・薬剤師に相談してください。';

const SUPPORTS: Readonly<Record<StateExperience, StateSupport>> = {
  sleepiness: { heading: '眠気が強い今は、開始を急がなくて大丈夫です', message: '短く休む、眠気が軽い時間へ移す、30秒だけ試すから選べます。', action: null, choices: ['rest', 'change_time', 'continue', 'seek_support'], consultationGuidance: CONSULTATION_GUIDANCE },
  fatigue: { heading: '疲れが強い今は、使う力を増やしません', message: '休む、時間を変える、最初の一歩だけ試すから選べます。', action: null, choices: ['rest', 'change_time', 'make_smaller', 'seek_support'], consultationGuidance: CONSULTATION_GUIDANCE },
  brain_fog: { heading: '頭の霧がある今は、判断を増やしません', message: '詳しい計画を閉じ、最初の1動作だけ見るか、休息・時間変更を選べます。', action: '今は最初の1動作だけを見て、ほかの判断はあとにする', choices: ['make_smaller', 'rest', 'change_time', 'seek_support'], consultationGuidance: CONSULTATION_GUIDANCE },
  body_heaviness: { heading: '身体の重さを、気持ちの弱さとして扱いません', message: 'そのまま小さく試す、休む、時間を変えるから選べます。', action: null, choices: ['continue', 'rest', 'change_time', 'seek_support'], consultationGuidance: CONSULTATION_GUIDANCE },
  freeze: { heading: '固まる感じには、覚醒を上げる方法を自動で足しません', message: '希望したときだけ緊張を下げる短い準備を置き、休息や時間変更も選べます。', action: null, choices: ['continue', 'change_time', 'rest', 'seek_support'], consultationGuidance: CONSULTATION_GUIDANCE },
  mixed: { heading: 'いくつか重なる今は、原因を1つに決めません', message: '複雑な計画を増やさず、小さく試す、休む、時間を変えるから選べます。', action: null, choices: ['make_smaller', 'rest', 'change_time', 'seek_support'], consultationGuidance: CONSULTATION_GUIDANCE },
  unclear: { heading: 'まだ種類を決めなくて大丈夫です', message: '状態を推測せず、小さく試す、休む、時間を変えるから選べます。', action: null, choices: ['make_smaller', 'rest', 'change_time', 'seek_support'], consultationGuidance: CONSULTATION_GUIDANCE },
  none: { heading: '状態の調整は今は置きません', message: '通常の開始プランを使えます。', action: null, choices: [], consultationGuidance: CONSULTATION_GUIDANCE },
};

export function createStateOverlay(input: {
  experience?: StateExperience;
  localTimeContext?: LocalTimeContext;
  reliefPreference?: AnxietyReliefPreference;
  legacyOverlay?: StateOverlay;
}): StateOverlay {
  if (!input.experience) {
    return input.legacyOverlay ?? { status: 'not_assessed', selected: null, allowedChoices: [] };
  }

  const baseSupport = SUPPORTS[input.experience];
  const support = input.experience === 'freeze' && input.reliefPreference === 'yes'
    ? { ...baseSupport, action: '肩を少し下げ、息を長く1回吐き、目の前の1点を見る' }
    : baseSupport;
  const selected = input.experience === 'none'
    ? 'none'
    : input.experience === 'freeze'
      ? 'freeze_or_tension'
      : input.experience === 'mixed'
        ? 'both'
        : 'low_activation';

  return {
    status: 'answered',
    selected,
    allowedChoices: support.choices,
    experience: input.experience,
    ...(input.localTimeContext ? { localTimeContext: input.localTimeContext } : {}),
    support,
  };
}
