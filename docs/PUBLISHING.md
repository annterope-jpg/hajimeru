# GitHub公開手順

この文書は、ソースコードをGitHubの公開リポジトリとして共有する手順です。一般利用者がURLを開くだけでアプリを使えるWeb公開や、App Store / Google Playへの配布は別の作業です。

## 1. 公開前の確認

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm export:web
git status --short
```

次がGitの対象外になっていることを確認します。

- `.env`、`.env.local`
- `node_modules/`
- `.expo/`
- `dist/`
- APIキー、service roleキー、署名鍵

秘密情報を一度でもコミットした場合は、先にそのキーを失効・再発行してください。履歴から文字列を消すだけでは不十分です。

## 2. GitHubで空のリポジトリを作る

1. GitHubへサインインします。
2. **New repository** を選びます。
3. Repository nameを`hajimeru`などにします。
4. Descriptionへ「成人の着手困難に対する日常のセルフマネジメント支援アプリ（試作）」などと記載します。
5. **Public** を選びます。
6. README、`.gitignore`、Licenseは追加せず、空のリポジトリとして作成します。これらはローカルに用意済みです。

## 3. 最初のコミットと送信

GitHubアカウントに設定した名前と、GitHubのnoreplyメールアドレスを使用できます。

```bash
git config user.name "YOUR_NAME"
git config user.email "YOUR_ID@users.noreply.github.com"
git add .
git commit -m "Initial public prototype"
git remote add origin https://github.com/YOUR_ACCOUNT/hajimeru.git
git push -u origin main
```

GitHub Desktopを使う場合は、このフォルダーを既存リポジトリとして追加し、同じ内容をコミットして **Publish repository** を選びます。公開設定がPrivateになっていないか確認してください。

## 4. GitHub側の推奨設定

- **Settings → Code security and analysis → Private vulnerability reporting** を有効化
- `main`ブランチでPull RequestとCI成功を要求
- Dependabot alertsとsecurity updatesを有効化
- Actionsで`CI`が成功することを確認
- Topicsへ`react-native`、`expo`、`typescript`、`accessibility`、`adhd`、`self-management`などを設定
- About欄に「診断・治療を行わない試作」であることを記載

## 5. 公開後の運用

- Issueへ個人情報・健康情報を書かない注意を維持します。
- 公的相談窓口、依存パッケージ、Expo SDK、安全ゲートを定期的に更新します。
- 臨床的な表現は、当事者・臨床・法務のレビューなしに効果を断定しません。
- APIを有効化する場合は、運営者負担の費用上限とローカルフォールバックを設けます。

## 6. 一般利用者へ届ける次の段階

GitHub公開だけでは、非開発者はそのままスマホアプリとして利用できません。次のいずれかが必要です。

1. Web版を独自ドメインへホスティングする
2. Expoの内部配布ビルドで限定テストする
3. 法務・プライバシー・アクセシビリティ確認後にApp Store / Google Playへ申請する

最初はGitHub公開とWebデモを分け、Webデモには「試作・診断治療ではない・入力は端末保存」の説明を明示することを推奨します。
