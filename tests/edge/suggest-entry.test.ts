import { describe, expect, it, vi } from "vitest";

import {
  assessSafety,
  createHandler,
  createOpenAIRequestBody,
  validateInput,
  type SuggestEntryInput,
  type SuggestEntryOutput,
} from "../../supabase/functions/suggest-entry/index";

const input: SuggestEntryInput = {
  taskText: "机の上を片付けたい",
  taskCategory: "tidying",
  bottlenecks: ["taskClarity", "aversion"],
  language: "ja",
  maxSeconds: 30,
};

const generated: SuggestEntryOutput = {
  suggestions: [
    { action: "机の上の物を1つ手に取る", rationaleTag: "make_concrete" },
    { action: "ゴミ袋を1枚だけ出す", rationaleTag: "accept_discomfort" },
    { action: "片付ける場所を指さす", rationaleTag: "make_concrete" },
  ],
  riskFlag: false,
};

function request(body: unknown): Request {
  return new Request("http://localhost/functions/v1/suggest-entry", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("suggest-entry Edge Function", () => {
  it("validates 500 characters and permits no selected bottlenecks", () => {
    expect(validateInput({ ...input, bottlenecks: [] }).bottlenecks).toEqual([]);
    expect(() => validateInput({ ...input, taskText: "あ".repeat(501) })).toThrow();
  });

  it("pins the requested non-stored structured response configuration", () => {
    const body = createOpenAIRequestBody(input);
    expect(body.model).toBe("gpt-5.4-mini-2026-03-17");
    expect(body.store).toBe(false);
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.text).toMatchObject({
      format: { type: "json_schema", strict: true },
    });
  });

  it.each([
    ["死にたい", "crisis"],
    ["薬の量を減らしたい", "medication"],
    ["コンサータをやめたい", "medication"],
    ["ビバンセを減らしたい", "medication"],
    ["ADHDか判定して", "diagnosis"],
    ["test@example.comへ返信", "pii"],
    ["〒100-0001へ書類を送る", "pii"],
  ])("blocks %s locally as %s", (text, kind) => {
    expect(assessSafety(text)?.kind).toBe(kind);
  });

  it("does not call generation for crisis input", async () => {
    const generate = vi.fn(async () => generated);
    const handler = createHandler({
      authenticate: async () => "user-1",
      generate,
    });
    const response = await handler(request({ ...input, taskText: "死にたい" }));
    expect(response.status).toBe(422);
    expect(generate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "blocked_crisis", supportUrl: expect.stringContaining("mhlw.go.jp") },
    });
  });

  it("returns a stable non-2xx contract so the client locally falls back", async () => {
    const handler = createHandler({
      authenticate: async () => "user-1",
      generate: async () => {
        throw new DOMException("timeout", "AbortError");
      },
    });
    const response = await handler(request(input));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ai_unavailable" },
    });
  });

  it("returns 422 without model suggestions when the model sets riskFlag", async () => {
    const handler = createHandler({
      authenticate: async () => "user-1",
      generate: async () => ({ ...generated, riskFlag: true }),
    });
    const response = await handler(request(input));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "blocked_model_risk",
        message: "AI提案を安全に表示できません。端末内の提案を利用してください。",
      },
    });
  });

  it("limits one authenticated user to five calls per minute", async () => {
    const handler = createHandler({
      authenticate: async () => "user-1",
      generate: async () => generated,
      now: () => 1_000,
    });
    for (let index = 0; index < 5; index += 1) {
      expect((await handler(request(input))).status).toBe(200);
    }
    expect((await handler(request(input))).status).toBe(429);
    const crisisResponse = await handler(request({ ...input, taskText: "死にたい" }));
    expect(crisisResponse.status).toBe(422);
  });
});
