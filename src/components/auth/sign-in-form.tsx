"use client";

import { useActionState, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { requestCodeAction, verifyCodeAction } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui/action-form";

export function SignInForm({ next = "/", joinToken, askName = true }: { next?: string; joinToken?: string; askName?: boolean }) {
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [requested, requestAction] = useActionState(requestCodeAction, null);
  const [verified, verifyAction] = useActionState(verifyCodeAction, null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const sent = requested?.ok && !editing ? (requested.data as { contact: string; channel: string; devCode?: string }) : null;

  if (sent) {
    return (
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="contact" value={sent.contact} />
        <input type="hidden" name="next" value={next} />
        {joinToken && <input type="hidden" name="joinToken" value={joinToken} />}
        <p className="subhead text-label-2">
          We sent a 6-digit code to <span className="font-medium text-label">{sent.contact}</span>.
        </p>
        <div>
          <label htmlFor="code" className="label">
            Code
          </label>
          <input
            id="code"
            name="code"
            className="field text-center text-[22px] tracking-[0.4em] tabular-nums"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
          />
        </div>
        {sent.devCode && (
          <p className="footnote rounded-lg bg-gold-soft px-3 py-2 text-label">
            Development mode: your code is <span className="font-semibold tabular-nums">{sent.devCode}</span>. It's also in the{" "}
            <a className="underline" href="/dev/outbox" target="_blank">
              outbox
            </a>
            .
          </p>
        )}
        <SubmitButton className="btn btn-primary w-full" pendingLabel="Checking…">
          Continue
        </SubmitButton>
        <FormMessage result={verified} />
        <button type="button" className="btn btn-plain w-full" onClick={() => setEditing(true)}>
          Use a different {sent.channel === "phone" ? "number" : "email"}
        </button>
      </form>
    );
  }

  return (
    <form action={(fd) => (setEditing(false), requestAction(fd))} className="space-y-4">
      <input type="hidden" name="channel" value={channel} />
      {askName && (
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input id="name" name="name" className="field" autoComplete="name" placeholder="New here? Tell us your name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div>
        <span className="label">Join with</span>
        <div role="radiogroup" aria-label="Sign in with" className="grid grid-cols-2 rounded-[10px] bg-fill p-0.5">
          {(["email", "phone"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={channel === c}
              onClick={() => (setChannel(c), setContact(""))}
              className={`rounded-[8px] py-2 text-[15px] font-medium ${channel === c ? "bg-accent text-on-accent" : "text-label-2"}`}
            >
              {c === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <label htmlFor="contact" className="sr-only">
          {channel === "email" ? "Email" : "Phone number"}
        </label>
        {channel === "email" ? (
          <Mail aria-hidden size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-label-2" />
        ) : (
          <Phone aria-hidden size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-label-2" />
        )}
        <input
          key={channel}
          id="contact"
          name="contact"
          className="field pl-10"
          type={channel === "email" ? "email" : "tel"}
          autoComplete={channel === "email" ? "email" : "tel"}
          placeholder={channel === "email" ? "you@example.com" : "(415) 555-0142"}
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Sending…">
        Continue
      </SubmitButton>
      <FormMessage result={requested} />
      <p className="footnote text-center text-label-2">We'll send a code. Updates from your host arrive here too.</p>
    </form>
  );
}
