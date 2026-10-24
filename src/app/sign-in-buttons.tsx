"use client";

import { useState } from "react";

import { PROVIDER_LABELS, type OAuthProvider } from "@/lib/auth/providers";
import { buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/** OAuth sign-in. The callback moves a guest's rolls into a new account. */
export function SignInButtons({ providers }: { providers: readonly OAuthProvider[] }) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: OAuthProvider) {
    setPending(provider);
    setError(null);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", window.location.pathname);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
    // On success the browser is already on its way to the provider.
    if (error) {
      setError(error.message);
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <button
            key={p}
            onClick={() => signIn(p)}
            disabled={pending !== null}
            className={buttonClass({ variant: "secondary" })}
          >
            {pending === p ? "Redirecting…" : `Sign in with ${PROVIDER_LABELS[p]}`}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
