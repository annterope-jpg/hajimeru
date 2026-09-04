export const DATA_CAPABILITIES = [
  "localCore",
  "notifications",
  "aiSuggestions",
  "sync",
  "therapistShare",
] as const;

export type DataCapability = (typeof DATA_CAPABILITIES)[number];

export interface DataPermissionDefinition {
  capability: DataCapability;
  title: string;
  required: boolean;
  status: "available" | "not_implemented";
  data: string[];
  destination: string;
  retention: string;
  withdrawal: string;
}

/** User-visible product contract; platform permission and legal consent remain separate. */
export const DATA_PERMISSION_DEFINITIONS: readonly DataPermissionDefinition[] = [
  {
    capability: "localCore",
    title: "端末内の開始支援",
    required: true,
    status: "available",
    data: ["タスク文", "回答", "開始プラン", "開始・振り返り記録"],
    destination: "この端末内",
    retention: "本人が削除するか、アプリのデータを消去するまで",
    withdrawal: "端末内の記録を削除すると利用を初期化できます",
  },
  {
    capability: "notifications",
    title: "ローカル通知",
    required: false,
    status: "available",
    data: ["開始の合図", "おおよその時刻", "開始プランを開くためのID"],
    destination: "端末の通知機能",
    retention: "通知を解除するか、予定通知を削除するまで",
    withdrawal: "設定でOFFにすると予定通知も取り消します",
  },
  {
    capability: "aiSuggestions",
    title: "AIによる言い換え",
    required: false,
    status: "available",
    data: ["今回のタスク文", "分類", "選択済みボトルネック（最大2つ）"],
    destination: "Supabase Edge Functionを経由してOpenAI API",
    retention: "アプリのサーバーログには本文を保存しません。API側の保持条件は利用前説明で確認します",
    withdrawal: "同意をOFFにすると、その後のAI送信を停止します",
  },
  {
    capability: "sync",
    title: "端末間同期",
    required: false,
    status: "available",
    data: ["タスク試行", "デイリー記録", "表示設定", "削除マーカー"],
    destination: "本人のSupabase同期領域",
    retention: "ライブ記録は削除まで。削除マーカーは削除後30日間",
    withdrawal: "同期停止と、クラウド記録の削除は別々に選べます",
  },
  {
    capability: "therapistShare",
    title: "セラピスト等への共有",
    required: false,
    status: "not_implemented",
    data: [],
    destination: "自動送信しません",
    retention: "アプリ側に共有先を保存しません",
    withdrawal: "現段階は、本人が画面を見せるか書き出しを実行した場合だけです",
  },
] as const;

export function getDataPermissionDefinition(
  capability: DataCapability,
): DataPermissionDefinition {
  const definition = DATA_PERMISSION_DEFINITIONS.find(
    (entry) => entry.capability === capability,
  );
  if (!definition) throw new Error(`Unknown data capability: ${capability}`);
  return definition;
}
