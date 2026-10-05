"use server";

import { refresh } from "next/cache";
import { getDb } from "@/server/db";
import { addTable, autoAssignSeats, removeTable, seatParty, updateTable } from "@/server/seating";
import { addTodo, deleteTodo, toggleTodo } from "@/server/todos";
import { createPost, deletePost } from "@/server/posts";
import { deliver } from "@/server/notify";
import { runSecretSanta } from "@/server/santa";
import { requireAdmin } from "@/server/session";
import { run, str, type ActionResult } from "./result";

export async function addTableAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => addTable(getDb(), eventId, Number(str(form, "capacity") || 8), str(form, "name")));
  refresh();
  return result;
}

export async function updateTableAction(eventId: string, tableId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => updateTable(getDb(), eventId, tableId, str(form, "name"), Number(str(form, "capacity"))), "Saved");
  refresh();
  return result;
}

export async function removeTableAction(eventId: string, tableId: string): Promise<void> {
  await requireAdmin(eventId);
  removeTable(getDb(), eventId, tableId);
  refresh();
}

export async function seatAction(eventId: string, inviteId: string, tableId: string | null): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => seatParty(getDb(), eventId, inviteId, tableId));
  refresh();
  return result;
}

export async function autoAssignAction(eventId: string): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => ({ placed: autoAssignSeats(getDb(), eventId) }));
  refresh();
  if (result?.ok) {
    const placed = (result.data?.placed as number) ?? 0;
    return { ok: true, message: placed ? `Seated ${placed} ${placed === 1 ? "party" : "parties"}.` : "Nobody else fits. Add a table." };
  }
  return result;
}

export async function addTodoAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => addTodo(getDb(), eventId, str(form, "title"), str(form, "section"), str(form, "dueDate") || null));
  refresh();
  return result;
}

export async function toggleTodoAction(eventId: string, todoId: string, done: boolean): Promise<void> {
  await requireAdmin(eventId);
  toggleTodo(getDb(), eventId, todoId, done);
  refresh();
}

export async function deleteTodoAction(eventId: string, todoId: string): Promise<void> {
  await requireAdmin(eventId);
  deleteTodo(getDb(), eventId, todoId);
  refresh();
}

export async function createPostAction(eventId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin(eventId);
  const db = getDb();
  const result = await run(async () => {
    const { notificationIds } = createPost(db, eventId, user.id, str(form, "body"));
    const results = await deliver(db, notificationIds);
    return { total: results.length, sent: results.filter((r) => r.status === "sent").length };
  });
  refresh();
  if (result?.ok) {
    const { total, sent } = result.data as { total: number; sent: number };
    return {
      ok: true,
      message:
        total === 0 ? "Posted. No approved guests to notify yet." : sent === total ? `Posted and sent to ${total}.` : `Posted. ${sent} of ${total} sent, the rest are queued.`,
    };
  }
  return result;
}

export async function deletePostAction(eventId: string, postId: string): Promise<void> {
  await requireAdmin(eventId);
  deletePost(getDb(), eventId, postId);
  refresh();
}

export async function runSantaAction(eventId: string): Promise<ActionResult> {
  await requireAdmin(eventId);
  const result = await run(() => ({ n: runSecretSanta(getDb(), eventId) }));
  refresh();
  if (result?.ok) return { ok: true, message: `Matched ${result.data?.n} guests.` };
  return result;
}
