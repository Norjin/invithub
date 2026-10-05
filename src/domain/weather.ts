export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

/** WMO weather interpretation codes, as returned by Open-Meteo. */
export function describeWeatherCode(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: "clear", label: "Clear" };
  if (code === 1 || code === 2) return { kind: "partly", label: "Partly cloudy" };
  if (code === 3) return { kind: "cloudy", label: "Cloudy" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Fog" };
  if (code >= 51 && code <= 57) return { kind: "drizzle", label: "Drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { kind: "rain", label: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", label: "Snow" };
  if (code >= 95) return { kind: "storm", label: "Thunderstorms" };
  return { kind: "cloudy", label: "Cloudy" };
}

export const FORECAST_DAYS = 16;

/** Countries that report temperatures in Fahrenheit. */
export function unitForCountry(countryCode: string | undefined): "fahrenheit" | "celsius" {
  return ["US", "LR", "MM", "BS", "BZ", "KY", "PW", "FM", "MH"].includes((countryCode ?? "").toUpperCase())
    ? "fahrenheit"
    : "celsius";
}

/** Place-name candidates for geocoding, from most to least specific. */
export function geocodeCandidates(venueName: string, venueAddress: string): string[] {
  const parts = venueAddress
    .split(",")
    // Postal codes confuse place-name search.
    .map((p) => p.replace(/\b\d{4,6}(-\d{4})?\b/g, "").trim())
    .filter(Boolean);
  // In "street, city, region" the city comes right after the street; a lone part is the city itself.
  const [first, ...rest] = parts;
  const ordered = rest.length > 0 ? [...rest, venueName.trim(), first] : [first, venueName.trim()];
  const usable = ordered.filter((p): p is string => !!p && p.length > 2 && !/^\d/.test(p));
  return [...new Set(usable)];
}
