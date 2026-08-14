# Supabaseバックエンド開発ガイド

## 構成

- `supabase/migrations/20260813000100_initial_remote_sync.sql`: 任意同期用テーブル、RLS、last-write-wins、30日トゥームストーン
- `supabase/functions/suggest-entry/index.ts`: 認証済みAI提案、事前安全検査、レート制限
- `supabase/functions/delete-account/index.ts`: 同期データとSupabase Authアカウントの認証済み削除
- `tests/edge/suggest-entry_test.ts` と `tests/edge/*.test.ts`: 秘密鍵・ネットワーク不要のEdge Functionテスト

## AI API契約

`POST /functions/v1/suggest-entry` はSupabaseのBearerトークンを必要とします。`supabase/config.toml`でもJWT検証を有効にし、関数内でAuth APIに照会して利用者IDを確認します。

```json
{
  "taskText": "机の上を片付けたい",
  "taskCategory": "tidying",
  "bottlenecks": ["taskClarity", "aversion"],
  "language": "ja",
  "maxSeconds": 30
}
```

`taskCategory` は `tidying`、`email`、`paperwork`、`bathing`、`studying`、`transition`、`other` のいずれかです。`bottlenecks` は0〜2個で、アプリの `AssessmentAxis`（`taskClarity`、`aversion`、`lowActivation`、`rewardDistance`、`timeAmbiguity`、`cueWeakness`、`competingReward`）をそのまま送ります。該当軸がない場合は、タスクの具体化だけに限定します。成功本文は余分なフィールドを持たない次の形です。`riskFlag` は文字列ではなく真偽値です。

```json
{
  "suggestions": [
    { "action": "机の上の物を1つ手に取る", "rationaleTag": "make_concrete" },
    { "action": "ゴミ袋を1枚だけ出す", "rationaleTag": "accept_discomfort" },
    { "action": "片付ける場所を指さす", "rationaleTag": "make_concrete" }
  ],
  "riskFlag": false
}
```

成功時は `X-Suggestion-Source: openai` も付けます。ただし、アプリの判定はこのヘッダーに依存せず、HTTPステータスと本文スキーマを使用します。主な失敗契約は次のとおりです。

| HTTP | `error.code` | 扱い |
|---:|---|---|
| 400 | `invalid_body`、`invalid_json`、`invalid_task_text` 等 | 入力を修正する |
| 401 | `missing_auth`、`invalid_auth` | ログインを確認する |
| 413 | `body_too_large` | 入力を短くする |
| 422 | `blocked_crisis`、`blocked_medication`、`blocked_diagnosis`、`blocked_pii` | 通常提案を出さず、返された安全案内を表示する |
| 422 | `blocked_model_risk` | AI案を破棄し、端末内テンプレートを表示する |
| 429 | `rate_limited` | `Retry-After` 後に再試行するか端末内テンプレートを表示する |
| 503 | `ai_unavailable` | タイムアウト、拒否、JSON不正、出力検証失敗を区別せず、端末内テンプレートを表示する |

上流障害をHTTP 200のフォールバックとして返さないため、クライアントはAI案とローカル案を確実に区別できます。危機・服薬・診断・個人情報らしい入力はOpenAIへ送りません。1つのEdge isolate内で利用者ごとに5回/分へ制限します。これは試作用のbest-effort制限であり、複数isolateにまたがる正式運用では分散ストアまたはデータベースRPCへ置き換えてください。

## 環境変数

Supabaseが提供する `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` に加え、関数のsecretとして `OPENAI_API_KEY` を設定します。`SUPABASE_SERVICE_ROLE_KEY` は `delete-account` のAuth管理操作だけに使います。OpenAIキーとservice roleキーをブラウザ・アプリの環境変数、リクエスト本文、バンドルへ入れないでください。Webオリジンを制限する場合は `ALLOWED_ORIGINS` をカンマ区切りで設定します。

```text
OPENAI_API_KEY=...
ALLOWED_ORIGINS=https://prototype.example.jp
```

OpenAIキーが未設定、上流障害、8秒タイムアウト、拒否、JSON不正の場合、関数はネットワークを再試行せず `503 ai_unavailable` を返します。アプリが端末内提案へ自動的に戻ります。タスク本文と上流エラー本文はログへ出しません。

## ローカル検証

Denoが利用できる環境では、秘密鍵もネットワーク権限も付けずにテストできます。

```bash
deno test tests/edge/suggest-entry_test.ts
```

Supabase CLIとDockerがある場合は、マイグレーションを空のローカルDBへ適用してから関数を起動します。実際のOpenAI呼び出しを試すときだけsecretを渡してください。

```bash
supabase start
supabase db reset
supabase functions serve suggest-entry --env-file supabase/.env.local
```

`supabase/.env.local` はコミットしません。

## 同期セマンティクス

- `attempts`、`daily_states`、`preferences`、`tombstones` はすべて `user_id` を持ち、RLSで `auth.uid()` と一致する行だけを許可します。
- 同じIDへのupsertは、受信した `updated_at` が保存済み時刻より新しい場合だけ反映します。同時刻は削除を優先し、残る同点は直列化した行のバイト順で決めます。端末時計の大幅なずれをUIで警告し、正式運用ではサーバー時刻とのオフセットを同期してください。
- 推奨削除は `deleted_at` を設定するソフトデリートです。物理DELETEでもトリガーが同じトゥームストーンを作成します。
- 同じIDへ削除マーカーより新しいライブ書き込みが明示的に届いた場合は、その書き込みを復元として扱い、古いマーカーを削除します。同時刻は削除を優先します。
- トゥームストーンの `expires_at` は `deleted_at + 30 days` に固定します。期限後の掃除はservice roleだけが次を実行します。

```sql
select public.purge_expired_tombstones();
```

Supabase Cron等の信頼された日次ジョブから実行し、アプリのクライアントキーからは呼び出さないでください。

利用者が設定画面で明示的に「同期データを削除」した場合だけ、ログイン中の本人が次のRPCを呼びます。引数で利用者IDを受け取らずJWTから所有者を決定し、通常削除で生成されるトゥームストーンを含めて即時削除します。

```sql
select public.delete_my_synced_data();
```

## アカウント削除API

`POST /functions/v1/delete-account` はログイン中のBearerトークンと、次の完全一致する確認本文を必要とします。

```json
{ "confirmation": "DELETE_MY_ACCOUNT" }
```

クライアントからは次の契約で呼び出します。Supabaseクライアントが現在のセッショントークンを付与します。

```ts
const { data, error } = await supabase.functions.invoke("delete-account", {
  body: { confirmation: "DELETE_MY_ACCOUNT" },
});

if (!error && data?.deleted === true) {
  // 端末内SQLiteとキャッシュ済みセッションも、この端末上で削除する。
}
```

関数は利用者をAuth APIで再確認し、次の順で処理します。

1. 呼び出した本人のJWTで `delete_my_synced_data()` を実行し、4表の本人データとトゥームストーンを即時削除する。
2. Edge Function内だけにあるservice roleキーで、その認証済み利用者IDをSupabase Authからhard deleteする。

利用者IDを本文から受け取らないため、別利用者を指定できません。同期データ削除に失敗した場合はAuthユーザーを削除しません。同期データ削除後にAuth削除が失敗した場合は `503` を返し、安全に再試行できます。成功は `200 { "deleted": true }`、確認不一致は `400 confirmation_required`、未認証は `401` です。関数は入力、トークン、管理APIのエラー本文をログへ出しません。

サーバー側の成功だけでは端末内SQLiteや別端末のローカルコピーは消えません。呼び出し元は成功後にこの端末の記録とセッションを削除し、利用者には他のオフライン端末上のコピーを各端末で削除する必要があることを説明してください。

## 配備前チェック

- Supabaseの保存リージョン、バックアップ、保存時暗号化、契約条件を記録する
- Database Settingsで直接DB接続のSSL強制を有効にする
- マイグレーション後、匿名ロールが4表を読み書きできないことを確認する
- 2つのテストユーザーで互いの行が取得・更新・削除できないことを確認する
- OpenAIプロジェクトのデータ保持設定と利用可能モデルを確認する
- 分散レート制限、監視、アラート、鍵ローテーションを正式公開前に追加する
- `delete-account` が同期4表、トゥームストーン、Authユーザーを本人についてだけ削除することをステージングで確認する
- 削除失敗時の再試行表示と、成功後の端末内SQLite・セッション消去を実機確認する
