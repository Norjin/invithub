import fs from "node:fs";
import path from "node:path";
import { getDb } from "@/server/db";
import { getEvent, isEventAdmin, setCover } from "@/server/events";
import { uploadsDir, validateUpload } from "@/server/media";
import { currentUser } from "@/server/session";
import { AppError } from "@/server/types";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif" };

/** The join page shows the cover before people sign in, so anyone with the event id can read it. */
export async function GET(_req: Request, ctx: RouteContext<"/api/events/[eventId]/cover">) {
  const { eventId } = await ctx.params;
  const event = getEvent(getDb(), eventId);
  if (!event?.coverPath) return new Response("Not found", { status: 404 });
  try {
    const bytes = fs.readFileSync(path.join(uploadsDir(eventId), event.coverPath));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": MIME[event.coverPath.split(".").pop() ?? ""] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export async function POST(req: Request, ctx: RouteContext<"/api/events/[eventId]/cover">) {
  const { eventId } = await ctx.params;
  const user = await currentUser();
  const db = getDb();
  if (!user || !getEvent(db, eventId) || !isEventAdmin(db, eventId, user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const form = await req.formData();
  if (form.get("remove") === "1") {
    setCover(db, eventId, null);
    return Response.json({ ok: true });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a photo." }, { status: 400 });
  try {
    const ext = validateUpload(file.type, file.size);
    const name = `cover-${Date.now()}.${ext}`;
    fs.mkdirSync(uploadsDir(eventId), { recursive: true });
    fs.writeFileSync(path.join(uploadsDir(eventId), name), Buffer.from(await file.arrayBuffer()));
    setCover(db, eventId, name);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
