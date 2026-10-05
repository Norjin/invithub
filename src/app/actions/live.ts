"use server";

import { refresh } from "next/cache";
import { getDb } from "@/server/db";
import { askQuestion, drawRaffle, hideQuestion, setAnswered, toggleVote, voidDraw } from "@/server/live";
import { checkInByPassCode, getInvite, undoCheckIn } from "@/server/invites";
import { deleteMedia } from "@/server/media";
import { requireAdmin, requireMember } from "@/server/session";
import { AppError } from "@/server/types";
import { run, str, type ActionResult } from "./result";

export async function askAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember(eventId);
  const result = await run(() => {
    askQuestion(getDb(), eventId, user.id, str(form, "body"));
  });
  refresh();
  return result;
}

export async function voteAction(eventId: string, questionId: string): Promise<ActionResult> {
  const { user } = await requireMember(eventId);
  const result = await run(() => {
    toggleVote(getDb(), eventId, questionId, user.id);
  });
  refresh();
  return result;
}

export async function answerAction(eventId: string, questionId: string, answered: boolean): Promise<void> {
  await requireAdmin(eventId);
  setAnswered(getDb(), eventId, questionId, answered);
  refresh();
}

export async function hideQuestionAction(eventId: string, questionId: string): Promise<void> {
  await requireAdmin(eventId);
  hideQuestion(getDb(), eventId, questionId);
  refresh();
}

export async function drawRaffleAction(eventId: string): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => {
    const d = drawRaffle(getDb(), eventId);
    return { winner: d.winnerName };
  });
  refresh();
  if (result?.ok) return { ok: true, message: `${result.data?.winner} wins!` };
  return result;
}

export async function voidDrawAction(eventId: string, drawId: string): Promise<void> {
  await requireAdmin(eventId);
  voidDraw(getDb(), eventId, drawId);
  refresh();
}

export async function checkInAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin(eventId);
  const r = checkInByPassCode(getDb(), eventId, str(form, "code"));
  refresh();
  if (!r.ok) return { ok: false, error: r.reason };
  const party = r.invite.plusOnes.length ? ` + ${r.invite.plusOnes.length}` : "";
  return { ok: true, message: r.alreadyCheckedIn ? `${r.invite.name} was already checked in.` : `Checked in ${r.invite.name}${party}.` };
}

export async function undoCheckInAction(eventId: string, inviteId: string): Promise<void> {
  await requireAdmin(eventId);
  const invite = getInvite(getDb(), inviteId);
  if (!invite || invite.eventId !== eventId) throw new AppError("Guest not found.");
  undoCheckIn(getDb(), inviteId);
  refresh();
}

export async function deleteMediaAction(eventId: string, mediaId: string): Promise<ActionResult> {
  const { user, isAdmin } = await requireMember(eventId);
  const result = await run(() => deleteMedia(getDb(), eventId, mediaId, { userId: user.id, isAdmin }));
  refresh();
  return result;
}
