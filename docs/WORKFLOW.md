# WORKFLOW.md — AI間の受け渡し

## 基本フロー
1. ChatGPTで分析・設計・実装計画を整理する。
2. 決定事項と次の一手を `docs/HANDOFF.md` に反映する。
3. Codexは `AGENTS.md` と `docs/` を読んでから実装する。
4. 必要に応じてChromeサイドバーで実画面・Web上の状態を確認する。
5. 実装結果・確認結果を `HANDOFF.md` に戻す。
6. プロジェクト横断で再利用する価値がある知識だけ、Hermes経由でObsidianへ整理する。

## 正本の分担
- GitHub: このプロジェクトの仕様・現在地・実装判断
- Obsidian: 複数プロジェクトをまたぐ長期知識、仕事、副業、AI活用の学び
- Hermes内蔵Memory: 少量の恒常的な環境・好み・索引
- 会話履歴: 作業中の一時的な文脈

## コピー用プロンプト
### ChatGPT → Codex / ブラウザ側
「この作業の結果を `docs/HANDOFF.md` 形式でまとめてください。決定事項、未解決、次の作業、変更禁止点、関連ファイルを含めてください。」

### 作業開始時
「まず `AGENTS.md`、`docs/PROJECT_CONTEXT.md`、`docs/HANDOFF.md`、`docs/DECISIONS.md` を読んでください。その内容を前提に、今回の作業だけを進めてください。」

## 注意
公開リポジトリには実症例、患者情報、未公開の業務情報、APIキー等を記録しない。
