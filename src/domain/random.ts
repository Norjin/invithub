import { randomInt } from "node:crypto";

/** Returns an integer in [0, max). */
export type RandomInt = (max: number) => number;

export const secureRandomInt: RandomInt = (max) => randomInt(max);

export function shuffle<T>(items: readonly T[], rand: RandomInt = secureRandomInt): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
