import { localDate, utcToZonedInput, zonedTimeToUtc } from "./time";

describe("zonedTimeToUtc", () => {
  it("converts Pacific winter time", () => {
    expect(zonedTimeToUtc("2026-12-19T19:00", "America/Los_Angeles").toISOString()).toBe("2026-12-20T03:00:00.000Z");
  });

  it("converts Pacific summer time", () => {
    expect(zonedTimeToUtc("2026-07-04T19:00", "America/Los_Angeles").toISOString()).toBe("2026-07-05T02:00:00.000Z");
  });

  it("converts zones east of UTC", () => {
    expect(zonedTimeToUtc("2026-12-19T19:00", "Asia/Ulaanbaatar").toISOString()).toBe("2026-12-19T11:00:00.000Z");
  });

  it("round-trips with utcToZonedInput", () => {
    for (const tz of ["America/New_York", "Europe/Berlin", "Asia/Tokyo", "UTC"]) {
      const d = zonedTimeToUtc("2026-03-08T12:30", tz);
      expect(utcToZonedInput(d, tz)).toBe("2026-03-08T12:30");
    }
  });
});

describe("localDate", () => {
  it("uses the event's calendar day, not UTC's", () => {
    // 7 PM in San Francisco on Dec 19 is already Dec 20 in UTC.
    expect(localDate(new Date("2026-12-20T03:00:00Z"), "America/Los_Angeles")).toBe("2026-12-19");
  });
});
