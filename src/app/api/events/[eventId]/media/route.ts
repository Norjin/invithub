import { getDb } from "@/server/db";
import { saveMedia } from "@/server/media";
import { getEvent, inviteForUser, isEventAdmin } from "@/server/events";
import { currentUser } from "@/server/session";
import { AppError } from "@/server/types";

export async function POST(req: Request, ctx: RouteContext<"/api/events/[eventId]/media">) {
  const { eventId } = await ctx.params;
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to share photos." }, { status: 401 });
  const db = getDb();
  const event = getEvent(db, eventId);
  const invite = event ? inviteForUser(db, eventId, user.id) : null;
  const admin = event ? isEventAdmin(db, eventId, user.id) : false;
  if (!event || (!admin && !invite)) return Response.json({ error: "Not found" }, { status: 404 });
  if (!admin && invite!.status !== "approved" && invite!.status !== "confirmed") {
    return Response.json({ error: "You can share photos once your invite is approved." }, { status: 403 });
  }

  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return Response.json({ error: "Choose a photo to share." }, { status: 400 });
  if (files.length > 10) return Response.json({ error: "Share up to 10 photos at a time." }, { status: 400 });
  try {
    const saved = [];
    for (const f of files) saved.push(saveMedia(db, eventId, user.id, f.type, Buffer.from(await f.arrayBuffer())).id);
    return Response.json({ ids: saved });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
