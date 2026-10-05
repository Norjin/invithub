export type PlaylistLink = { url: string; provider: "Apple Music" | "Spotify" | "YouTube Music" | "Link" };

export function parsePlaylistUrl(raw: string): PlaylistLink | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\./, "");
  const provider =
    host === "music.apple.com"
      ? "Apple Music"
      : host === "open.spotify.com"
        ? "Spotify"
        : host === "music.youtube.com"
          ? "YouTube Music"
          : "Link";
  return { url: url.toString(), provider };
}
