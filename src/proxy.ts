// Keeps the Supabase session fresh. Server Components can't write cookies, so
// an expired access token is refreshed here, before rendering, and the new
// cookies go out on the response. Authorization still happens next to the data
// (Server Actions, Route Handlers, RLS); this only refreshes tokens.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Validates the session and refreshes it if needed. Nothing else should run
  // between creating the client and this call.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and the stateless dev API.
    "/((?!_next/static|_next/image|favicon.ico|api/dev|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
