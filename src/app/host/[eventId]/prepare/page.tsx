import { Gift } from "lucide-react";
import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { listTodos } from "@/server/todos";
import { getOverview } from "@/server/overview";
import { santaParticipantCount, santaUnassignedCount } from "@/server/santa";
import { addTodoAction, runSantaAction } from "@/app/actions/hosting";
import { ActionButton, ActionForm, SubmitButton } from "@/components/ui/action-form";
import { PageHeader, Section } from "@/components/ui/section";
import { TodoList } from "@/components/host/todo-list";
import { formatCalendarDate, formatDay, formatEventDate } from "@/lib/format";
import type { TodoSection } from "@/server/types";

export const metadata = { title: "Prepare" };

const SECTIONS: { key: TodoSection; title: string }[] = [
  { key: "before_rsvp", title: "Before RSVPs close" },
  { key: "before_party", title: "Before the party" },
  { key: "day_of", title: "Day of" },
];

export default async function PreparePage({ params }: PageProps<"/host/[eventId]/prepare">) {
  const { eventId } = await params;
  const { event } = await requireAdmin(eventId);
  const db = getDb();
  const todos = listTodos(db, eventId);
  const done = todos.filter((t) => t.doneAt).length;
  const rsvpOpen = Date.now() < new Date(event.rsvpClosesAt).getTime();
  const started = Date.now() >= new Date(event.startsAt).getTime();
  const confirmed = getOverview(db, eventId).confirmed;
  const matched = santaParticipantCount(db, eventId);
  const unassigned = event.santaDrawnAt ? santaUnassignedCount(db, eventId) : 0;

  return (
    <>
      <PageHeader eyebrow={event.title} title="Prepare" />
      <div className="mb-8">
        <p className="subhead mb-2 text-label-2">
          {done} of {todos.length} done
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-fill">
          <div className="h-full rounded-full bg-ok" style={{ width: `${todos.length ? (done / todos.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {SECTIONS.map((s) => {
            const items = todos.filter((t) => t.section === s.key);
            if (items.length === 0) return null;
            return (
              <Section key={s.key} title={s.title}>
                <TodoList
                  eventId={eventId}
                  items={items.map((t) => ({
                    id: t.id,
                    title: t.title,
                    done: !!t.doneAt,
                    due: t.dueDate ? formatCalendarDate(t.dueDate) : null,
                    lockedNote: t.title === "Assign tables" && rsvpOpen && !t.doneAt ? `Unlocks ${formatDay(event.rsvpClosesAt, event.timezone)}` : null,
                  }))}
                />
              </Section>
            );
          })}

          <Section title="Add a task" padded>
            <ActionForm action={addTodoAction.bind(null, eventId)} resetOnSuccess className="flex flex-col gap-3 sm:grid-cols-[1fr_170px_150px_auto]">
              <label className="sr-only" htmlFor="todo-title">
                Task
              </label>
              <input id="todo-title" name="title" className="field" placeholder="Order the cake" required maxLength={160} />
              <label className="sr-only" htmlFor="todo-section">
                When
              </label>
              <select id="todo-section" name="section" className="field" defaultValue="before_party">
                {SECTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.title}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="todo-due">
                Due date
              </label>
              <input id="todo-due" name="dueDate" type="date" className="field" />
              <SubmitButton className="btn btn-primary">Add</SubmitButton>
            </ActionForm>
          </Section>
        </div>

        <Section title="Secret Santa" padded className="self-start">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
              <Gift aria-hidden size={22} />
            </span>
            <div className="min-w-0">
              {event.santaDrawnAt ? (
                <>
                  <p className="headline">{matched} guests matched</p>
                  <p className="footnote text-label-2">Drawn {formatEventDate(event.santaDrawnAt, event.timezone)}. Each guest sees only their own match on their pass.</p>
                </>
              ) : (
                <>
                  <p className="headline">Not drawn yet</p>
                  <p className="footnote text-label-2">Randomly pairs the {confirmed} confirmed guests. Nobody draws themselves.</p>
                </>
              )}
              {event.giftBudget && <p className="footnote mt-1 text-label-2">Budget {event.giftBudget}</p>}
            </div>
          </div>
          {unassigned > 0 && (
            <p className="footnote mt-3 rounded-lg bg-gold-soft px-3 py-2">
              {unassigned} confirmed {unassigned === 1 ? "guest has" : "guests have"} no match yet. Redraw to include them.
            </p>
          )}
          <div className="mt-4 flex justify-end">
            {started ? (
              <p className="footnote text-label-2">The party has started, so the draw is final.</p>
            ) : (
              <ActionButton
                className="btn btn-primary w-full"
                confirm={event.santaDrawnAt ? "Redraw Secret Santa? Everyone gets a new match." : undefined}
                action={runSantaAction.bind(null, eventId)}
              >
                {event.santaDrawnAt ? "Redraw" : "Run Secret Santa"}
              </ActionButton>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}
