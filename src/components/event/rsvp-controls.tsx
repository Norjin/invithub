"use client";

import { useState, useTransition } from "react";
import type { InviteStatus } from "@/domain/invite-status";
import { rsvpAction, savePlusOnesAction } from "@/app/actions/guests";
import type { ActionResult } from "@/app/actions/result";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";

export function RsvpControls({
  eventId,
  status,
  locked,
  lockedReason,
  allowance,
  plusOnes,
}: {
  eventId: string;
  status: InviteStatus;
  locked: boolean;
  lockedReason: string | null;
  allowance: number;
  plusOnes: string[];
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>(null);
  const [names, setNames] = useState(plusOnes);
  const options = [
    { key: "confirmed" as const, label: "Going" },
    { key: "not_going" as const, label: "Not going" },
  ];
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Your RSVP" className="grid grid-cols-2 rounded-[10px] bg-fill p-0.5">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={status === o.key}
            disabled={locked || pending}
            onClick={() => start(async () => setResult(await rsvpAction(eventId, o.key)))}
            className={`rounded-[8px] py-2.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${
              status === o.key ? (o.key === "confirmed" ? "bg-accent text-on-accent" : "bg-surface text-label shadow-lift") : "text-label-2"
            } ${locked && status !== o.key ? "opacity-50" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {lockedReason && <p className="footnote text-label-2">{lockedReason}</p>}
      <FormMessage result={result} />

      {status === "confirmed" && allowance > 0 && (
        <ActionForm action={savePlusOnesAction.bind(null, eventId)} className="space-y-2 border-t-[0.5px] border-separator pt-4">
          <span className="label">
            Bringing anyone? Up to {allowance}
          </span>
          {Array.from({ length: allowance }, (_, i) => (
            <input
              key={i}
              name="plusOne"
              className="field"
              placeholder={`Guest ${i + 1} name`}
              value={names[i] ?? ""}
              onChange={(e) => setNames(Object.assign([...names], { [i]: e.target.value }))}
              disabled={locked}
              maxLength={80}
            />
          ))}
          {!locked && <SubmitButton className="btn btn-secondary btn-sm">Save</SubmitButton>}
        </ActionForm>
      )}
    </div>
  );
}
