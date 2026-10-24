import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "../supabase/database.types";
import { finishSignIn, profileFromUser, safeNextPath } from "./sign-in";

const user = (id: string, user_metadata: Record<string, unknown> = {}, is_anonymous = false) =>
  ({ id, user_metadata, is_anonymous }) as User;

describe("profileFromUser", () => {
  it("prefers the provider username", () => {
    expect(profileFromUser(user("u1", { user_name: "nole", full_name: "Novak Djokovic", avatar_url: "a" }))).toEqual({
      handle: "nole",
      avatarUrl: "a",
    });
  });

  it("shortens real names to a first name and initial", () => {
    expect(profileFromUser(user("u1", { full_name: "Novak Djokovic", picture: "p" }))).toEqual({
      handle: "Novak D.",
      avatarUrl: "p",
    });
    expect(profileFromUser(user("u1", { name: "Juan Martín del Potro" })).handle).toBe("Juan P.");
    expect(profileFromUser(user("u1", { name: "Guga" })).handle).toBe("Guga");
  });

  it("drops Discord discriminators", () => {
    expect(profileFromUser(user("u1", { full_name: "rafa#0" })).handle).toBe("rafa");
  });

  it("falls back to a generic handle", () => {
    expect(profileFromUser(user("abcdef12", { full_name: "  " }))).toEqual({ handle: "Player abcd", avatarUrl: null });
  });

  it("caps handles at 32 characters", () => {
    expect(Array.from(profileFromUser(user("u1", { user_name: "x".repeat(40) })).handle)).toHaveLength(32);
  });
});

describe("safeNextPath", () => {
  it.each([
    [null, "/"],
    ["/", "/"],
    ["/dev/roll", "/dev/roll"],
    ["/profile?tab=badges", "/profile?tab=badges"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["profile", "/"],
  ])("%s → %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });
});

/** Just enough of the admin client for finishSignIn. */
function fakeAdmin({ isNewAccount, guestRolls }: { isNewAccount: boolean; guestRolls: number }) {
  const calls: { rpc: unknown[]; deleted: string[] } = { rpc: [], deleted: [] };
  const admin = {
    rpc: async (fn: string, args: unknown) => {
      calls.rpc.push({ fn, args });
      return { data: isNewAccount, error: null };
    },
    from: () => ({ select: () => ({ eq: async () => ({ count: guestRolls, error: null }) }) }),
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          calls.deleted.push(id);
          return { error: null };
        },
      },
    },
  };
  return { admin: admin as unknown as SupabaseClient<Database>, calls };
}

describe("finishSignIn", () => {
  const account = user("account", { full_name: "Roger Federer", avatar_url: "rf.png" });

  it("creates the profile and claims the guest's rolls for a new account", async () => {
    const { admin, calls } = fakeAdmin({ isNewAccount: true, guestRolls: 2 });
    expect(await finishSignIn(admin, account, "guest")).toBe("claimed");
    expect(calls.rpc).toEqual([
      {
        fn: "create_profile_and_claim",
        args: { p_user_id: "account", p_handle: "Roger F.", p_avatar_url: "rf.png", p_guest_id: "guest" },
      },
    ]);
    expect(calls.deleted).toEqual(["guest"]);
  });

  it("reports dropped guest rolls when the account already existed", async () => {
    const { admin, calls } = fakeAdmin({ isNewAccount: false, guestRolls: 1 });
    expect(await finishSignIn(admin, account, "guest")).toBe("guest-rolls-dropped");
    expect(calls.deleted).toEqual(["guest"]);
  });

  it("has nothing to report when the guest never rolled", async () => {
    const { admin } = fakeAdmin({ isNewAccount: false, guestRolls: 0 });
    expect(await finishSignIn(admin, account, "guest")).toBeNull();
  });

  it("only sets up the profile without a guest", async () => {
    const { admin, calls } = fakeAdmin({ isNewAccount: true, guestRolls: 0 });
    expect(await finishSignIn(admin, account, null)).toBeNull();
    expect(calls.rpc).toHaveLength(1);
    expect(calls.deleted).toEqual([]);
  });

  it("doesn't delete the user when the guest and account are the same user", async () => {
    const { admin, calls } = fakeAdmin({ isNewAccount: true, guestRolls: 0 });
    await finishSignIn(admin, account, "account");
    expect(calls.deleted).toEqual([]);
  });

  it("ignores anonymous users", async () => {
    const { admin, calls } = fakeAdmin({ isNewAccount: true, guestRolls: 0 });
    expect(await finishSignIn(admin, user("anon", {}, true), null)).toBeNull();
    expect(calls.rpc).toEqual([]);
  });
});
