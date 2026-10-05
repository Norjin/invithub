"use client";

import { useOptimistic, useTransition } from "react";
import { ArrowUp, Check } from "lucide-react";
import { voteAction } from "@/app/actions/live";

export type QuestionItem = { id: string; body: string; votes: number; voted: boolean; answered: boolean; mine: boolean };

export function QuestionList({ eventId, questions, canVote }: { eventId: string; questions: QuestionItem[]; canVote: boolean }) {
  const [items, toggle] = useOptimistic(questions, (state, id: string) =>
    state.map((q) => (q.id === id ? { ...q, voted: !q.voted, votes: q.votes + (q.voted ? -1 : 1) } : q)),
  );
  const [, start] = useTransition();
  if (items.length === 0) return <p className="subhead px-4 py-5 text-label-2">No questions yet. Ask the first one.</p>;
  return (
    <ul className="rows">
      {items.map((q) => (
        <li key={q.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className={q.answered ? "text-label-2" : ""}>{q.body}</p>
            {(q.answered || q.mine) && (
              <p className="footnote mt-0.5 flex items-center gap-1 text-label-2">
                {q.answered && (
                  <>
                    <Check aria-hidden size={12} className="text-ok" /> Answered
                  </>
                )}
                {q.answered && q.mine && " · "}
                {q.mine && "Your question"}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!canVote}
            aria-pressed={q.voted}
            aria-label={`${q.voted ? "Remove vote" : "Vote"}: ${q.body}. ${q.votes} votes`}
            onClick={() =>
              start(async () => {
                toggle(q.id);
                await voteAction(eventId, q.id);
              })
            }
            className={`inline-flex min-h-[36px] min-w-[64px] items-center justify-center gap-1 rounded-full px-3 text-[15px] font-semibold tabular-nums transition-colors disabled:opacity-50 ${
              q.voted ? "bg-gold-fill text-on-gold" : "bg-fill text-label"
            }`}
          >
            <ArrowUp aria-hidden size={16} strokeWidth={2.5} /> {q.votes}
          </button>
        </li>
      ))}
    </ul>
  );
}
