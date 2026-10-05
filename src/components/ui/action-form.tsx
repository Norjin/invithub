"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/app/actions/result";

type FormAction = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
  showMessage = true,
  onSuccess,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  showMessage?: boolean;
  onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    }
    // onSuccess identity changes every render; react to new results only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {showMessage && <FormMessage result={state} />}
    </form>
  );
}

export function FormMessage({ result }: { result: ActionResult }) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <p role="alert" className="footnote mt-2 text-danger">
        {result.error}
      </p>
    );
  }
  return result.message ? (
    <p role="status" className="footnote mt-2 text-ok">
      {result.message}
    </p>
  ) : null;
}

export function SubmitButton({ children, className = "btn btn-primary", pendingLabel }: { children: ReactNode; className?: string; pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

/** A button that calls a pre-bound server action and shows its result next to it. */
export function ActionButton({
  action,
  children,
  className = "btn btn-secondary",
  confirm,
  pendingLabel,
  showMessage = true,
  ariaLabel,
}: {
  action: () => Promise<ActionResult | void>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  pendingLabel?: ReactNode;
  showMessage?: boolean;
  ariaLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={className}
        disabled={pending}
        aria-busy={pending}
        aria-label={ariaLabel}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            setResult((await action()) ?? null);
          });
        }}
      >
        {pending ? (pendingLabel ?? children) : children}
      </button>
      {showMessage && <FormMessage result={result} />}
    </span>
  );
}
