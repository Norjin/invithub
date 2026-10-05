import { ArrowUp, Check, EyeOff, Gift, Undo2 } from "lucide-react";
import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { eventPhase } from "@/server/events";
import { getOverview } from "@/server/overview";
import { listDraws, listQuestions } from "@/server/live";
import { answerAction, drawRaffleAction, hideQuestionAction, voidDrawAction } from "@/app/actions/live";
import { setLiveAction } from "@/app/actions/events";
import { ActionButton } from "@/components/ui/action-form";
import { PageHeader, Section } from "@/components/ui/section";
import { LiveRefresher } from "@/components/ui/live-refresher";
import { CheckInPanel } from "@/components/host/check-in-panel";

export const metadata = { title: "Live" };

export default async function HostLivePage({ params }: PageProps<"/host/[eventId]/live">) {
  const { eventId } = await params;
  const { event, user } = await requireAdmin(eventId);
  const db = getDb();
  const phase = eventPhase(event);
  const c = getOverview(db, eventId);
  const draws = listDraws(db, eventId);
  const questions = listQuestions(db, eventId, user.id, "top");
  const checkedInInvites = db.prepare("SELECT COUNT(*) AS n FROM invites WHERE event_id = ? AND checked_in_at IS NOT NULL").get(eventId) as { n: number };
  const pool = checkedInInvites.n - new Set(draws.map((d) => d.inviteId)).size;

  return (
    <>
      {phase === "live" && <LiveRefresher />}
      <PageHeader
        eyebrow={event.title}
        title={
          <span className="inline-flex items-center gap-3">
            Live {phase === "live" && <span aria-label="Live now" className="size-3 animate-pulse rounded-full bg-danger" />}
          </span>
        }
        actions={
          phase === "live" ? (
            <ActionButton className="btn btn-danger" confirm="End the live event? Questions and voting close." action={setLiveAction.bind(null, eventId, false)}>
              End event
            </ActionButton>
          ) : (
            <ActionButton className="btn btn-primary" action={setLiveAction.bind(null, eventId, true)}>
              {phase === "ended" ? "Reopen live" : "Go live"}
            </ActionButton>
          )
        }
      />

      {phase !== "live" && (
        <p className="subhead card mb-6 p-4 text-label-2">
          {phase === "upcoming"
            ? "Going live opens questions and voting for guests. You can check people in any time."
            : "The event has ended. Reopen it to take more questions or draw again."}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Section title="Check-in" padded>
            <p className="subhead mb-2 text-label-2">
              {c.checkedIn} of {c.attending} checked in
            </p>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-fill">
              <div className="h-full rounded-full bg-ok" style={{ width: `${c.attending ? Math.min(100, (c.checkedIn / c.attending) * 100) : 0}%` }} />
            </div>
            <CheckInPanel eventId={eventId} />
          </Section>

          <Section title="Raffle" padded footer="Only guests who checked in can win. Each person wins once unless you void their draw.">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-gold-soft text-gold">
                <Gift aria-hidden size={22} />
              </span>
              <p className="subhead flex-1 text-label-2">Pool · {Math.max(pool, 0)} checked-in guests</p>
            </div>
            {phase === "live" && (
              <ActionButton className="btn btn-gold mt-4 w-full" action={drawRaffleAction.bind(null, eventId)} pendingLabel="Drawing…">
                Draw winner
              </ActionButton>
            )}
            {draws.length > 0 && (
              <ul className="rows mt-4 rounded-xl bg-surface-2">
                {draws.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="footnote w-16 text-label-2">Round {d.round}</span>
                    <span className="flex-1 font-medium">{d.winnerName}</span>
                    <ActionButton
                      className="btn btn-plain btn-sm text-label-2"
                      confirm={`Void ${d.winnerName}'s win? They go back in the pool.`}
                      action={voidDrawAction.bind(null, eventId, d.id)}
                      showMessage={false}
                      ariaLabel={`Void round ${d.round}`}
                    >
                      <Undo2 size={15} /> Void
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section title={`Questions · ${questions.length}`}>
          {questions.length === 0 ? (
            <p className="subhead p-4 text-label-2">{phase === "live" ? "No questions yet." : "Questions open when you go live."}</p>
          ) : (
            <ul className="rows">
              {questions.map((q) => (
                <li key={q.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="footnote mt-0.5 inline-flex min-w-[48px] items-center justify-center gap-1 rounded-full bg-fill px-2 py-1 font-semibold tabular-nums">
                    <ArrowUp aria-hidden size={13} /> {q.votes}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={q.answeredAt ? "text-label-2" : ""}>{q.body}</p>
                    <p className="footnote text-label-2">{q.authorName}</p>
                  </div>
                  <ActionButton
                    className={`btn btn-sm ${q.answeredAt ? "bg-ok-soft text-ok" : "btn-secondary"}`}
                    action={answerAction.bind(null, eventId, q.id, !q.answeredAt)}
                    showMessage={false}
                  >
                    <Check size={15} /> {q.answeredAt ? "Answered" : "Answer"}
                  </ActionButton>
                  <ActionButton
                    className="flex size-8 items-center justify-center rounded-full text-label-3 hover:bg-fill"
                    ariaLabel="Hide question"
                    confirm="Hide this question from everyone?"
                    action={hideQuestionAction.bind(null, eventId, q.id)}
                    showMessage={false}
                  >
                    <EyeOff size={16} />
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
