/**
 * Supabase Edge Function: delete-account
 *
 * Performs an explicit, authenticated privacy deletion. The service-role key
 * remains in the Edge runtime and is never returned to or accepted from the
 * caller. This function intentionally contains no logging.
 */

const CONFIRMATION = "DELETE_MY_ACCOUNT";
const AUTH_TIMEOUT_MS = 4_000;
const BACKEND_TIMEOUT_MS = 8_000;
const DEFAULT_ALLOWED_ORIGINS = new Set([
  'hajimeru://',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
]);

interface RuntimeDeno {
  env?: { get(name: string): string | undefined };
  serve?: (handler: (request: Request) => Response | Promise<Response>) => void;
}

interface AuthenticatedUser {
  id: string;
  authorization: string;
}

interface DeleteAccountDependencies {
  authenticate(request: Request): Promise<AuthenticatedUser>;
  deleteSyncedData(user: AuthenticatedUser): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
}

class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly publicMessage: string,
  ) {
    super(code);
  }
}

const runtimeDeno = (globalThis as typeof globalThis & { Deno?: RuntimeDeno }).Deno;

function readEnv(name: string): string | undefined {
  return runtimeDeno?.env?.get(name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function corsHeaders(request: Request): Headers {
  const origin = request.headers.get('origin');
  const configured = (readEnv('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
  const allowOrigin = origin && allowed.has(origin) ? origin : 'hajimeru://';
  return new Headers({
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
}

function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extra?: Record<string, string>,
): Response {
  const headers = corsHeaders(request);
  for (const [name, value] of Object.entries(extra ?? {})) headers.set(name, value);
  return new Response(JSON.stringify(body), { status, headers });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function requiredRuntimeConfig(): {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
} {
  const supabaseUrl = readEnv("SUPABASE_URL")?.replace(/\/$/u, "");
  const anonKey = readEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new RequestError(
      503,
      "service_unavailable",
      "アカウント削除サービスを利用できません。",
    );
  }
  return { supabaseUrl, anonKey, serviceRoleKey };
}

async function authenticateWithSupabase(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new RequestError(401, "missing_auth", "ログインが必要です。");
  }

  const { supabaseUrl, anonKey } = requiredRuntimeConfig();
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${supabaseUrl}/auth/v1/user`,
      {
        method: "GET",
        headers: { Authorization: authorization, apikey: anonKey },
      },
      AUTH_TIMEOUT_MS,
    );
  } catch {
    throw new RequestError(503, "auth_unavailable", "ログイン情報を確認できません。");
  }
  if (!response.ok) {
    throw new RequestError(401, "invalid_auth", "ログイン情報を確認してください。");
  }
  const body: unknown = await response.json();
  if (!isRecord(body) || typeof body.id !== "string" || body.id.length < 1) {
    throw new RequestError(401, "invalid_auth", "ログイン情報を確認してください。");
  }
  return { id: body.id, authorization };
}

async function deleteSyncedDataWithUserJwt(user: AuthenticatedUser): Promise<void> {
  const { supabaseUrl, anonKey } = requiredRuntimeConfig();
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/rpc/delete_my_synced_data`,
      {
        method: "POST",
        headers: {
          Authorization: user.authorization,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
      BACKEND_TIMEOUT_MS,
    );
  } catch {
    throw new RequestError(
      503,
      "data_delete_unavailable",
      "同期データを削除できませんでした。時間をおいて再度お試しください。",
    );
  }
  if (!response.ok) {
    // Do not read or log the response body; it can contain backend details.
    throw new RequestError(
      503,
      "data_delete_failed",
      "同期データを削除できませんでした。時間をおいて再度お試しください。",
    );
  }
}

async function deleteAuthUserWithServiceRole(userId: string): Promise<void> {
  const { supabaseUrl, serviceRoleKey } = requiredRuntimeConfig();
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
      },
      BACKEND_TIMEOUT_MS,
    );
  } catch {
    throw new RequestError(
      503,
      "account_delete_unavailable",
      "同期データは削除されましたが、アカウント削除を完了できませんでした。もう一度お試しください。",
    );
  }
  if (!response.ok) {
    // Do not read or log the admin response body.
    throw new RequestError(
      503,
      "account_delete_failed",
      "同期データは削除されましたが、アカウント削除を完了できませんでした。もう一度お試しください。",
    );
  }
}

async function parseConfirmation(request: Request): Promise<void> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 256) {
    throw new RequestError(413, "body_too_large", "確認入力が大きすぎます。");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new RequestError(400, "invalid_json", "確認入力を読み取れません。");
  }
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    value.confirmation !== CONFIRMATION
  ) {
    throw new RequestError(
      400,
      "confirmation_required",
      "アカウント削除の確認が必要です。",
    );
  }
}

export function createDeleteAccountHandler(dependencies: DeleteAccountDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== "POST") {
      return jsonResponse(
        request,
        { error: { code: "method_not_allowed", message: "POSTを使用してください。" } },
        405,
        { Allow: "POST, OPTIONS" },
      );
    }

    try {
      const user = await dependencies.authenticate(request);
      await parseConfirmation(request);
      // Privacy-biased ordering: data first, Auth user second. If the second
      // operation fails, a retry is safe and no synced content remains.
      await dependencies.deleteSyncedData(user);
      await dependencies.deleteAuthUser(user.id);
      return jsonResponse(request, { deleted: true });
    } catch (error) {
      if (error instanceof RequestError) {
        return jsonResponse(
          request,
          { error: { code: error.code, message: error.publicMessage } },
          error.status,
        );
      }
      return jsonResponse(
        request,
        { error: { code: "internal_error", message: "アカウント削除を完了できませんでした。" } },
        500,
      );
    }
  };
}

export const handleDeleteAccountRequest = createDeleteAccountHandler({
  authenticate: authenticateWithSupabase,
  deleteSyncedData: deleteSyncedDataWithUserJwt,
  deleteAuthUser: deleteAuthUserWithServiceRole,
});

if ((import.meta as ImportMeta & { main?: boolean }).main) {
  runtimeDeno?.serve?.(handleDeleteAccountRequest);
}
