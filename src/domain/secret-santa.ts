import { shuffle, secureRandomInt, type RandomInt } from "./random";

export type SantaPair = { giver: string; receiver: string };

export type SantaResult = { ok: true; pairs: SantaPair[] } | { ok: false; reason: string };

/**
 * Shuffling and pairing each person with the next one in the cycle gives a
 * single loop, so nobody draws themselves and everyone gives and receives once.
 */
export function drawSecretSanta(ids: readonly string[], rand: RandomInt = secureRandomInt): SantaResult {
  const unique = [...new Set(ids)];
  if (unique.length < 2) {
    return { ok: false, reason: "Secret Santa needs at least two confirmed guests." };
  }
  const order = shuffle(unique, rand);
  const pairs = order.map((giver, i) => ({ giver, receiver: order[(i + 1) % order.length] }));
  return { ok: true, pairs };
}

export function canDrawSecretSanta(startsAt: Date, now: Date): boolean {
  return now.getTime() < startsAt.getTime();
}
