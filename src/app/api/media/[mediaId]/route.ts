import { getDb } from "@/server/db";
import { getMedia, readMediaFile } from "@/server/media";
import { inviteForUser, isEventAdmin } from "@/server/events";
import { currentUser } from "@/server/session";

export async function GET(_req: Request, ctx: RouteContext<"/api/media/[mediaId]">) {
  const { mediaId } = await ctx.params;
  const user = await currentUser();
  const db = getDb();
  const media = getMedia(db, mediaId);
  if (!user || !media || (!isEventAdmin(db, media.eventId, user.id) && !inviteForUser(db, media.eventId, user.id))) {
    return new Response("Not found", { status: 404 });
  }
  try {
    return new Response(new Uint8Array(readMediaFile(media)), {
      headers: { "Content-Type": media.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
