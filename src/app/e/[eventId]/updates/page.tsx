import { Mail, MessageSquare } from "lucide-react";
import { requireMember } from "@/server/session";
import { getDb } from "@/server/db";
import { listPosts } from "@/server/posts";
import { listMedia } from "@/server/media";
import { receivesUpdates } from "@/domain/invite-status";
import { maskContact } from "@/domain/notifications";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { SegmentedLinks } from "@/components/ui/segmented";
import { PhotoGrid } from "@/components/event/photo-grid";
import { PhotoUploader } from "@/components/event/photo-uploader";

export const metadata = { title: "Updates" };

export default async function GuestUpdatesPage({ params, searchParams }: PageProps<"/e/[eventId]/updates">) {
  const { eventId } = await params;
  const { tab } = await searchParams;
  const { invite, isAdmin, user } = await requireMember(eventId);
  const db = getDb();
  const active = tab === "moments" ? "moments" : "posts";
  const approved = isAdmin || (invite && invite.status !== "pending");
  const canUpload = isAdmin || (invite && receivesUpdates(invite.status));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="large-title mb-4">Updates</h1>
      <div className="mb-5">
        <SegmentedLinks
          label="Updates"
          active={active}
          items={[
            { key: "posts", label: "Posts", href: `/e/${eventId}/updates` },
            { key: "moments", label: "Moments", href: `/e/${eventId}/updates?tab=moments` },
          ]}
        />
      </div>

      {!approved ? (
        <p className="card subhead p-5 text-label-2">Updates and photos appear once the host approves your invite.</p>
      ) : active === "posts" ? (
        <PostsTab eventId={eventId} />
      ) : (
        <section aria-label="Shared moments">
          <PhotoGrid
            eventId={eventId}
            photos={listMedia(db, eventId).map((m) => ({ id: m.id, by: m.userName, canDelete: isAdmin || m.userId === user.id }))}
          >
            {canUpload && <PhotoUploader endpoint={`/api/events/${eventId}/media`} />}
          </PhotoGrid>
          {!canUpload && <p className="footnote mt-3 text-label-2">Confirm your RSVP to share photos.</p>}
        </section>
      )}

      {approved && active === "posts" && invite && receivesUpdates(invite.status) && (
        <p className="footnote mt-4 flex items-center justify-center gap-1.5 text-label-2">
          {invite.channel === "email" ? <Mail aria-hidden size={14} /> : <MessageSquare aria-hidden size={14} />}
          New posts are also sent to {maskContact(invite.contact, invite.channel)}
        </p>
      )}
    </div>
  );
}

function PostsTab({ eventId }: { eventId: string }) {
  const posts = listPosts(getDb(), eventId);
  if (posts.length === 0) return <p className="card subhead p-5 text-label-2">No updates yet. Your host's posts will show up here.</p>;
  return (
    <ul className="space-y-3">
      {posts.map((p) => (
        <li key={p.id} className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Avatar name={p.authorName} size={28} />
            <p className="footnote text-label-2">
              <span className="font-medium text-label">{p.authorName}</span> · Host · {timeAgo(p.createdAt)}
            </p>
          </div>
          <p className="whitespace-pre-wrap">{p.body}</p>
        </li>
      ))}
    </ul>
  );
}
