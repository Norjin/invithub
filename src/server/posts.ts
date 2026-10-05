import type { DB } from "./db";
import { newId, nowIso } from "./ids";
import { toInvite } from "./rows";
import { AppError, type Post } from "./types";
import { buildMessage } from "@/domain/notifications";
import { getEvent } from "./events";
import { enqueue } from "./notify";
import { appUrl } from "./url";

export function listPosts(db: DB, eventId: string): Post[] {
  const rows = db
    .prepare(
      `SELECT p.*, u.name AS author_name FROM posts p JOIN users u ON u.id = p.author_user_id
       WHERE p.event_id = ? ORDER BY p.created_at DESC`,
    )
    .all(eventId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    eventId: r.event_id as string,
    authorUserId: r.author_user_id as string,
    authorName: r.author_name as string,
    body: r.body as string,
    createdAt: r.created_at as string,
  }));
}

/** Creates the post and queues one message per approved or confirmed guest on the channel they signed up with. */
export function createPost(db: DB, eventId: string, authorUserId: string, body: string): { postId: string; notificationIds: string[] } {
  const text = body.trim();
  if (!text) throw new AppError("Write something to post.");
  if (text.length > 2000) throw new AppError("Posts can be up to 2,000 characters.");
  const event = getEvent(db, eventId);
  if (!event) throw new AppError("Event not found.");

  return db.transaction(() => {
    const postId = newId();
    db.prepare("INSERT INTO posts (id, event_id, author_user_id, body, created_at) VALUES (?, ?, ?, ?, ?)").run(
      postId,
      eventId,
      authorUserId,
      text,
      nowIso(),
    );
    const recipients = (
      db
        .prepare("SELECT * FROM invites WHERE event_id = ? AND status IN ('approved','confirmed') AND (user_id IS NULL OR user_id != ?)")
        .all(eventId, authorUserId) as Record<string, unknown>[]
    ).map(toInvite);
    const link = appUrl(`/e/${eventId}/updates`);
    const notificationIds = recipients.map((inv) =>
      enqueue(db, {
        kind: "post",
        eventId,
        postId,
        inviteId: inv.id,
        message: buildMessage(
          { contact: inv.contact, channel: inv.channel },
          { subject: `New from ${event.title}`, body: text, link },
        ),
      }),
    );
    return { postId, notificationIds };
  })();
}

export function deletePost(db: DB, eventId: string, postId: string): void {
  db.prepare("DELETE FROM posts WHERE id = ? AND event_id = ?").run(postId, eventId);
}
