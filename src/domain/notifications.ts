export type ContactChannel = "email" | "phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeContact(
  channel: ContactChannel,
  raw: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  const trimmed = raw.trim();
  if (channel === "email") {
    const value = trimmed.toLowerCase();
    return EMAIL_RE.test(value) ? { ok: true, value } : { ok: false, reason: "Enter a valid email address." };
  }
  const digits = trimmed.replace(/[^\d+]/g, "");
  const plain = digits.replace(/^\+/, "");
  if (!/^\d{10,15}$/.test(plain)) return { ok: false, reason: "Enter a valid phone number." };
  // Ten digits without a country code are treated as US numbers.
  const value = digits.startsWith("+") ? `+${plain}` : plain.length === 10 ? `+1${plain}` : `+${plain}`;
  return { ok: true, value };
}

export type OutgoingMessage = {
  channel: ContactChannel;
  to: string;
  subject: string;
  body: string;
};

/** Messages always go to the channel the person signed up with, never a second address. */
export function buildMessage(
  recipient: { contact: string; channel: ContactChannel },
  content: { subject: string; body: string; link?: string },
): OutgoingMessage {
  if (recipient.channel === "phone") {
    const text = [content.subject, content.body, content.link].filter(Boolean).join("\n");
    return { channel: "phone", to: recipient.contact, subject: content.subject, body: text.slice(0, 600) };
  }
  const body = content.link ? `${content.body}\n\n${content.link}` : content.body;
  return { channel: "email", to: recipient.contact, subject: content.subject, body };
}

export function maskContact(contact: string, channel: ContactChannel): string {
  if (channel === "email") {
    const [name, domain] = contact.split("@");
    return `${name.slice(0, 1)}${"•".repeat(Math.max(name.length - 1, 1))}@${domain}`;
  }
  return `•••• ${contact.slice(-4)}`;
}
