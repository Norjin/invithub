"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { ActionResult } from "@/app/actions/result";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";

export type EventFormValues = {
  title: string;
  description: string;
  theme: string;
  dressCode: string;
  colors: string[];
  venueName: string;
  venueAddress: string;
  timezone: string;
  startsAt: string;
  rsvpClosesAt: string;
  playlistUrl: string;
  giftBudget: string;
  defaultPlusOnes: number;
};

const EMPTY: EventFormValues = {
  title: "",
  description: "",
  theme: "",
  dressCode: "",
  colors: ["#1e6b43", "#c9a14a", "#f3ead8"],
  venueName: "",
  venueAddress: "",
  timezone: "",
  startsAt: "",
  rsvpClosesAt: "",
  playlistUrl: "",
  giftBudget: "",
  defaultPlusOnes: 1,
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="footnote mt-1.5 block px-1 text-label-2">{hint}</span>}
    </label>
  );
}

export function EventForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  initial?: EventFormValues;
  submitLabel: string;
}) {
  const v = initial ?? EMPTY;
  const [colors, setColors] = useState(v.colors);
  const [timezone, setTimezone] = useState(v.timezone);

  useEffect(() => {
    if (!timezone) setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [timezone]);

  return (
    <ActionForm action={action} className="space-y-8">
      <input type="hidden" name="timezone" value={timezone} />

      <fieldset className="card space-y-5 p-5">
        <legend className="sr-only">Basics</legend>
        <Field label="Party name">
          <input name="title" className="field" defaultValue={v.title} placeholder="Winter Glow Party" required maxLength={120} />
        </Field>
        <Field label="About">
          <textarea name="description" className="field" defaultValue={v.description} placeholder="What should guests know?" maxLength={4000} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starts" hint={timezone ? `Time zone: ${timezone.replace(/_/g, " ")}` : undefined}>
            <input type="datetime-local" name="startsAt" className="field" defaultValue={v.startsAt} required />
          </Field>
          <Field label="RSVPs close" hint="Seating opens after this.">
            <input type="datetime-local" name="rsvpClosesAt" className="field" defaultValue={v.rsvpClosesAt} required />
          </Field>
        </div>
      </fieldset>

      <fieldset className="card space-y-5 p-5 [&>legend+*]:clear-both">
        <legend className="headline float-left mb-1 w-full">Place</legend>
        <Field label="Venue">
          <input name="venueName" className="field" defaultValue={v.venueName} placeholder="The Loft" maxLength={160} />
        </Field>
        <Field label="Address" hint="Used for the weather forecast. Include the city.">
          <input name="venueAddress" className="field" defaultValue={v.venueAddress} placeholder="1423 Folsom St, San Francisco, CA" maxLength={300} />
        </Field>
      </fieldset>

      <fieldset className="card space-y-5 p-5 [&>legend+*]:clear-both">
        <legend className="headline float-left mb-1 w-full">Theme</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Theme">
            <input name="theme" className="field" defaultValue={v.theme} placeholder="Cozy Winter" maxLength={120} />
          </Field>
          <Field label="Dress code">
            <input name="dressCode" className="field" defaultValue={v.dressCode} placeholder="Cocktail attire, touches of gold" maxLength={200} />
          </Field>
        </div>
        <div>
          <span className="label">Colors</span>
          <div className="flex flex-wrap items-center gap-3">
            {colors.map((c, i) => (
              <span key={i} className="relative">
                <input
                  type="color"
                  name="colors"
                  value={c}
                  aria-label={`Color ${i + 1}`}
                  onChange={(e) => setColors(colors.map((x, j) => (j === i ? e.target.value : x)))}
                  className="size-11 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-[0.5px] [&::-webkit-color-swatch]:border-separator [&::-webkit-color-swatch-wrapper]:p-0"
                />
                {colors.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove color ${i + 1}`}
                    onClick={() => setColors(colors.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-surface text-label-2 shadow-lift"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
            {colors.length < 5 && (
              <button type="button" onClick={() => setColors([...colors, "#ffffff"])} className="flex size-11 items-center justify-center rounded-full bg-fill text-accent" aria-label="Add color">
                <Plus size={20} />
              </button>
            )}
          </div>
          <p className="footnote mt-1.5 px-1 text-label-2">The first color tints the event header.</p>
        </div>
      </fieldset>

      <fieldset className="card space-y-5 p-5 [&>legend+*]:clear-both">
        <legend className="headline float-left mb-1 w-full">Extras</legend>
        <Field label="Playlist link" hint="Apple Music, Spotify, or any web link.">
          <input name="playlistUrl" type="url" className="field" defaultValue={v.playlistUrl} placeholder="https://music.apple.com/…" maxLength={500} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Secret Santa budget">
            <input name="giftBudget" className="field" defaultValue={v.giftBudget} placeholder="$30" maxLength={60} />
          </Field>
          <Field label="Plus-ones per guest" hint="You can change this per guest later.">
            <input name="defaultPlusOnes" type="number" min={0} max={10} className="field" defaultValue={v.defaultPlusOnes} />
          </Field>
        </div>
      </fieldset>

      <SubmitButton className="btn btn-primary w-full sm:w-auto" pendingLabel="Saving…">
        {submitLabel}
      </SubmitButton>
    </ActionForm>
  );
}
