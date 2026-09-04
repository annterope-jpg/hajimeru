# はじめの地図

**始めにくさをほどく、小さな行動実験。**

成人の着手困難に対する、日常のセルフマネジメント支援アプリの操作可能な試作版です。本人が一人で使う場合と、本人の同意のもとでセラピスト等の支援者と一緒に使う場合を想定しています。診断・治療・服薬判断を行う医療サービスではありません。

「はじめの地図」は、目標の価値を疑ったり、やる気を採点したりするアプリではありません。開始コストが高くなっている条件を短く整理し、今できる30秒以内の行動、大きな課題の仮の見通し、時間変更や休息を本人が選ぶための道具です。

> [!IMPORTANT]
> 現在は本人・関係者によるUX確認用の試作版です。医療機器、診断ツール、治療アプリとして公開・宣伝しないでください。正式な一般提供前に、当事者参加の評価、アクセシビリティ確認、セキュリティ監査、法務・医療目的性の確認が必要です。

## 名前と位置づけ

「はじめの地図」という名前は、今すぐ行動することを迫るのではなく、止まっている条件、現在地、次に試せる方向を仮置きするという本アプリの役割を表します。地図どおりに進むことや、すぐ始めることは成功条件ではありません。対象は成人のADHD当事者に限らず、診断の有無を問わず、日常の着手困難を感じる18歳以上の人です。ADHDの診断や治療を提供するものではありません。

公開済みリンクとの互換性を保つため、リポジトリ名、アプリ内部のslug、URL schemeなどの技術識別子は当面`hajimeru`のまま維持します。

## なぜ作るのか

「したい」という目標価値があっても、課題の曖昧さ、判断、不安や嫌悪、低覚醒、開始直後の変化の見えにくさ、弱い開始キュー、競合行動による開始コストが上回ると、行動へ移れないことがあります。本アプリは意欲を評価するのではなく、その場で強いボトルネックを最大2つに絞り、30秒以内の最初の動作へ変換します。

大きく曖昧な課題には、細かなToDoリストではなく「今・次・あとで」の仮のロードマップを提示します。全部を終えることや順序を守ることは、成功条件にしません。

## 実装済みの主な機能

- 3問の短い評価と、任意の4軸を合わせた7軸ルールエンジン
- 着手困難の多軸モデルと、4段階の介入プロトコルを説明する「しくみ」画面
- 回答済み項目だけを採点し、同点優先順位を固定した最大2ボトルネック選択
- 大きく曖昧な課題を「今・次・あとで」へ粗く分ける、課題別のオフライン・ロードマップ
- ロードマップ作成前に「どこから・範囲・情報・判断・終わり」の迷いを最大3つ、優先順つきで確認し、相談内容を後続ステップへ反映
- 短い確認で、不安・退屈などの感情反応と、疲労・低覚醒／不安で固まる反応を任意に分け、支援方針を調整
- 詳細調整で、実際の脱線・失念と「忘れそう」という心配を分け、戻る目印と安心して頭から下ろす一行メモを提案
- 30秒以内の最初の行動、開始キュー、起動行動、妨害対策、小報酬
- 1・3・5分タイマーと、開始時点での成功記録
- 再起動後の実行中タイマー復元、途中終了を否定しない任意の振り返り
- SQLiteローカル保存、同日1件の状態記録、開始率・介入・状態傾向の非評価的表示
- 端末内ローカル通知と、通知から保存済み開始プランを開くディープリンク
- 本人操作によるJSON/CSVエクスポート
- 任意のメールリンク認証、Supabase同期、30日tombstone、アカウント削除
- 任意AI提案。安全ゲート、500文字制限、8秒タイムアウト、厳格な出力検証、端末内フォールバック
- Dynamic Type、アプリ内大文字、スクリーンリーダー用ラベル、Reduce Motion

広告SDK、外部分析SDK、ストリーク、順位、連続未達警告は含めていません。

## 設計文書

- [製品の目的・役割・境界](docs/PRODUCT_SCOPE.md)
- [臨床設計の正本・根拠台帳](docs/CLINICAL_DESIGN.md)
- [倫理・安全・法務の境界仕様](docs/SAFETY_BOUNDARIES.md)
- [本人同意とデータ権限仕様](docs/CONSENT_AND_DATA_PERMISSIONS.md)
- [Phase 0〜20の改定ロードマップと進捗](docs/ROADMAP.md)
- [安全設計](docs/SAFETY.md)
- [プライバシー](docs/PRIVACY.md)

## 開発開始

Node.js 20以降とpnpmを用意します。

```bash
pnpm install
pnpm start
```

Expo Goまたは内部開発ビルドでQRコードを読み取ります。ネイティブのSQLiteと通知を含む確認には、開発ビルドを推奨します。

```bash
pnpm android
pnpm ios
pnpm web
```

コア機能は環境変数、通信、ログイン、AI、通知なしで利用できます。

### AI利用料について

AI提案は任意で、同期用アカウントへのサインインと個別同意がある場合だけ利用できます。通常の開始プランとロードマップは端末内で生成されます。

公開運営者がSupabase Edge Functionへ`OPENAI_API_KEY`を設定した場合、OpenAI APIの従量料金はそのAPIプロジェクトの所有者に発生します。正式運用では、利用者単位の日次上限、全体の月額上限、費用監視、上限到達時のローカル提案へのフォールバックを追加してください。

## 検証

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm export:web
```

Maestroの主要フローは `.maestro/happy-flow.yaml` です。アプリを実機またはエミュレーターへ入れ、Maestro CLIがある環境で実行します。

```bash
maestro test .maestro/happy-flow.yaml
```

## 内部ビルド

`eas.json` に `development` と `preview` の内部配布プロファイルがあります。最初に `app.json` の `ios.bundleIdentifier` と `android.package` を実際の組織IDへ変更し、Expoプロジェクトへ紐付けます。

```bash
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile preview --platform ios
```

このワークスペースではEASへのログイン・署名資格情報がないため、クラウドビルド自体は実行していません。

## 任意のSupabase・AI設定

`.env.example` を `.env` としてコピーし、端末へ含めてもよい公開値だけを設定します。

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Supabaseへ `supabase/migrations/20260813000100_initial_remote_sync.sql` を適用し、`suggest-entry` と `delete-account` を配備します。Edge Function側だけに次のsecretを設定します。

```text
OPENAI_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGINS=https://your-preview.example
```

OpenAIキーとservice roleキーは、`.env`、`app.json`、アプリバンドルへ絶対に含めないでください。詳細は [docs/BACKEND.md](docs/BACKEND.md)、[docs/SAFETY.md](docs/SAFETY.md)、[docs/PRIVACY.md](docs/PRIVACY.md) を参照してください。

## 試作評価前に必要なこと

- iOS・Android実機で主要フロー、通知拒否、再起動中タイマー、タイムゾーン変更を確認
- 2利用者でRLS分離、同期競合、削除、アカウント削除をステージング確認
- VoiceOver / TalkBack、大きな文字、Reduce Motion、コントラストを当事者と確認
- 危機・服薬・診断・個人情報入力を安全担当者がレッドチーム確認
- 医療目的性、表示・広告、個人情報、国外移転を専門家が確認
- 公的相談窓口の番号とリンクを評価開始日の直前に再確認

本試作は課金・正式ストア公開を前提としていません。

## コントリビューションとセキュリティ

改善提案とPull Requestを歓迎します。実在する本人・患者・相談者の個人情報や健康情報を、Issue、Pull Request、テストデータへ記載しないでください。詳しくは[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

脆弱性やデータ露出、安全ゲートの回避は公開Issueへ書かず、[SECURITY.md](SECURITY.md)に従って非公開で報告してください。

GitHubへ公開する具体的な手順は[docs/PUBLISHING.md](docs/PUBLISHING.md)にまとめています。

## ライセンス

ソースコードは[MIT License](LICENSE)で公開します。ライセンスは、医療上の有効性、安全性、特定目的への適合性を保証するものではありません。
