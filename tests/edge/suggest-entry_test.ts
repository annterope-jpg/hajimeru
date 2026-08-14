import {
  assessSafety,
  createHandler,
  createOpenAIRequestBody,
  validateInput,
  validateOutput,
  type RationaleTag,
  type SuggestEntryInput,
  type SuggestEntryOutput,
// @ts-expect-error Deno resolves explicit TypeScript extensions at runtime.
} from "../../supabase/functions/suggest-entry/index.ts";

const deno = (globalThis as typeof globalThis & {
  Deno: { test(name: string, fn: () => void | Promise<void>): void };
}).Deno;

function assert(condition: unknown, message = "assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`expected ${expectedJson}, received ${actualJson}`);
  }
}

function assertThrows(fn: () => unknown): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, "expected function to throw");
}

const input: SuggestEntryInput = {
  taskText: "机の上を片付けたい",
  taskCategory: "tidying",
  bottlenecks: ["taskClarity", "aversion"],
  language: "ja",
  maxSeconds: 30,
};

const output: SuggestEntryOutput = {
  suggestions: [
    { action: "机の上の物を1つ手に取る", rationaleTag: "make_concrete" },
    { action: "ゴミ袋を1枚だけ出す", rationaleTag: "accept_discomfort" },
    { action: "片付ける場所を指さす", rationaleTag: "make_concrete" },
  ],
  riskFlag: false,
};

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/functions/v1/suggest-entry", {
    method,
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      Origin: "http://localhost:8081",
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

function makeHandler(
  generate: (value: SuggestEntryInput) => Promise<unknown> = async () => output,
  now: () => number = () => 1_000,
) {
  return createHandler({
    authenticate: async () => "user-1",
    generate,
    now,
  });
}

deno.test("validates the complete five-field request", () => {
  assertEquals(validateInput(input), input);
  assertThrows(() => validateInput({ ...input, taskText: "あ".repeat(501) }));
  assertEquals(validateInput({ ...input, bottlenecks: [] }).bottlenecks, []);
  assertThrows(() => validateInput({ ...input, bottlenecks: ["aversion", "aversion"] }));
  assertThrows(() => validateInput({ ...input, language: "en" }));
  assertThrows(() => validateInput({ ...input, maxSeconds: 31 }));
});

deno.test("classifies crisis, medication, diagnosis, and likely PII locally", () => {
  assertEquals(assessSafety("死にたい。どうしたらいい" )?.kind, "crisis");
  assertEquals(assessSafety("薬の量を増やしたい")?.kind, "medication");
  assertEquals(assessSafety("コンサータをやめたい")?.kind, "medication");
  assertEquals(assessSafety("ビバンセを減らしたい")?.kind, "medication");
  assertEquals(assessSafety("私がADHDか診断して")?.kind, "diagnosis");
  assertEquals(assessSafety("test@example.com に返信")?.kind, "pii");
  assertEquals(assessSafety("〒100-0001へ書類を送る")?.kind, "pii");
  assertEquals(assessSafety("机の上を片付けたい"), null);
});

deno.test("builds the pinned low-reasoning, non-stored Structured Outputs request", () => {
  const body = createOpenAIRequestBody(input);
  assertEquals(body.model, "gpt-5.4-mini-2026-03-17");
  assertEquals(body.store, false);
  assertEquals(body.reasoning, { effort: "low" });

  const text = body.text as {
    format: { type: string; strict: boolean; schema: Record<string, unknown> };
  };
  assertEquals(text.format.type, "json_schema");
  assertEquals(text.format.strict, true);
  const schema = text.format.schema as {
    additionalProperties: boolean;
    properties: {
      suggestions: {
        minItems: number;
        maxItems: number;
        items: { properties: { rationaleTag: { enum: string[] } } };
      };
    };
  };
  assertEquals(schema.additionalProperties, false);
  assertEquals(schema.properties.suggestions.minItems, 3);
  assertEquals(schema.properties.suggestions.maxItems, 3);
  assertEquals(schema.properties.suggestions.items.properties.rationaleTag.enum, [
    "make_concrete",
    "accept_discomfort",
  ]);
});

deno.test("accepts exactly three safe suggestions with allowed rationale tags", () => {
  assertEquals(validateOutput(output, input.bottlenecks), output);
  assertThrows(() =>
    validateOutput(
      {
        ...output,
        suggestions: output.suggestions.slice(0, 2),
      },
      input.bottlenecks,
    )
  );
  assertThrows(() =>
    validateOutput(
      {
        ...output,
        suggestions: output.suggestions.map((item, index) =>
          index === 0 ? { ...item, rationaleTag: "externalize_cue" as RationaleTag } : item
        ),
      },
      input.bottlenecks,
    )
  );
  assertThrows(() => validateOutput({ ...output, unexpected: true }, input.bottlenecks));
});

deno.test("returns a successful response with only suggestions and riskFlag", async () => {
  const response = await makeHandler()(makeRequest(input));
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("x-suggestion-source"), "openai");
  const body = await response.json();
  assertEquals(Object.keys(body).sort(), ["riskFlag", "suggestions"]);
  assertEquals(body, output);
});

deno.test("blocks crisis text without calling the generator", async () => {
  let called = false;
  const handler = makeHandler(async () => {
    called = true;
    return output;
  });
  const response = await handler(makeRequest({ ...input, taskText: "死にたい" }));
  assertEquals(response.status, 422);
  assertEquals(called, false);
  const body = await response.json();
  assertEquals(body.error.code, "blocked_crisis");
  assert(String(body.error.message).includes("119"));
  assert(String(body.error.supportUrl).includes("mhlw.go.jp"));
});

deno.test("blocks medication, diagnosis, and likely PII before OpenAI", async () => {
  const cases: [string, string][] = [
    ["薬の量を減らしたい", "blocked_medication"],
    ["ADHDかどうか判定して", "blocked_diagnosis"],
    ["090-1234-5678に電話する", "blocked_pii"],
  ];

  for (const [taskText, expectedCode] of cases) {
    const response = await makeHandler()(makeRequest({ ...input, taskText }));
    assertEquals(response.status, 422);
    const body = await response.json();
    assertEquals(body.error.code, expectedCode);
  }
});

deno.test("asks the client to fall back on timeout, refusal, invalid JSON, or malformed output", async () => {
  const timeoutHandler = makeHandler(async () => {
    throw new DOMException("timed out", "AbortError");
  });
  const timeoutResponse = await timeoutHandler(makeRequest(input));
  assertEquals(timeoutResponse.status, 503);
  const timeoutBody = await timeoutResponse.json();
  assertEquals(timeoutBody.error.code, "ai_unavailable");

  const refusalHandler = makeHandler(async () => {
    throw new Error("openai_refusal");
  });
  const refusalResponse = await refusalHandler(makeRequest(input));
  assertEquals(refusalResponse.status, 503);
  assertEquals((await refusalResponse.json()).error.code, "ai_unavailable");

  const invalidJsonHandler = makeHandler(async () => {
    throw new SyntaxError("invalid JSON");
  });
  const invalidJsonResponse = await invalidJsonHandler(makeRequest(input));
  assertEquals(invalidJsonResponse.status, 503);
  assertEquals((await invalidJsonResponse.json()).error.code, "ai_unavailable");

  const malformedHandler = makeHandler(async () => ({ suggestions: [], riskFlag: false }));
  const malformedResponse = await malformedHandler(makeRequest(input));
  assertEquals(malformedResponse.status, 503);
  assertEquals((await malformedResponse.json()).error.code, "ai_unavailable");
});

deno.test("rejects an invalid client JSON body without invoking generation", async () => {
  let called = false;
  const handler = makeHandler(async () => {
    called = true;
    return output;
  });
  const request = new Request("http://localhost/functions/v1/suggest-entry", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: "{not-json",
  });
  const response = await handler(request);
  assertEquals(response.status, 400);
  assertEquals(called, false);
  assertEquals((await response.json()).error.code, "invalid_json");
});

deno.test("discards model suggestions when the model raises riskFlag", async () => {
  const handler = makeHandler(async () => ({ ...output, riskFlag: true }));
  const response = await handler(makeRequest(input));
  assertEquals(response.status, 422);
  const body = await response.json();
  assertEquals(body.error.code, "blocked_model_risk");
});

deno.test("limits each authenticated user to five requests per minute per isolate", async () => {
  const handler = makeHandler();
  for (let index = 0; index < 5; index += 1) {
    const response = await handler(makeRequest(input));
    assertEquals(response.status, 200);
  }
  const response = await handler(makeRequest(input));
  assertEquals(response.status, 429);
  assertEquals(response.headers.get("retry-after"), "60");

  const crisisResponse = await handler(makeRequest({ ...input, taskText: "死にたい" }));
  assertEquals(crisisResponse.status, 422);
  assertEquals((await crisisResponse.json()).error.code, "blocked_crisis");
});

deno.test("answers preflight without authentication", async () => {
  const response = await makeHandler()(makeRequest(undefined, "OPTIONS"));
  assertEquals(response.status, 204);
  assertEquals(response.headers.get("access-control-allow-methods"), "POST, OPTIONS");
});
