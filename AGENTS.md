# 開発前に読む文書

このリポジトリを変更する前に、次の文書を必ず読むこと。

1. `docs/PRODUCT_SCOPE.md` — 製品の目的、本人・セラピスト・アプリの役割と境界
2. `docs/CLINICAL_DESIGN.md` — 臨床設計の単一の正本、根拠、禁止事項、既知の不一致
3. `docs/SAFETY_BOUNDARIES.md` — 通常フローを止める条件、安全・倫理・法務・セラピスト責任の境界
4. `docs/CONSENT_AND_DATA_PERMISSIONS.md` — 機能別同意、送信項目、保持、撤回、共有の境界
5. `docs/DOMAIN_MODEL.md` — 純粋ドメイン型、未回答、ログ、fixture、互換性の回帰規則
6. `docs/FIRST_ACTION_RULES.md` — 回答、課題側仮説、現在状態、最初の行動の対応規則
7. `docs/NON_EVALUATIVE_INSIGHTS.md` — 本人向け記録と内部評価指標を分ける非評価的表示規則
8. `docs/SHARED_DECISION_AND_EXPLANATIONS.md` — 初回説明、仮説への返答、見送り・休息・非共有を守る共同意思決定規則
9. `docs/THERAPIST_SPEC.md`、`docs/THERAPIST_GUIDE.md` — 本人端末上の伴走仕様、進行台本、安全・共有・逸脱防止
10. `docs/SUPPORTED_USE_MODE.md` — 本人が開始・終了する一時的な伴走状態と非保存境界
11. `docs/STUCK_RETRY_LOOP.md` — 「困った」後の本人選択、再着手、終了、非保存境界
12. `docs/PILOT_PROTOCOL.md` — Phase 19の共同パイロット、同意、評価項目、停止基準、完了条件

特に次を守る。

- `main`へ直接コミットしない
- 1回の改定で未完了Phaseを1つだけ扱う
- `src/domain/`はReact、DOM、ストレージへ依存させない
- ドメインロジックを変えたら対応するテストを追加・更新する
- 未回答項目を推測しない
- 診断、治療、服薬、効果、原因を断定しない
- 本人の自己決定、非評価的表示、ローカルファースト、任意同意を守る
- 臨床原則、利用者向け表示、コード、テストに不一致を作らない
- 変更前に`docs/ROADMAP.md`で現在のPhaseを確認し、完了後に進捗と検証結果を更新する
- 1つの臨床仮説を1つのデモ可能な変更単位にし、無関係な仮説を同じコミットへ混ぜない

変更をGitHubへ反映する前に、少なくとも次を通す。

```sh
pnpm typecheck
pnpm lint
pnpm test --run
```

Phase 11以降の感情反応に関する変更では、`docs/EMOTIONAL_SUPPORT.md`も必ず読み、本人の希望なしに不安低減を追加せず、緊急性を一般的な動機づけとして使わないこと。

Phase 12以降の状態・睡眠・時間帯に関する変更では、`docs/STATE_CONTEXT_SUPPORT.md`も必ず読み、状態から診断・原因・服薬効果を推定せず、旧記録の現地時刻を現在の端末設定から補完しないこと。

Phase 13以降の努力コスト・意思決定点に関する変更では、`docs/DECISION_FRICTION.md`も必ず読み、嫌悪やタスク本文から判断負担を推定せず、任意の単一選択と最大1介入を守ること。

Phase 14以降の大きな課題・ロードマップに関する変更では、`docs/COLLABORATIVE_ROADMAP.md`も必ず読み、境界メモをToDo一覧へ変えず、空欄や旧記録を推測で補完しないこと。

EFT・未来場面に関する変更では、`docs/EPISODIC_FUTURE_SCENE.md`を必ず読むこと。`EpisodicFutureScene`を再開用の`FutureCue`、価値アンカー、小報酬と混同せず、本人の自由記述をTaskAttempt、AI、同期、通知、書き出しへ追加しないこと。

社会的随伴性・body doublingに関する変更では、`docs/SOCIAL_SUPPORT_EXPERIMENT.md`を必ず読むこと。一人を同等の選択肢にし、自動送信、連絡先・相手氏名、既読・返信・遵守確認、タスク本文入り定型文を追加しない。選択を一緒に見るモードやデータ共有同意へ転用しないこと。

Phase 19の共同パイロットでは、`docs/PILOT_PROTOCOL.md`と`docs/PILOT_SESSION_SHEET.md`を必ず使う。AIだけの模擬評価、CI、単体テストを実際の当事者・セラピスト共同パイロットとして扱わない。実症例・患者情報・氏名・連絡先・具体的な課題本文を公開GitHub、Issue、PR、開発ログへ残さない。