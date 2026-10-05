"use server";

import { refresh } from "next/cache";
import { getDb } from "@/server/db";
import {
  addGuest,
  getInvite,
  listInvites,
  markInviteSent,
  removeGuest,
  setInviteStatus,
  setPlusOneAllowance,
  setPlusOnes,
} from "@/server/invites";
import { deliver, enqueue } from "@/server/notify";
import { requireAdmin, requireMember } from "@/server/session";
import { AppError, type EventRecord } from "@/server/types";
import { appUrl } from "@/server/url";
import { buildMessage } from "@/domain/notifications";
import { formatEventDate } from "@/lib/format";
import { run, str, type ActionResult } from "./result";

async function inviteInEvent(eventId: string, inviteId: string) {
  const invite = getInvite(getDb(), inviteId);
  if (!invite || invite.eventId !== eventId) throw new AppError("Guest not found.");
  return invite;
}

export async function addGuestAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(
    () =>
      addGuest(getDb(), eventId, {
        name: str(form, "name"),
        channel: str(form, "channel") === "phone" ? "phone" : "email",
        contact: str(form, "contact"),
        plusOneAllowance: Number(str(form, "plusOnes") || 0),
        status: "approved",
      }),
    "Guest added",
  );
  refresh();
  return result;
}

export async function setStatusAction(eventId: string, inviteId: string, status: string): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(async () => {
    await inviteInEvent(eventId, inviteId);
    setInviteStatus(getDb(), inviteId, status, "host");
  });
  refresh();
  return result;
}

export async function setAllowanceAction(eventId: string, inviteId: string, allowance: number): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(async () => {
    await inviteInEvent(eventId, inviteId);
    setPlusOneAllowance(getDb(), inviteId, allowance);
  });
  refresh();
  return result;
}

export async function removeGuestAction(eventId: string, inviteId: string): Promise<ActionResult> {
  const { event } = await requireAdmin(eventId);
  const result = await run(async () => {
    const invite = await inviteInEvent(eventId, inviteId);
    if (invite.userId === event.hostUserId) throw new AppError("The host can't be removed.");
    removeGuest(getDb(), inviteId);
  });
  refresh();
  return result;
}

export async function rsvpAction(eventId: string, status: "confirmed" | "not_going"): Promise<ActionResult> {
  const { invite } = await requireMember(eventId);
  const result = await run(() => {
    if (!invite) throw new AppError("You don't have an invite to this event.");
    setInviteStatus(getDb(), invite.id, status, "guest");
  });
  refresh();
  return result;
}

export async function savePlusOnesAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { invite, isAdmin } = await requireMember(eventId);
  const result = await run(() => {
    if (!invite) throw new AppError("You don't have an invite to this event.");
    const names = form.getAll("plusOne").filter((v): v is string => typeof v === "string");
    setPlusOnes(getDb(), invite.id, names, isAdmin ? "host" : "guest");
  }, "Saved");
  refresh();
  return result;
}

export async function hostSavePlusOnesAction(eventId: string, inviteId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(async () => {
    await inviteInEvent(eventId, inviteId);
    const names = form.getAll("plusOne").filter((v): v is string => typeof v === "string");
    setPlusOnes(getDb(), inviteId, names, "host");
  }, "Saved");
  refresh();
  return result;
}

function invitationText(event: EventRecord) {
  const when = formatEventDate(event.startsAt, event.timezone);
  const where = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  const lines = [
    event.cardMessage || `You're invited to ${event.title}.`,
    "",
    event.title,
    when,
    where,
    event.theme || event.dressCode ? [event.theme, event.dressCode].filter(Boolean).join(" · ") : "",
    "",
    "RSVP and see the details:",
  ];
  return lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n");
}

export async function sendInvitesAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { event } = await requireAdmin(eventId);
  const db = getDb();
  const scope = str(form, "scope");
  const result = await run(async () => {
    const targets = listInvites(db, eventId).filter(
      (i) => i.userId !== event.hostUserId && (i.status === "approved" || i.status === "pending") && (scope === "all" || !i.inviteSentAt),
    );
    if (targets.length === 0) throw new AppError(scope === "all" ? "No approved guests to send to." : "Everyone has already been sent an invitation.");
    const link = appUrl(`/join/${event.joinToken}`);
    const ids = targets.map((inv) =>
      enqueue(db, {
        kind: "invite",
        eventId,
        inviteId: inv.id,
        message: buildMessage({ contact: inv.contact, channel: inv.channel }, { subject: `You're invited: ${event.title}`, body: invitationText(event), link }),
      }),
    );
    const results = await deliver(db, ids);
    markInviteSent(
      db,
      targets.filter((_, i) => results[i]?.status === "sent").map((t) => t.id),
    );
    const sent = results.filter((r) => r.status === "sent").length;
    const notSent = results.length - sent;
    return { sent, notSent };
  });
  refresh();
  if (result?.ok && result.data) {
    const { sent, notSent } = result.data as { sent: number; notSent: number };
    return { ok: true, message: notSent ? `Sent ${sent}. ${notSent} couldn't be sent yet.` : `Sent to ${sent} ${sent === 1 ? "guest" : "guests"}.` };
  }
  return result;
}

export async function emailMeCardAction(eventId: string): Promise<ActionResult> {
  const { event, user } = await requireAdmin(eventId);
  const db = getDb();
  return run(async () => {
    const id = enqueue(db, {
      kind: "invite",
      eventId,
      message: buildMessage(
        { contact: user.contact, channel: user.channel },
        {
          subject: `Your invitation card for ${event.title}`,
          body: `${invitationText(event)}\n${appUrl(`/join/${event.joinToken}`)}\n\nCard image to share:`,
          link: appUrl(`/api/events/${eventId}/card`),
        },
      ),
    });
    const [r] = await deliver(db, [id]);
    if (r.status !== "sent") throw new AppError(r.error ?? "Couldn't send right now.");
  }, user.channel === "email" ? "Sent to your email" : "Sent to your phone");
}
