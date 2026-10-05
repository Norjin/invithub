import { Gift, Send } from "lucide-react";
import { requireMember } from "@/server/session";
import { getDb } from "@/server/db";
import { eventPhase } from "@/server/events";
import { listDraws, listQuestions } from "@/server/live";
import { askAction } from "@/app/actions/live";
import { formatEventDate } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { LiveRefresher } from "@/components/ui/live-refresher";
import { SegmentedLinks } from "@/components/ui/segmented";
import { QuestionList } from "@/components/event/question-list";

export const metadata = { title: "Live" };

export default async function GuestLivePage({ params, searchParams }: PageProps<"/e/[eventId]/live">) {
  const { eventId } = await params;
  const { sort } = await searchParams;
  const { event, invite, user, isAdmin } = await requireMember(eventId);
  const db = getDb();
  const phase = eventPhase(event);
  const order = sort === "new" ? "new" : "top";
  const canTakePart = isAdmin || (invite && invite.status !== "pending");

  if (phase === "upcoming") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="large-title mb-4">Live</h1>
        <div className="card p-6 text-center">
          <p className="headline">Opens when the party starts</p>
          <p className="subhead mt-1 text-label-2">
            {formatEventDate(event.startsAt, event.timezone, "long")}. Come back to ask questions, vote, and see raffle winners.
          </p>
        </div>
      </div>
    );
  }

  const latest = listDraws(db, eventId)[0];
  const questions = listQuestions(db, eventId, user.id, order);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {phase === "live" && <LiveRefresher />}
      <div>
        <h1 className="large-title flex items-center gap-3">
          Live {phase === "live" && <span aria-label="Live now" className="size-3 animate-pulse rounded-full bg-danger" />}
        </h1>
        <p className="subhead text-label-2">
          {event.title}
          {invite?.checkedInAt ? " · You're checked in" : phase === "ended" ? " · Ended" : ""}
        </p>
      </div>

      {latest && (
        <section className="card p-4" aria-label="Raffle">
          <div className="flex items-center justify-between">
            <h2 className="headline">Raffle</h2>
            <Gift aria-hidden size={22} className="text-gold" />
          </div>
          <span className="footnote mt-2 inline-block rounded-full bg-gold-fill px-2.5 py-0.5 font-semibold text-on-gold">
            {latest.round > 1 ? `Round ${latest.round} winner` : "Winner"}
          </span>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={latest.winnerName} size={52} />
            <div>
              <p className="title-2">{latest.winnerName}</p>
              <p className="footnote text-label-2">Drawn from {latest.poolSize} checked-in guests</p>
            </div>
          </div>
          {latest.inviteId === invite?.id && <p className="subhead mt-3 rounded-lg bg-gold-soft px-3 py-2 font-medium">That's you! Find the host to claim your prize.</p>}
        </section>
      )}

      <section aria-label="Questions">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="headline">Questions</h2>
          <SegmentedLinks
            label="Sort questions"
            active={order}
            items={[
              { key: "top", label: "Top", href: `/e/${eventId}/live` },
              { key: "new", label: "New", href: `/e/${eventId}/live?sort=new` },
            ]}
          />
        </div>
        <div className="card overflow-hidden">
          <QuestionList
            eventId={eventId}
            canVote={phase === "live" && !!canTakePart}
            questions={questions.map((q) => ({
              id: q.id,
              body: q.body,
              votes: q.votes,
              voted: q.votedByMe,
              answered: !!q.answeredAt,
              mine: q.userId === user.id,
            }))}
          />
          {phase === "live" && canTakePart && (
            <ActionForm action={askAction.bind(null, eventId)} resetOnSuccess className="border-t-[0.5px] border-separator p-3">
              <div className="flex gap-2">
                <label htmlFor="ask" className="sr-only">
                  Ask a question
                </label>
                <input id="ask" name="body" className="field" placeholder="Ask a question…" maxLength={280} required autoComplete="off" />
                <SubmitButton className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Send aria-hidden size={18} />
                  <span className="sr-only">Send</span>
                </SubmitButton>
              </div>
            </ActionForm>
          )}
        </div>
      </section>
    </div>
  );
}
