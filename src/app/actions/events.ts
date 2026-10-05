"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getDb } from "@/server/db";
import {
  addEventAdmin,
  createEvent,
  getEventByJoinToken,
  removeEventAdmin,
  rotateJoinToken,
  setCard,
  setLive,
  updateEvent,
  type EventInput,
} from "@/server/events";
import { getInvite, joinEvent } from "@/server/invites";
import { requireAdmin, requireUser } from "@/server/session";
import { AppError } from "@/server/types";
import { run, str, type ActionResult } from "./result";

function eventInput(form: FormData): EventInput {
  return {
    title: str(form, "title"),
    description: str(form, "description"),
    theme: str(form, "theme"),
    dressCode: str(form, "dressCode"),
    colors: form.getAll("colors").filter((c): c is string => typeof c === "string" && c !== ""),
    venueName: str(form, "venueName"),
    venueAddress: str(form, "venueAddress"),
    timezone: str(form, "timezone") || "UTC",
    startsAtLocal: str(form, "startsAt"),
    rsvpClosesAtLocal: str(form, "rsvpClosesAt"),
    playlistUrl: str(form, "playlistUrl"),
    giftBudget: str(form, "giftBudget"),
    defaultPlusOnes: str(form, "defaultPlusOnes") || "1",
  };
}

export async function createEventAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireUser("/host/new");
  let eventId = "";
  const result = await run(() => {
    eventId = createEvent(getDb(), user.id, eventInput(form)).id;
  });
  if (result?.ok) redirect(`/host/${eventId}`);
  return result;
}

export async function updateEventAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => updateEvent(getDb(), eventId, eventInput(form)), "Saved");
  refresh();
  return result;
}

export async function saveCardAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => setCard(getDb(), eventId, str(form, "style"), str(form, "message")), "Card saved");
  refresh();
  return result;
}

export async function rotateJoinLinkAction(eventId: string): Promise<void> {
  await requireAdmin(eventId);
  rotateJoinToken(getDb(), eventId);
  refresh();
}

export async function setLiveAction(eventId: string, live: boolean): Promise<void> {
  await requireAdmin(eventId);
  setLive(getDb(), eventId, live);
  refresh();
}

export async function joinEventAction(token: string): Promise<void> {
  const user = await requireUser(`/join/${token}`);
  const db = getDb();
  const event = getEventByJoinToken(db, token);
  if (!event) throw new AppError("This invite link is no longer active.");
  joinEvent(db, event, user);
  redirect(`/e/${event.id}`);
}

export async function setAdminAction(eventId: string, inviteId: string, admin: boolean): Promise<ActionResult> {
  await requireAdmin(eventId);
  const db = getDb();
  const result = await run(() => {
    const invite = getInvite(db, inviteId);
    if (!invite || invite.eventId !== eventId) throw new AppError("Guest not found.");
    if (!invite.userId) throw new AppError("They need to sign in once before they can be an admin.");
    if (admin) addEventAdmin(db, eventId, invite.userId);
    else removeEventAdmin(db, eventId, invite.userId);
  });
  refresh();
  return result;
}
