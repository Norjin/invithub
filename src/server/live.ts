import type { DB } from "./db";
import { newId, nowIso } from "./ids";
import { AppError, type Question, type RaffleDraw } from "./types";
import { drawRaffleWinner } from "@/domain/raffle";
import type { RandomInt } from "@/domain/random";
import { eventPhase, getEvent } from "./events";

function requireLive(db: DB, eventId: string) {
  const event = getEvent(db, eventId);
  if (!event) throw new AppError("Event not found.");
  if (eventPhase(event) !== "live") throw new AppError("Questions open when the party goes live.");
  return event;
}

export function listQuestions(db: DB, eventId: string, viewerUserId: string, sort: "top" | "new" = "top"): Question[] {
  const order = sort === "top" ? "votes DESC, q.created_at ASC" : "q.created_at DESC";
  const rows = db
    .prepare(
      `SELECT q.*, u.name AS author_name,
         (SELECT COUNT(*) FROM votes v WHERE v.question_id = q.id) AS votes,
         EXISTS (SELECT 1 FROM votes v WHERE v.question_id = q.id AND v.user_id = ?) AS voted
       FROM questions q JOIN users u ON u.id = q.user_id
       WHERE q.event_id = ? AND q.hidden_at IS NULL
       ORDER BY ${order}`,
    )
    .all(viewerUserId, eventId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    eventId: r.event_id as string,
    userId: r.user_id as string,
    authorName: r.author_name as string,
    body: r.body as string,
    votes: r.votes as number,
    votedByMe: !!r.voted,
    answeredAt: (r.answered_at ?? null) as string | null,
    createdAt: r.created_at as string,
  }));
}

export function askQuestion(db: DB, eventId: string, userId: string, body: string): string {
  requireLive(db, eventId);
  const text = body.trim();
  if (!text) throw new AppError("Type a question first.");
  if (text.length > 280) throw new AppError("Questions can be up to 280 characters.");
  const id = newId();
  db.prepare("INSERT INTO questions (id, event_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)").run(id, eventId, userId, text, nowIso());
  return id;
}

/** One vote per person per question; voting again takes the vote back. */
export function toggleVote(db: DB, eventId: string, questionId: string, userId: string): boolean {
  requireLive(db, eventId);
  const q = db.prepare("SELECT 1 FROM questions WHERE id = ? AND event_id = ? AND hidden_at IS NULL").get(questionId, eventId);
  if (!q) throw new AppError("Question not found.");
  const removed = db.prepare("DELETE FROM votes WHERE question_id = ? AND user_id = ?").run(questionId, userId);
  if (removed.changes > 0) return false;
  db.prepare("INSERT INTO votes (question_id, user_id) VALUES (?, ?)").run(questionId, userId);
  return true;
}

export function setAnswered(db: DB, eventId: string, questionId: string, answered: boolean): void {
  db.prepare("UPDATE questions SET answered_at = ? WHERE id = ? AND event_id = ?").run(answered ? nowIso() : null, questionId, eventId);
}

export function hideQuestion(db: DB, eventId: string, questionId: string): void {
  db.prepare("UPDATE questions SET hidden_at = ? WHERE id = ? AND event_id = ?").run(nowIso(), questionId, eventId);
}

export function listDraws(db: DB, eventId: string): RaffleDraw[] {
  const rows = db
    .prepare(
      `SELECT d.*, i.name AS winner_name FROM raffle_draws d JOIN invites i ON i.id = d.invite_id
       WHERE d.event_id = ? AND d.voided_at IS NULL ORDER BY d.round DESC`,
    )
    .all(eventId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    inviteId: r.invite_id as string,
    winnerName: r.winner_name as string,
    round: r.round as number,
    poolSize: r.pool_size as number,
    createdAt: r.created_at as string,
  }));
}

/** Pool is checked-in invites at the moment of the draw; earlier winners are skipped until their draw is voided. */
export function drawRaffle(db: DB, eventId: string, rand?: RandomInt): RaffleDraw {
  return db.transaction(() => {
    requireLive(db, eventId);
    const entrants = (
      db.prepare("SELECT id, checked_in_at FROM invites WHERE event_id = ?").all(eventId) as { id: string; checked_in_at: string | null }[]
    ).map((r) => ({ inviteId: r.id, checkedIn: !!r.checked_in_at }));
    const previous = new Set(listDraws(db, eventId).map((d) => d.inviteId));
    const winner = drawRaffleWinner(entrants, previous, rand);
    if (!winner) {
      throw new AppError(
        entrants.some((e) => e.checkedIn) ? "Everyone checked in has already won." : "Nobody has checked in yet.",
      );
    }
    const poolSize = entrants.filter((e) => e.checkedIn && !previous.has(e.inviteId)).length;
    const { n } = db.prepare("SELECT COALESCE(MAX(round), 0) AS n FROM raffle_draws WHERE event_id = ?").get(eventId) as { n: number };
    const id = newId();
    db.prepare("INSERT INTO raffle_draws (id, event_id, invite_id, round, pool_size, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      id,
      eventId,
      winner,
      n + 1,
      poolSize,
      nowIso(),
    );
    return listDraws(db, eventId).find((d) => d.id === id)!;
  }).immediate();
}

export function voidDraw(db: DB, eventId: string, drawId: string): void {
  db.prepare("UPDATE raffle_draws SET voided_at = ? WHERE id = ? AND event_id = ?").run(nowIso(), drawId, eventId);
}
