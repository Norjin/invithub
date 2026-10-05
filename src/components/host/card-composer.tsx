"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { CardStyle } from "@/server/types";
import { CARD_THEMES } from "@/lib/card-styles";
import { saveCardAction } from "@/app/actions/events";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CardPreview } from "@/components/event/card-preview";

export function CardComposer({
  eventId,
  initialStyle,
  initialMessage,
  title,
  when,
  where,
  theme,
  qrSvg,
}: {
  eventId: string;
  initialStyle: CardStyle;
  initialMessage: string;
  title: string;
  when: string;
  where: string;
  theme: string;
  qrSvg: string;
}) {
  const [style, setStyle] = useState(initialStyle);
  const [message, setMessage] = useState(initialMessage);
  return (
    <ActionForm action={saveCardAction.bind(null, eventId)} className="space-y-5">
      <CardPreview style={style} title={title} when={when} where={where} theme={theme} message={message} qrSvg={qrSvg} />
      <label className="block">
        <span className="label">Message</span>
        <input
          name="message"
          className="field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Join us for a cozy night of lights and music!"
          maxLength={400}
        />
      </label>
      <fieldset>
        <legend className="label">Card style</legend>
        <input type="hidden" name="style" value={style} />
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(CARD_THEMES) as CardStyle[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={style === s}
              onClick={() => setStyle(s)}
              className={`relative rounded-[14px] p-0.5 ${style === s ? "ring-2 ring-accent" : ""}`}
            >
              <CardPreview style={s} title={title} when="" where="" theme="" small />
              <span className="footnote mt-1 block">{CARD_THEMES[s].label}</span>
              {style === s && (
                <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </fieldset>
      <SubmitButton className="btn btn-secondary w-full">Save card</SubmitButton>
    </ActionForm>
  );
}
