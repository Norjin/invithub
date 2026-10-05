import type { DB } from "./db";
import { newId, nowIso, numericCode, sha256, urlToken } from "./ids";
import { toUser } from "./rows";
import { AppError, type User } from "./types";
import { buildMessage, normalizeContact, type ContactChannel } from "@/domain/notifications";
import { enqueue } from "./notify";

const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;

export type CodeRequest = { channel: ContactChannel; contact: string; name?: string };

export function requestLoginCode(db: DB, input: CodeRequest): { contact: string; code: string; notificationId: string } {
  const normalized = normalizeContact(input.channel, input.contact);
  if (!normalized.ok) throw new AppError(normalized.reason);
  const contact = normalized.value;

  const existing = db.prepare("SELECT channel FROM users WHERE contact = ?").get(contact) as { channel: string } | undefined;
  const invitedAs = existing
    ? undefined
    : (db.prepare("SELECT name FROM invites WHERE contact = ? ORDER BY created_at LIMIT 1").get(contact) as { name: string } | undefined);
  const name = input.name?.trim() || invitedAs?.name;
  if (!existing && !name) throw new AppError("Tell us your name to create an account.");

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = db
    .prepare("SELECT COUNT(*) AS n FROM login_codes WHERE contact = ? AND created_at > ?")
    .get(contact, hourAgo) as { n: number };
  if (recent.n >= MAX_CODES_PER_HOUR) throw new AppError("Too many codes requested. Try again in an hour.");

  const code = numericCode(6);
  db.prepare(
    `INSERT INTO login_codes (id, contact, channel, name, code_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newId(),
    contact,
    input.channel,
    name || null,
    sha256(`${contact}:${code}`),
    new Date(Date.now() + CODE_TTL_MS).toISOString(),
    nowIso(),
  );

  const notificationId = enqueue(db, {
    kind: "login_code",
    message: buildMessage(
      { contact, channel: input.channel },
      { subject: "Your InvitHub code", body: `Your InvitHub sign-in code is ${code}. It expires in 10 minutes.` },
    ),
  });
  return { contact, code, notificationId };
}

export function verifyLoginCode(db: DB, contact: string, code: string): { user: User; sessionToken: string } {
  const row = db
    .prepare(
      `SELECT * FROM login_codes WHERE contact = ? AND used_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(contact, nowIso()) as Record<string, unknown> | undefined;
  if (!row) throw new AppError("That code has expired. Request a new one.");
  if ((row.attempts as number) >= MAX_ATTEMPTS) throw new AppError("Too many attempts. Request a new code.");

  if (sha256(`${contact}:${code.trim()}`) !== row.code_hash) {
    db.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    throw new AppError("That code isn't right. Check and try again.");
  }

  return db.transaction(() => {
    db.prepare("UPDATE login_codes SET used_at = ? WHERE id = ?").run(nowIso(), row.id);
    let userRow = db.prepare("SELECT * FROM users WHERE contact = ?").get(contact) as Record<string, unknown> | undefined;
    if (!userRow) {
      const id = newId();
      db.prepare("INSERT INTO users (id, name, contact, channel, created_at) VALUES (?, ?, ?, ?, ?)").run(
        id,
        (row.name as string | null) ?? contact,
        contact,
        row.channel,
        nowIso(),
      );
      userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown>;
    }
    const user = toUser(userRow);
    // Guests a host added by contact before they signed up become theirs now.
    db.prepare("UPDATE invites SET user_id = ? WHERE contact = ? AND user_id IS NULL").run(user.id, contact);

    const sessionToken = urlToken(32);
    db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
      sha256(sessionToken),
      user.id,
      new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    );
    return { user, sessionToken };
  })();
}

export function userForSession(db: DB, token: string | undefined): User | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), nowIso()) as Record<string, unknown> | undefined;
  return row ? toUser(row) : null;
}

export function deleteSession(db: DB, token: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
}

export function updateUserName(db: DB, userId: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) throw new AppError("Name can't be empty.");
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(trimmed.slice(0, 80), userId);
  db.prepare("UPDATE invites SET name = ? WHERE user_id = ?").run(trimmed.slice(0, 80), userId);
}

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;
