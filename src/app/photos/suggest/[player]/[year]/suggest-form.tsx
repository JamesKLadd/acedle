"use client";

import { useActionState } from "react";

import { buttonClass } from "@/components/ui";

import { suggestPhoto } from "../../../actions";

const field =
  "w-full rounded-md border-2 border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-fg focus:outline-none";

/** The suggestion form: a Commons link, which seasons it's for, and an optional note. */
export function SuggestForm({ playerId, year, name }: { playerId: number; year: number; name: string }) {
  const [state, action, pending] = useActionState(suggestPhoto, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="player" value={playerId} />
      <input type="hidden" name="year" value={year} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Link to the photo on Wikimedia Commons</span>
        <input
          name="file"
          required
          // Clear the field once a suggestion is saved.
          key={state?.ok ? state.message : "file"}
          placeholder="https://commons.wikimedia.org/wiki/File:…"
          className={field}
          autoComplete="off"
        />
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">Use it for</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="scope" value="season" defaultChecked className="accent-accent" />
          The {year} season
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="scope" value="all" className="accent-accent" />
          All of {name}&apos;s seasons (where it&apos;s the closest photo)
        </label>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">
          Note for the reviewer <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea name="note" maxLength={300} rows={2} className={field} placeholder="e.g. Wimbledon final, 1996" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={buttonClass()}>
          {pending ? "Checking…" : "Suggest photo"}
        </button>
        {state && (
          <p role="status" className={`text-sm ${state.ok ? "font-semibold text-cat-matches" : "text-accent-text"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
