import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { SignInForm } from "@/components/auth/sign-in-form";
import { InvitationSummary } from "@/components/event/invitation-card";
import { getDb } from "@/server/db";
import { getEventByJoinToken, inviteForUser, isEventAdmin } from "@/server/events";
import { currentUser } from "@/server/session";
import { joinEventAction } from "@/app/actions/events";

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const db = getDb();
  const event = getEventByJoinToken(db, token);
  if (!event) notFound();
  const host = db.prepare("SELECT name FROM users WHERE id = ?").get(event.hostUserId) as { name: string };
  const user = await currentUser();

  if (user && (inviteForUser(db, event.id, user.id) || isEventAdmin(db, event.id, user.id))) {
    redirect(`/e/${event.id}`);
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-6 pb-16">
      <div className="mb-5 text-center">
        <Brand />
      </div>
      <InvitationSummary event={event} hostName={host.name} />
      <div className="card mt-5 p-5">
        {user ? (
          <form action={joinEventAction.bind(null, token)} className="space-y-3">
            <p className="subhead text-label-2">
              Signed in as <span className="font-medium text-label">{user.name}</span>. {host.name} will approve your request.
            </p>
            <button className="btn btn-primary w-full">Request to join</button>
          </form>
        ) : (
          <SignInForm next={`/join/${token}`} joinToken={token} />
        )}
      </div>
    </main>
  );
}
