import { describe, expect, it, vi } from "vitest";

import { createDeleteAccountHandler } from "../../supabase/functions/delete-account/index";

function request(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/functions/v1/delete-account", {
    method,
    headers: {
      Authorization: "Bearer user-token",
      "Content-Type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

function dependencies() {
  return {
    authenticate: vi.fn(async () => ({ id: "user-1", authorization: "Bearer user-token" })),
    deleteSyncedData: vi.fn(
      async (_user: { id: string; authorization: string }) => undefined,
    ),
    deleteAuthUser: vi.fn(async (_userId: string) => undefined),
  };
}

describe("delete-account Edge Function", () => {
  it("requires the exact confirmation and makes no deletion on mismatch", async () => {
    const deps = dependencies();
    const response = await createDeleteAccountHandler(deps)(
      request({ confirmation: "DELETE" }),
    );
    expect(response.status).toBe(400);
    expect(deps.authenticate).toHaveBeenCalledTimes(1);
    expect(deps.deleteSyncedData).not.toHaveBeenCalled();
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("deletes user data before deleting only the authenticated Auth user", async () => {
    const order: string[] = [];
    const deps = dependencies();
    deps.deleteSyncedData.mockImplementation(async (user) => {
      expect(user.id).toBe("user-1");
      order.push("data");
    });
    deps.deleteAuthUser.mockImplementation(async (userId) => {
      expect(userId).toBe("user-1");
      order.push("auth");
    });

    const response = await createDeleteAccountHandler(deps)(
      request({ confirmation: "DELETE_MY_ACCOUNT" }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true });
    expect(order).toEqual(["data", "auth"]);
  });

  it("does not delete the Auth user when synced-data deletion fails", async () => {
    const deps = dependencies();
    deps.deleteSyncedData.mockRejectedValue(new Error("database unavailable"));
    const response = await createDeleteAccountHandler(deps)(
      request({ confirmation: "DELETE_MY_ACCOUNT" }),
    );
    expect(response.status).toBe(500);
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("reports a safe failure if Auth deletion fails after data deletion", async () => {
    const deps = dependencies();
    deps.deleteAuthUser.mockRejectedValue(new Error("auth unavailable"));
    const response = await createDeleteAccountHandler(deps)(
      request({ confirmation: "DELETE_MY_ACCOUNT" }),
    );
    expect(response.status).toBe(500);
    expect(deps.deleteSyncedData).toHaveBeenCalledTimes(1);
    expect(deps.deleteAuthUser).toHaveBeenCalledWith("user-1");
    const body = await response.json();
    expect(body.error.message).not.toContain("auth unavailable");
  });

  it("answers preflight without authenticating", async () => {
    const deps = dependencies();
    const response = await createDeleteAccountHandler(deps)(request(null, "OPTIONS"));
    expect(response.status).toBe(204);
    expect(deps.authenticate).not.toHaveBeenCalled();
  });
});
