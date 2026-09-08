import type {
  SupportedUseEndPoint,
  SupportedUseFocus,
  SupportedUseSession,
} from "./types";

export const SUPPORTED_USE_FOCUS_COPY: Readonly<
  Record<SupportedUseFocus, { label: string; description: string }>
> = {
  start: { label: "新しい一歩を作る", description: "課題入力から短い開始実験まで" },
  roadmap: { label: "大きな課題を整理する", description: "迷いを確認して仮の地図まで" },
  retry: { label: "困った後を考える", description: "記録を選び、次に変える点を相談" },
  reflection: { label: "記録を振り返る", description: "本人が見せたい手がかりだけ確認" },
};

export const SUPPORTED_USE_END_POINT_COPY: Readonly<
  Record<SupportedUseEndPoint, { label: string; description: string }>
> = {
  overview: { label: "内容を一緒に確認するまで", description: "答えや結論を決めずに終了できます" },
  choice: { label: "次の一歩を選ぶまで", description: "実際に始めずに終了できます" },
  experiment: { label: "短い実験の後まで", description: "途中終了も含めて本人が決めます" },
};

export function createSupportedUseSession(
  focus: SupportedUseFocus,
  endPoint: SupportedUseEndPoint,
  startedAt: string,
): SupportedUseSession {
  return {
    focus,
    endPoint,
    startedAt,
    personInitiated: true,
    sameDeviceOnly: true,
  };
}

export function getSupportedUseStartRoute(focus: SupportedUseFocus) {
  return focus === "retry" || focus === "reflection" ? "/(tabs)/insights" : "/(tabs)";
}
