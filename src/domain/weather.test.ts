import { describeWeatherCode, geocodeCandidates, unitForCountry } from "./weather";
import { parsePlaylistUrl } from "./playlist";

describe("weather helpers", () => {
  it("maps WMO codes", () => {
    expect(describeWeatherCode(0).label).toBe("Clear");
    expect(describeWeatherCode(2).kind).toBe("partly");
    expect(describeWeatherCode(63).kind).toBe("rain");
    expect(describeWeatherCode(75).kind).toBe("snow");
  });

  it("tries the city before the street", () => {
    expect(geocodeCandidates("The Loft", "1423 Folsom St, San Francisco, CA 94103")[0]).toBe("San Francisco");
    expect(geocodeCandidates("", "Ulaanbaatar")).toEqual(["Ulaanbaatar"]);
  });

  it("picks Fahrenheit for the US only among common cases", () => {
    expect(unitForCountry("US")).toBe("fahrenheit");
    expect(unitForCountry("MN")).toBe("celsius");
  });
});

describe("parsePlaylistUrl", () => {
  it("recognizes providers and rejects non-web links", () => {
    expect(parsePlaylistUrl("https://open.spotify.com/playlist/abc")?.provider).toBe("Spotify");
    expect(parsePlaylistUrl("https://music.apple.com/us/playlist/x")?.provider).toBe("Apple Music");
    expect(parsePlaylistUrl("javascript:alert(1)")).toBeNull();
    expect(parsePlaylistUrl("not a url")).toBeNull();
  });
});
