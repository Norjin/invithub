import { AppError } from "@/server/types";

export type ActionResult = { ok: true; message?: string; data?: Record<string, unknown> } | { ok: false; error: string } | null;

/** Turns expected validation errors into a form message; anything else (including redirects) propagates. */
export async function run(fn: () => unknown | Promise<unknown>, message?: string): Promise<ActionResult> {
  try {
    const out = await fn();
    const data = out && typeof out === "object" && !Array.isArray(out) ? (out as Record<string, unknown>) : undefined;
    return { ok: true, message, data };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    throw err;
  }
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
