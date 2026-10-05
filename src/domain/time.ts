function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock "YYYY-MM-DDTHH:mm" in an IANA zone to a UTC Date. */
export function zonedTimeToUtc(local: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) throw new Error(`Invalid local time: ${local}`);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let guess = wall - zoneOffsetMs(new Date(wall), timeZone);
  // A second pass settles times next to a daylight-saving change.
  guess = wall - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

/** Inverse of zonedTimeToUtc, for prefilling datetime-local inputs. */
export function utcToZonedInput(date: Date, timeZone: string): string {
  const shifted = new Date(date.getTime() + zoneOffsetMs(date, timeZone));
  return shifted.toISOString().slice(0, 16);
}

/** Calendar date of an instant in the event's zone, as YYYY-MM-DD. */
export function localDate(date: Date, timeZone: string): string {
  return utcToZonedInput(date, timeZone).slice(0, 10);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
