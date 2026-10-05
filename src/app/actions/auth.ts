"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getDb } from "@/server/db";
import { deleteSession, requestLoginCode, updateUserName, verifyLoginCode } from "@/server/auth-core";
import { deliver, usesDevOutbox } from "@/server/notify";
import { getEventByJoinToken } from "@/server/events";
import { joinEvent } from "@/server/invites";
import { currentUser, SESSION_COOKIE, setSessionCookie } from "@/server/session";
import { AppError } from "@/server/types";
import { run, str, type ActionResult } from "./result";

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function requestCodeAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const channel = str(form, "channel") === "phone" ? "phone" : "email";
    const db = getDb();
    const { contact, code, notificationId } = requestLoginCode(db, {
      channel,
      contact: str(form, "contact"),
      name: str(form, "name") || undefined,
    });
    const [delivery] = await deliver(db, [notificationId]);
    if (delivery?.status === "failed") throw new AppError("We couldn't send your code. Try again in a moment.");
    return { contact, channel, devCode: usesDevOutbox() && delivery?.provider === "outbox" ? code : undefined };
  });
}

export async function verifyCodeAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const db = getDb();
  let destination = safeNext(str(form, "next"));
  const result = await run(async () => {
    const { user, sessionToken } = verifyLoginCode(db, str(form, "contact"), str(form, "code"));
    await setSessionCookie(sessionToken);
    const joinToken = str(form, "joinToken");
    if (joinToken) {
      const event = getEventByJoinToken(db, joinToken);
      if (event) {
        joinEvent(db, event, user);
        destination = `/e/${event.id}`;
      }
    }
  });
  if (result?.ok) redirect(destination);
  return result;
}

export async function signOutAction() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(getDb(), token);
  store.delete(SESSION_COOKIE);
  redirect("/signin");
}

export async function updateNameAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const result = await run(() => updateUserName(getDb(), user.id, str(form, "name")), "Saved");
  refresh();
  return result;
}

export async function setThemeAction(theme: string) {
  const store = await cookies();
  if (theme === "light" || theme === "dark") {
    store.set("ih_theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    store.delete("ih_theme");
  }
}
