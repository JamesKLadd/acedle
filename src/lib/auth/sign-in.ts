// What happens after an OAuth sign-in: give a new account its profile, claim
// the guest's rolls into it, and clean up the guest user the browser just left.

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";

/**
 * - `claimed`: a new account took over the guest's rolls.
 * - `guest-rolls-dropped`: an existing account signed in, so the guest's rolls
 *   from this device were discarded (claiming them would let someone roll as
 *   several guests and keep the best).
 */
export type SignInNotice = "claimed" | "guest-rolls-dropped";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** "Novak Djokovic" → "Novak D." Leaderboards are public, so full names are shortened. */
function shortName(full: string): string {
  const [first, ...rest] = full.split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${Array.from(last)[0].toUpperCase()}.` : first;
}

/**
 * Default handle and avatar for a new profile, from the provider's metadata:
 * the username where the provider has one, otherwise a shortened real name.
 */
export function profileFromUser(user: Pick<User, "id" | "user_metadata">): { handle: string; avatarUrl: string | null } {
  const m = user.user_metadata ?? {};
  const username = str(m.user_name) ?? str(m.preferred_username);
  const fullName = str(m.full_name) ?? str(m.name);
  const handle =
    username?.replace(/#\d+$/, "") ??
    (fullName ? shortName(fullName.replace(/#\d+$/, "")) : null) ??
    `Player ${user.id.slice(0, 4)}`;
  return {
    handle: Array.from(handle).slice(0, 32).join(""),
    avatarUrl: str(m.avatar_url) ?? str(m.picture),
  };
}

/** Where to go after signing in: same-site paths only, so the callback isn't an open redirect. */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/**
 * Runs after the OAuth code exchange. `guestId` is the anonymous user the
 * browser was signed in as before (null if none). Needs the service-role client.
 */
export async function finishSignIn(
  admin: SupabaseClient<Database>,
  user: User,
  guestId: string | null,
): Promise<SignInNotice | null> {
  if (user.is_anonymous) return null;
  const guest = guestId && guestId !== user.id ? guestId : null;

  let guestRolls = 0;
  if (guest) {
    const { count, error } = await admin.from("rolls").select("id", { count: "exact", head: true }).eq("user_id", guest);
    if (error) throw new Error(`Couldn't count the guest's rolls: ${error.message}`);
    guestRolls = count ?? 0;
  }

  const { handle, avatarUrl } = profileFromUser(user);
  const { data: isNewAccount, error } = await admin.rpc("create_profile_and_claim", {
    p_user_id: user.id,
    p_handle: handle,
    p_avatar_url: avatarUrl,
    p_guest_id: guest,
  });
  if (error) throw new Error(`Couldn't set up the profile: ${error.message}`);
  if (!guest) return null;

  // The browser's session is now the account's, so nobody can use the guest
  // again. Deleting it also deletes any guest rolls that weren't claimed.
  const { error: deleteError } = await admin.auth.admin.deleteUser(guest);
  if (deleteError) console.error(`Couldn't delete guest ${guest}: ${deleteError.message}`);

  if (!guestRolls) return null;
  return isNewAccount ? "claimed" : "guest-rolls-dropped";
}
