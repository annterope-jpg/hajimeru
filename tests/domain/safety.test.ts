import { describe, expect, it } from "vitest";

import { classifySafety } from "../../src/domain";

describe("classifySafety", () => {
  it("routes crisis language to immediate help and disables AI", () => {
    const result = classifySafety("もう消えたい。自分を傷つけたい");

    expect(result.level).toBe("crisis");
    expect(result.flags).toContain("crisis");
    expect(result.allowsAi).toBe(false);
    expect(result.guidance).toContain("119");
  });

  it.each([
    "薬の量を増やしたい",
    "服薬を中止するか決めたい",
    "断薬したい",
    "コンサータをやめたい",
    "ビバンセの量を減らしたい",
  ])("blocks medication change advice: %s", (text) => {
    const result = classifySafety(text);

    expect(result.level).toBe("blocked");
    expect(result.flags).toContain("medication");
    expect(result.allowsAi).toBe(false);
    expect(result.guidance).toContain("医療者");
  });

  it("blocks requests for a diagnosis", () => {
    const result = classifySafety("私はADHDかどうか診断して");

    expect(result.level).toBe("blocked");
    expect(result.flags).toContain("diagnosis");
    expect(result.allowsAi).toBe(false);
  });

  it.each([
    "連絡先は test.user@example.jp です",
    "電話番号: 090-1234-5678",
    "住所：東京都千代田区",
    "〒100-0001 の書類を確認する",
  ])("keeps personally identifying text on-device: %s", (text) => {
    const result = classifySafety(text);

    expect(result.level).toBe("review");
    expect(result.flags).toContain("pii");
    expect(result.allowsAi).toBe(false);
  });

  it("allows ordinary task text", () => {
    expect(classifySafety("机の上を片付けたい")).toEqual({
      level: "safe",
      flags: [],
      allowsAi: true,
      guidance: null,
    });
  });

  it("does not treat an ordinary prescribed-dose reminder as dose-change advice", () => {
    const result = classifySafety("処方された薬を飲む時間を思い出す");

    expect(result.flags).not.toContain("medication");
    expect(result.level).toBe("safe");
  });

  it("returns stable multi-flags without echoing sensitive matches", () => {
    const result = classifySafety(
      "薬を中止して死にたい。連絡先は user@example.com",
    );

    expect(result.level).toBe("crisis");
    expect(result.flags).toEqual(["crisis", "medication", "pii"]);
    expect(JSON.stringify(result)).not.toContain("user@example.com");
  });

  it.each([
    "もう消えたい",
    "薬の量を増やしたい",
    "私はADHDか診断して",
    "電話番号: 090-1234-5678",
  ])("never echoes stopped or review text in its result: %s", (text) => {
    const result = classifySafety(text);

    expect(result.allowsAi).toBe(false);
    expect(JSON.stringify(result)).not.toContain(text);
  });

  it("keeps crisis as the highest-priority route when several boundaries match", () => {
    const result = classifySafety(
      "私はADHDか診断して。薬を中止して、もう消えたい。電話番号: 090-1234-5678",
    );

    expect(result.level).toBe("crisis");
    expect(result.flags).toEqual(["crisis", "medication", "diagnosis", "pii"]);
    expect(result.guidance).toContain("119");
    expect(result.guidance).not.toContain("診断");
    expect(result.guidance).not.toContain("服薬");
    expect(result.allowsAi).toBe(false);
  });
});
