import type {
  SafetyClassification,
  SafetyFlag,
  SafetyLevel,
} from "./types";

// Keep all screening expressions local: the raw text never needs to leave-device.
const CRISIS_PATTERN =
  /死にたい|消えたい|自殺|自傷|命を絶|首を吊|飛び降り|殺してほしい|もう生きられない|人を殺したい|誰かを殺したい|傷つけたい/iu;

const MEDICATION_CHANGE_PATTERN =
  /(?:(?:薬|服薬|処方|投薬|コンサータ|ストラテラ|インチュニブ|ビバンセ|メチルフェニデート|アトモキセチン|グアンファシン|リスデキサンフェタミン).{0,16}(?:やめ|止め|中止|減ら|増や|変え|変更|追加|開始|抜[くき]|飲まない|量|用量))|(?:断薬|減薬|増薬|休薬|服薬中止|用量変更)/iu;

const DIAGNOSIS_PATTERN =
  /診断して|診断でき|診断をして|病名を(?:教えて|知りたい)|(?:ADHD|発達障害|うつ病|鬱病).{0,8}(?:ですか|なの|かどうか|判定|診断)/iu;

const PII_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /(?:\+81[- ]?|0)\d{1,4}[- ]?\d{1,4}[- ]?\d{3,4}/u,
  /〒?\d{3}[-ー−]\d{4}/u,
  /(?:マイナンバー|個人番号).{0,8}\d{12}/u,
  /(?:住所|氏名|本名|電話番号|メールアドレス)\s*[:：]/u,
] as const;

function normalizeSafetyText(text: string): string {
  return text.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function guidanceFor(level: SafetyLevel, flags: readonly SafetyFlag[]): string | null {
  if (level === "crisis") {
    return "今すぐ危険がある場合は119へ連絡するか、近くの人や地域の公的な相談窓口に助けを求めてください。";
  }

  if (flags.includes("medication")) {
    return "服薬の開始・中止・量の変更はこのアプリでは案内できません。処方した医療者または薬剤師に相談してください。";
  }

  if (flags.includes("diagnosis")) {
    return "このアプリは診断を行いません。診断については医療機関などの専門家に相談してください。";
  }

  if (flags.includes("pii")) {
    return "個人を特定できる情報を削除してから、もう一度入力してください。";
  }

  return null;
}

/**
 * Conservative on-device gate for optional AI. It returns flags only and never
 * echoes matched text, so contact details cannot accidentally enter logs.
 */
export function classifySafety(text: string): SafetyClassification {
  const normalized = normalizeSafetyText(text);
  const flags: SafetyFlag[] = [];

  if (CRISIS_PATTERN.test(normalized)) {
    flags.push("crisis");
  }
  if (MEDICATION_CHANGE_PATTERN.test(normalized)) {
    flags.push("medication");
  }
  if (DIAGNOSIS_PATTERN.test(normalized)) {
    flags.push("diagnosis");
  }
  if (PII_PATTERNS.some((pattern) => pattern.test(normalized))) {
    flags.push("pii");
  }

  const level: SafetyLevel = flags.includes("crisis")
    ? "crisis"
    : flags.includes("medication") || flags.includes("diagnosis")
      ? "blocked"
      : flags.includes("pii")
        ? "review"
        : "safe";

  return {
    level,
    flags,
    allowsAi: level === "safe",
    guidance: guidanceFor(level, flags),
  };
}
