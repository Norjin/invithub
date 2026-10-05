import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "./db";
import { userForSession, SESSION_TTL_SECONDS } from "./auth-core";
import { getEvent, inviteForUser, isEventAdmin } from "./events";
import type { EventRecord, Invite, User } from "./types";

export const SESSION_COOKIE = "ih_session";

export const currentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  return userForSession(getDb(), store.get(SESSION_COOKIE)?.value);
});

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function requireUser(next?: string): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(next ? `/signin?next=${encodeURIComponent(next)}` : "/signin");
  return user;
}

export type Access = { user: User; event: EventRecord; isAdmin: boolean; invite: Invite | null };

/** Hosts, co-admins and anyone with an invite (in any status) can open the guest pages. */
export const requireMember = cache(async (eventId: string): Promise<Access> => {
  const user = await requireUser(`/e/${eventId}`);
  const db = getDb();
  const event = getEvent(db, eventId);
  if (!event) notFound();
  const isAdmin = isEventAdmin(db, eventId, user.id);
  const invite = inviteForUser(db, eventId, user.id);
  if (!isAdmin && !invite) notFound();
  return { user, event, isAdmin, invite };
});

export const requireAdmin = cache(async (eventId: string): Promise<Access> => {
  const user = await requireUser(`/host/${eventId}`);
  const db = getDb();
  const event = getEvent(db, eventId);
  if (!event || !isEventAdmin(db, eventId, user.id)) notFound();
  return { user, event, isAdmin: true, invite: inviteForUser(db, eventId, user.id) };
});
