import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { getDb } from "@/server/db";
import { getEvent } from "@/server/events";
import { appUrl } from "@/server/url";
import { CARD_STYLES, type CardStyle } from "@/server/types";
import { CARD_THEMES } from "@/lib/card-styles";
import { formatEventDate } from "@/lib/format";

/** Public by design: it's meant for social posts, and only shows what the join link already reveals. */
export async function GET(req: Request, ctx: RouteContext<"/api/events/[eventId]/card">) {
  const { eventId } = await ctx.params;
  const event = getEvent(getDb(), eventId);
  if (!event) return new Response("Not found", { status: 404 });

  const requested = new URL(req.url).searchParams.get("style");
  const style: CardStyle = (CARD_STYLES as readonly string[]).includes(requested ?? "") ? (requested as CardStyle) : event.cardStyle;
  const t = CARD_THEMES[style];
  const qr = await QRCode.toDataURL(appUrl(`/join/${event.joinToken}`), { margin: 1, width: 360 });
  const where = [event.venueName, event.venueAddress.split(",")[1]?.trim()].filter(Boolean).join(", ");
  const themeLine = [event.theme, event.dressCode].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: t.bg, color: t.ink, padding: 36, fontFamily: "serif" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `3px solid ${t.border}`,
            borderRadius: 24,
            padding: 40,
            textAlign: "center",
          }}
        >
          {event.cardMessage && <div style={{ fontSize: 30, fontStyle: "italic", opacity: 0.85, marginBottom: 12 }}>{event.cardMessage}</div>}
          <div style={{ fontSize: 84, fontWeight: 700, color: t.accent, lineHeight: 1.05 }}>{event.title}</div>
          <div style={{ fontSize: 34, marginTop: 18 }}>{formatEventDate(event.startsAt, event.timezone, "long")}</div>
          {where && <div style={{ fontSize: 30, opacity: 0.9, marginTop: 4 }}>{where}</div>}
          <div style={{ display: "flex", marginTop: 26, background: "#fff", padding: 8, borderRadius: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={150} height={150} alt="" />
          </div>
          {themeLine && <div style={{ fontSize: 26, opacity: 0.85, marginTop: 18 }}>{themeLine}</div>}
        </div>
      </div>
    ),
    { width: 1200, height: 900, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
