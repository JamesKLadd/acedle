// OAuth redirect target: /auth/callback?code=…&next=/path
//
// Exchanges the code for a session, then sets up the account. If the browser
// was playing as a guest, a new account takes over the guest's rolls.

import { NextResponse, type NextRequest } from "next/server";

import { finishSignIn, safeNextPath } from "@/lib/auth/sign-in";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function fail(request: NextRequest, message: string) {
  const url = new URL("/auth/error", request.url);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  if (!code) return fail(request, params.get("error_description") ?? "Sign-in was cancelled.");

  const supabase = await createClient();
  // Read the guest session before the exchange replaces it.
  const { data: before } = await supabase.auth.getClaims();
  const guestId = before?.claims.is_anonymous ? before.claims.sub : null;

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(request, error.message);

  const destination = new URL(safeNextPath(params.get("next")), request.url);
  try {
    const notice = await finishSignIn(createAdminClient(), data.user, guestId);
    if (notice) destination.searchParams.set("notice", notice);
  } catch (e) {
    // The account is signed in either way; a missing profile is created on the
    // next sign-in.
    console.error(e);
  }
  return NextResponse.redirect(destination);
}
