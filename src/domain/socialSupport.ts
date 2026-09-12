import {
  SOCIAL_SUPPORT_COMFORTS,
  SOCIAL_SUPPORT_MODES,
  type SocialSupportComfort,
  type SocialSupportMode,
  type SocialSupportSelection,
} from './types';

export const SOCIAL_SUPPORT_MODE_COPY: Readonly<
  Record<SocialSupportMode, { label: string; description: string; template: string | null }>
> = {
  solo: {
    label: '一人で進める',
    description: '連絡や同席を使わず、自分のペースで始める',
    template: null,
  },
  quiet_presence: {
    label: '静かに同席してもらう',
    description: '見守りや確認ではなく、同じ時間にそれぞれのことをする',
    template: '少しの間、それぞれのことをしませんか。見守りや確認、返信は不要です。',
  },
  announce_start: {
    label: '始める前にひとこと伝える',
    description: '開始の合図として、短い定型文だけを使う',
    template: '今から少しだけ取りかかります。返信や確認は不要です。',
  },
  report_start: {
    label: '始めた後にひとこと伝える',
    description: '完了ではなく、始めたことだけを短く伝える',
    template: '少し取りかかりました。出来ばえの確認や返信は不要です。',
  },
};

export const SOCIAL_SUPPORT_COMFORT_COPY: Readonly<
  Record<SocialSupportComfort, { label: string; description: string }>
> = {
  comfortable: { label: '少し安心できそう', description: '人の存在が開始の支えになりそう' },
  pressure: { label: '圧力になりそう', description: '見られる・報告する感じが負担になりそう' },
  unsure: { label: 'まだ分からない', description: '合うかどうかを今は決めにくい' },
};

export function createSocialSupportSelection(
  mode: unknown,
  comfort: unknown,
): SocialSupportSelection | null {
  if (!SOCIAL_SUPPORT_MODES.includes(mode as SocialSupportMode)) return null;
  const selectedMode = mode as SocialSupportMode;
  if (selectedMode === 'solo') return { mode: selectedMode, comfort: null };
  if (!SOCIAL_SUPPORT_COMFORTS.includes(comfort as SocialSupportComfort)) return null;
  return { mode: selectedMode, comfort: comfort as SocialSupportComfort };
}

/** Fixed text only: there are no free-text parameters to interpolate. */
export function getSocialSupportTemplate(mode: SocialSupportMode): string | null {
  return SOCIAL_SUPPORT_MODE_COPY[mode].template;
}
