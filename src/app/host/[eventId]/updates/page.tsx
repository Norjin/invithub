import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { listPosts } from "@/server/posts";
import { listMedia } from "@/server/media";
import { deliveryStatsForPost } from "@/server/notify";
import { createPostAction, deletePostAction } from "@/app/actions/hosting";
import { ActionButton, ActionForm, SubmitButton } from "@/components/ui/action-form";
import { PageHeader, Section } from "@/components/ui/section";
import { PhotoGrid } from "@/components/event/photo-grid";
import { PhotoUploader } from "@/components/event/photo-uploader";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Updates" };

export default async function HostUpdatesPage({ params }: PageProps<"/host/[eventId]/updates">) {
  const { eventId } = await params;
  const { event } = await requireAdmin(eventId);
  const db = getDb();
  const posts = listPosts(db, eventId);
  const media = listMedia(db, eventId);

  return (
    <>
      <PageHeader eyebrow={event.title} title="Updates" />
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-8">
          <Section title="New post" padded footer="Approved and confirmed guests get it by email or text, whichever they signed up with.">
            <ActionForm action={createPostAction.bind(null, eventId)} resetOnSuccess className="space-y-3">
              <label htmlFor="post-body" className="sr-only">
                Post
              </label>
              <textarea id="post-body" name="body" className="field" placeholder="Parking is free after 6 PM. Use the Mission St entrance." maxLength={2000} required />
              <SubmitButton className="btn btn-primary w-full" pendingLabel="Posting…">
                Post and notify
              </SubmitButton>
            </ActionForm>
          </Section>

          <Section title="Posted">
            {posts.length === 0 ? (
              <p className="subhead p-4 text-label-2">Nothing posted yet.</p>
            ) : (
              <ul className="rows">
                {posts.map((p) => {
                  const s = deliveryStatsForPost(db, p.id);
                  return (
                    <li key={p.id} className="flex gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="footnote text-label-2">
                          {p.authorName} · {timeAgo(p.createdAt)}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{p.body}</p>
                        <p className="footnote mt-1 text-label-2">
                          {s.total === 0
                            ? "No one to notify"
                            : `Sent to ${s.sent ?? 0} of ${s.total}${s.queued ? ` · ${s.queued} queued` : ""}${s.failed ? ` · ${s.failed} failed` : ""}`}
                        </p>
                      </div>
                      <ActionButton
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-fill hover:text-danger"
                        ariaLabel="Delete post"
                        confirm="Delete this post? Messages already sent can't be recalled."
                        action={deletePostAction.bind(null, eventId, p.id)}
                        showMessage={false}
                      >
                        <Trash2 size={16} />
                      </ActionButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <Section title={`Shared moments · ${media.length}`} padded footer="Guests and hosts can add photos. You can remove any of them.">
          <PhotoGrid eventId={eventId} photos={media.map((m) => ({ id: m.id, by: m.userName, canDelete: true }))}>
            <PhotoUploader endpoint={`/api/events/${eventId}/media`} />
          </PhotoGrid>
        </Section>
      </div>
    </>
  );
}
