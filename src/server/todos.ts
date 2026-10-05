import type { DB } from "./db";
import { newId, nowIso } from "./ids";
import { toTodo } from "./rows";
import { AppError, type Todo, type TodoSection } from "./types";

const SECTIONS: TodoSection[] = ["before_rsvp", "before_party", "day_of"];

export function listTodos(db: DB, eventId: string): Todo[] {
  return (
    db.prepare("SELECT * FROM todos WHERE event_id = ? ORDER BY created_at, rowid").all(eventId) as Record<string, unknown>[]
  ).map(toTodo);
}

export function addTodo(db: DB, eventId: string, title: string, section: string, dueDate?: string | null): Todo {
  const t = title.trim();
  if (!t) throw new AppError("Add a task name.");
  if (!SECTIONS.includes(section as TodoSection)) throw new AppError("Unknown section.");
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new AppError("Invalid due date.");
  const id = newId();
  db.prepare("INSERT INTO todos (id, event_id, title, section, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    id,
    eventId,
    t.slice(0, 160),
    section,
    dueDate || null,
    nowIso(),
  );
  return toTodo(db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as Record<string, unknown>);
}

export function toggleTodo(db: DB, eventId: string, todoId: string, done: boolean): void {
  db.prepare("UPDATE todos SET done_at = ? WHERE id = ? AND event_id = ?").run(done ? nowIso() : null, todoId, eventId);
}

export function deleteTodo(db: DB, eventId: string, todoId: string): void {
  db.prepare("DELETE FROM todos WHERE id = ? AND event_id = ?").run(todoId, eventId);
}
