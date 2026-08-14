import {
  SUGGESTION_RATIONALE_TAGS,
  classifySafety,
  getLocalActionSuggestions,
  type ActionSuggestion,
  type Bottleneck,
  type TaskCategory,
} from '@/domain';
import { getSupabaseClient } from '@/services/sync';

export interface SuggestEntryInput {
  taskText: string;
  taskCategory: TaskCategory;
  bottlenecks: Bottleneck[];
  language?: 'ja';
  maxSeconds?: 30;
}

export interface SuggestEntryResult {
  suggestions: ActionSuggestion[];
  riskFlag: boolean;
  source: 'ai' | 'local';
  fallbackReason?: 'consent' | 'safety' | 'configuration' | 'auth' | 'timeout' | 'network' | 'invalid';
  guidance?: string | null;
}

function fallback(
  input: SuggestEntryInput,
  fallbackReason: SuggestEntryResult['fallbackReason'],
  guidance?: string | null,
): SuggestEntryResult {
  const safety = classifySafety(input.taskText);
  return {
    suggestions: getLocalActionSuggestions(input.taskText, input.taskCategory),
    riskFlag: safety.level !== 'safe',
    source: 'local',
    fallbackReason,
    guidance,
  };
}

function isSuggestion(value: unknown): value is ActionSuggestion {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.action === 'string' &&
    entry.action.trim().length > 0 &&
    [...entry.action].length <= 80 &&
    typeof entry.rationaleTag === 'string' &&
    SUGGESTION_RATIONALE_TAGS.includes(
      entry.rationaleTag as (typeof SUGGESTION_RATIONALE_TAGS)[number],
    )
  );
}

async function publicFunctionError(error: unknown): Promise<string | null> {
  const response = (error as { context?: unknown } | null)?.context;
  if (!(response instanceof Response)) return null;
  try {
    const body = (await response.clone().json()) as {
      error?: { code?: unknown; message?: unknown };
    };
    return typeof body.error?.message === 'string' ? body.error.message : null;
  } catch {
    return null;
  }
}

export async function requestEntrySuggestions(
  input: SuggestEntryInput,
  options: { consentGranted: boolean },
): Promise<SuggestEntryResult> {
  if (!options.consentGranted) return fallback(input, 'consent');

  const safety = classifySafety(input.taskText);
  if (!safety.allowsAi) return fallback(input, 'safety', safety.guidance);

  const client = getSupabaseClient();
  if (!client) return fallback(input, 'configuration');
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) {
    return fallback(input, 'auth', 'AI提案は、任意同期のサインイン後に利用できます。');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const { data, error } = await client.functions.invoke('suggest-entry', {
      body: {
        taskText: input.taskText.slice(0, 500),
        taskCategory: input.taskCategory,
        bottlenecks: input.bottlenecks.slice(0, 2),
        language: 'ja',
        maxSeconds: 30,
      },
      signal: controller.signal,
    });
    if (error) {
      return fallback(input, 'network', await publicFunctionError(error));
    }
    const payload = data as { suggestions?: unknown[]; riskFlag?: unknown } | null;
    if (!payload || !Array.isArray(payload.suggestions) || payload.suggestions.length !== 3) {
      return fallback(input, 'invalid');
    }
    const suggestions = payload.suggestions.filter(isSuggestion);
    if (suggestions.length !== 3) return fallback(input, 'invalid');
    if (typeof payload.riskFlag !== 'boolean' || payload.riskFlag) {
      return fallback(input, 'safety', 'AI提案を安全に表示できません。端末内の提案を利用します。');
    }
    return {
      suggestions,
      riskFlag: false,
      source: 'ai',
    };
  } catch (error) {
    return fallback(input, error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timeout);
  }
}
