import { randomBytes, randomInt, randomUUID, createHash } from "node:crypto";

export const newId = () => randomUUID();

export const nowIso = () => new Date().toISOString();

// No 0/O or 1/I/L, so codes read cleanly off a screen.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function shortCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export function urlToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

export function numericCode(digits = 6): string {
  return String(randomInt(10 ** digits)).padStart(digits, "0");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
