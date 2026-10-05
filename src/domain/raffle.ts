import { secureRandomInt, type RandomInt } from "./random";

export type RaffleEntrant = { inviteId: string; checkedIn: boolean };

/** Picks one checked-in entrant who hasn't already won, or null if nobody is left. */
export function drawRaffleWinner(
  entrants: readonly RaffleEntrant[],
  previousWinners: ReadonlySet<string>,
  rand: RandomInt = secureRandomInt,
): string | null {
  const pool = entrants.filter((e) => e.checkedIn && !previousWinners.has(e.inviteId));
  if (pool.length === 0) return null;
  return pool[rand(pool.length)].inviteId;
}
