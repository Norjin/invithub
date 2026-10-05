"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Lock, Trash2 } from "lucide-react";
import { deleteTodoAction, toggleTodoAction } from "@/app/actions/hosting";

export type TodoItem = { id: string; title: string; due: string | null; done: boolean; lockedNote: string | null };

export function TodoList({ eventId, items }: { eventId: string; items: TodoItem[] }) {
  const [optimistic, setOptimistic] = useOptimistic(items, (state, change: { id: string; done?: boolean; removed?: boolean }) =>
    change.removed ? state.filter((t) => t.id !== change.id) : state.map((t) => (t.id === change.id ? { ...t, done: !!change.done } : t)),
  );
  const [, start] = useTransition();
  return (
    <ul className="rows">
      {optimistic.map((t) => (
        <li key={t.id} className="group flex min-h-[52px] items-center gap-3 px-4 py-2">
          <button
            type="button"
            role="checkbox"
            aria-checked={t.done}
            aria-label={t.title}
            onClick={() =>
              start(async () => {
                setOptimistic({ id: t.id, done: !t.done });
                await toggleTodoAction(eventId, t.id, !t.done);
              })
            }
            className={`flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors ${
              t.done ? "bg-ok text-white" : "border-[1.5px] border-label-3"
            }`}
          >
            {t.done && <Check size={14} strokeWidth={3} />}
          </button>
          <span className="min-w-0 flex-1">
            <span className={`block ${t.done ? "text-label-2 line-through" : ""}`}>{t.title}</span>
            {(t.due || t.lockedNote) && (
              <span className="footnote flex items-center gap-1 text-label-2">
                {t.lockedNote && <Lock aria-hidden size={12} />}
                {t.lockedNote ?? t.due}
              </span>
            )}
          </span>
          <button
            type="button"
            aria-label={`Delete ${t.title}`}
            onClick={() =>
              start(async () => {
                setOptimistic({ id: t.id, removed: true });
                await deleteTodoAction(eventId, t.id);
              })
            }
            className="flex size-8 items-center justify-center rounded-full text-label-3 opacity-100 hover:bg-fill hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}
