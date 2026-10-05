import fs from "node:fs";
import path from "node:path";
import type { DB } from "./db";
import { dataDir } from "./db";
import { newId, nowIso } from "./ids";
import { AppError, type Media } from "./types";

export const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function uploadsDir(eventId: string): string {
  return path.join(dataDir(), "uploads", eventId);
}

export function validateUpload(mime: string, size: number): string {
  const ext = EXT[mime];
  if (!ext) throw new AppError("Only photos (JPEG, PNG, WebP, GIF, HEIC) can be shared.");
  if (size === 0) throw new AppError("That file is empty.");
  if (size > MAX_MEDIA_BYTES) throw new AppError("Photos can be up to 15 MB.");
  return ext;
}

export function saveMedia(db: DB, eventId: string, userId: string, mime: string, bytes: Buffer): Media {
  const ext = validateUpload(mime, bytes.byteLength);
  const id = newId();
  const fileName = `${id}.${ext}`;
  fs.mkdirSync(uploadsDir(eventId), { recursive: true });
  fs.writeFileSync(path.join(uploadsDir(eventId), fileName), bytes);
  db.prepare("INSERT INTO media (id, event_id, user_id, file_name, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    id,
    eventId,
    userId,
    fileName,
    mime,
    bytes.byteLength,
    nowIso(),
  );
  return getMedia(db, id)!;
}

export function getMedia(db: DB, mediaId: string): Media | null {
  const r = db
    .prepare("SELECT m.*, u.name AS user_name FROM media m JOIN users u ON u.id = m.user_id WHERE m.id = ?")
    .get(mediaId) as Record<string, unknown> | undefined;
  return r ? rowToMedia(r) : null;
}

export function listMedia(db: DB, eventId: string): Media[] {
  return (
    db
      .prepare("SELECT m.*, u.name AS user_name FROM media m JOIN users u ON u.id = m.user_id WHERE m.event_id = ? ORDER BY m.created_at DESC")
      .all(eventId) as Record<string, unknown>[]
  ).map(rowToMedia);
}

export function readMediaFile(media: Media): Buffer {
  return fs.readFileSync(path.join(uploadsDir(media.eventId), media.fileName));
}

export function deleteMedia(db: DB, eventId: string, mediaId: string, actor: { userId: string; isAdmin: boolean }): void {
  const media = getMedia(db, mediaId);
  if (!media || media.eventId !== eventId) return;
  if (!actor.isAdmin && media.userId !== actor.userId) throw new AppError("You can only remove photos you shared.");
  db.prepare("DELETE FROM media WHERE id = ?").run(mediaId);
  fs.rmSync(path.join(uploadsDir(media.eventId), media.fileName), { force: true });
}

function rowToMedia(r: Record<string, unknown>): Media {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    userId: r.user_id as string,
    userName: r.user_name as string,
    fileName: r.file_name as string,
    mime: r.mime as string,
    size: r.size as number,
    createdAt: r.created_at as string,
  };
}
