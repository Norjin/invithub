import type { DB } from "./db";
import { newId, nowIso } from "./ids";
import { toNotification } from "./rows";
import type { NotificationRecord } from "./types";
import type { OutgoingMessage } from "@/domain/notifications";

export type DeliveryResult = { status: "sent" | "queued" | "failed"; provider: string; error?: string };

export interface Provider {
  name: string;
  send(message: OutgoingMessage): Promise<void>;
}

const resend: Provider = {
  name: "resend",
  async send(m) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [m.to], subject: m.subject, text: m.body }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  },
};

const twilio: Provider = {
  name: "twilio",
  async send(m) {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: m.to, From: process.env.TWILIO_FROM!, Body: m.body }),
    });
    if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
  },
};

export function providerFor(channel: OutgoingMessage["channel"]): Provider | null {
  if (channel === "email" && process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return resend;
  if (channel === "phone" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    return twilio;
  }
  return null;
}

/** Outside production, messages without a configured provider land in the dev outbox instead of staying queued. */
export function usesDevOutbox(): boolean {
  return process.env.NODE_ENV !== "production";
}

export type EnqueueInput = {
  kind: NotificationRecord["kind"];
  eventId?: string | null;
  postId?: string | null;
  inviteId?: string | null;
  message: OutgoingMessage;
};

export function enqueue(db: DB, input: EnqueueInput): string {
  const id = newId();
  db.prepare(
    `INSERT INTO notifications (id, event_id, post_id, invite_id, kind, channel, recipient, subject, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?)`,
  ).run(
    id,
    input.eventId ?? null,
    input.postId ?? null,
    input.inviteId ?? null,
    input.kind,
    input.message.channel,
    input.message.to,
    input.message.subject,
    input.message.body,
    nowIso(),
  );
  return id;
}

export async function deliver(db: DB, ids: string[], provider = providerFor): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];
  for (const id of ids) {
    const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) continue;
    const n = toNotification(row);
    const p = provider(n.channel);
    let result: DeliveryResult;
    if (!p) {
      result = usesDevOutbox()
        ? { status: "sent", provider: "outbox" }
        : { status: "queued", provider: "none", error: `No ${n.channel === "email" ? "email" : "SMS"} provider configured` };
    } else {
      try {
        await p.send({ channel: n.channel, to: n.recipient, subject: n.subject, body: n.body });
        result = { status: "sent", provider: p.name };
      } catch (err) {
        result = { status: "failed", provider: p.name, error: err instanceof Error ? err.message : String(err) };
      }
    }
    db.prepare("UPDATE notifications SET status = ?, provider = ?, error = ?, sent_at = ? WHERE id = ?").run(
      result.status,
      result.provider,
      result.error ?? null,
      result.status === "sent" ? nowIso() : null,
      id,
    );
    results.push(result);
  }
  return results;
}

export function listOutbox(db: DB, limit = 50): NotificationRecord[] {
  return (db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?").all(limit) as Record<string, unknown>[]).map(
    toNotification,
  );
}

export function deliveryStatsForPost(db: DB, postId: string) {
  return db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'sent') AS sent,
         SUM(status = 'queued') AS queued,
         SUM(status = 'failed') AS failed
       FROM notifications WHERE post_id = ?`,
    )
    .get(postId) as { total: number; sent: number | null; queued: number | null; failed: number | null };
}
