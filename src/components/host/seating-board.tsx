"use client";

import { useState, useTransition } from "react";
import { Lock, Pencil, Plus, Sparkles, X } from "lucide-react";
import { addTableAction, autoAssignAction, removeTableAction, seatAction, updateTableAction } from "@/app/actions/hosting";
import type { ActionResult } from "@/app/actions/result";
import { ActionButton, ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";

export type SeatTable = { id: string; name: string; capacity: number };
export type SeatParty = { inviteId: string; name: string; plusOnes: string[]; tableId: string | null };

const size = (p: SeatParty) => 1 + p.plusOnes.length;

function TableDiagram({ capacity, used, highlight }: { capacity: number; used: number; highlight: boolean }) {
  const r = 38;
  return (
    <svg viewBox="0 0 100 100" className="mx-auto size-28" aria-hidden>
      <circle cx="50" cy="50" r="24" className={highlight ? "fill-accent-soft stroke-accent" : "fill-fill stroke-transparent"} strokeWidth="1.5" />
      {Array.from({ length: capacity }, (_, i) => {
        const a = (i / capacity) * Math.PI * 2 - Math.PI / 2;
        const filled = i < used;
        return (
          <circle
            key={i}
            cx={50 + r * Math.cos(a)}
            cy={50 + r * Math.sin(a)}
            r={capacity > 14 ? 3.5 : 5.5}
            className={filled ? "fill-accent" : "fill-none stroke-label-3"}
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
}

export function SeatingBoard({
  eventId,
  open,
  opensLabel,
  tables,
  parties,
}: {
  eventId: string;
  open: boolean;
  opensLabel: string;
  tables: SeatTable[];
  parties: SeatParty[];
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [picking, setPicking] = useState<SeatParty | null>(null);
  const [editing, setEditing] = useState<SeatTable | null>(null);
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, start] = useTransition();

  const used = (tableId: string) => parties.filter((p) => p.tableId === tableId).reduce((n, p) => n + size(p), 0);
  const unseated = parties.filter((p) => !p.tableId);

  const seat = (inviteId: string, tableId: string | null) =>
    start(async () => {
      setResult(await seatAction(eventId, inviteId, tableId));
      setPicking(null);
    });

  return (
    <>
      {!open && (
        <div className="card mb-6 flex items-start gap-3 p-4">
          <Lock aria-hidden size={20} className="mt-0.5 shrink-0 text-label-2" />
          <div>
            <p className="headline">Seating opens {opensLabel}</p>
            <p className="subhead text-label-2">Guests can still change their RSVP until then. You can set up tables now.</p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <ActionForm
            action={async (prev, form) => {
              const next = await addTableAction(eventId, prev, form);
              setResult(next);
              return next;
            }}
            showMessage={false}
            className="flex items-center gap-2"
          >
            <label className="flex items-center gap-2">
              <span className="subhead text-label-2">Seats</span>
              <input name="capacity" type="number" min={1} max={40} defaultValue={8} className="field w-20 text-center" aria-label="Seats at new table" />
            </label>
            <SubmitButton className="btn btn-primary">
              <Plus aria-hidden size={18} /> Add table
            </SubmitButton>
          </ActionForm>
          {open && (
            <ActionButton
              className="btn btn-secondary"
              showMessage={false}
              action={async () => {
                const next = await autoAssignAction(eventId);
                setResult(next);
              }}
            >
              <Sparkles aria-hidden size={18} /> Auto-assign
            </ActionButton>
          )}
        </div>
        <FormMessage result={result} />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[280px_1fr]">
        <section aria-label="Unseated guests" className="card self-start p-3">
          <h2 className="headline flex items-center justify-between px-1 pb-2">
            Unseated <span className="subhead text-label-2 tabular-nums">{unseated.reduce((n, p) => n + size(p), 0)}</span>
          </h2>
          {unseated.length === 0 ? (
            <p className="subhead px-1 pb-1 text-label-2">{parties.length ? "Everyone is seated." : "No confirmed guests yet."}</p>
          ) : (
            <ul className="space-y-2">
              {unseated.map((p) => (
                <li
                  key={p.inviteId}
                  draggable={open}
                  onDragStart={(e) => {
                    setDragging(p.inviteId);
                    e.dataTransfer.setData("text/plain", p.inviteId);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={`flex items-center gap-2.5 rounded-xl bg-surface-2 px-2.5 py-2 ${open ? "cursor-grab active:cursor-grabbing" : ""} ${
                    dragging === p.inviteId ? "opacity-60 shadow-lift" : ""
                  }`}
                >
                  <Avatar name={p.name} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.name}</span>
                    {p.plusOnes.length > 0 && <span className="footnote block truncate text-label-2">+ {p.plusOnes.join(", ")}</span>}
                  </span>
                  {open && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setPicking(p)} disabled={pending}>
                      Seat
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Tables" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tables.length === 0 && <p className="subhead card p-6 text-center text-label-2 sm:col-span-2">Add your first table to start seating.</p>}
          {tables.map((t) => {
            const u = used(t.id);
            const seated = parties.filter((p) => p.tableId === t.id);
            const fits = dragging ? size(parties.find((p) => p.inviteId === dragging)!) <= t.capacity - u : false;
            return (
              <div
                key={t.id}
                onDragOver={(e) => {
                  if (!open) return;
                  e.preventDefault();
                  setOver(t.id);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) seat(id, t.id);
                }}
                className={`card p-4 transition-shadow ${over === t.id ? (fits ? "ring-2 ring-accent" : "ring-2 ring-danger") : ""}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="headline">{t.name}</h3>
                  <button type="button" className="flex size-8 items-center justify-center rounded-full text-label-2 hover:bg-fill" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
                    <Pencil size={16} />
                  </button>
                </div>
                <TableDiagram capacity={t.capacity} used={u} highlight={over === t.id && fits} />
                <p className={`footnote text-center ${u >= t.capacity ? "font-medium text-danger" : "text-label-2"}`}>
                  {u}/{t.capacity} {u >= t.capacity ? "· Full" : "seated"}
                </p>
                {seated.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {seated.map((p) => (
                      <li key={p.inviteId} className="flex items-center gap-2 text-[15px]">
                        <span className="min-w-0 flex-1 truncate">
                          {p.name}
                          {p.plusOnes.length > 0 && <span className="text-label-2"> + {p.plusOnes.length}</span>}
                        </span>
                        <button
                          type="button"
                          aria-label={`Unseat ${p.name}`}
                          className="flex size-7 items-center justify-center rounded-full text-label-2 hover:bg-fill"
                          onClick={() => seat(p.inviteId, null)}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <Sheet open={!!picking} onClose={() => setPicking(null)} title={picking ? `Seat ${picking.name}` : "Seat"}>
        {picking && (
          <>
            <p className="subhead mb-3 text-label-2">
              {size(picking) > 1 ? `Party of ${size(picking)} sits together.` : "Pick a table."}
            </p>
            <ul className="card rows overflow-hidden bg-surface-2">
              {tables.map((t) => {
                const free = t.capacity - used(t.id);
                const ok = free >= size(picking);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      disabled={!ok || pending}
                      onClick={() => seat(picking.inviteId, t.id)}
                      className="flex min-h-[48px] w-full items-center justify-between px-4 text-left disabled:opacity-40"
                    >
                      <span>{t.name}</span>
                      <span className="subhead text-label-2">{free} free</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {tables.length === 0 && <p className="subhead text-label-2">Add a table first.</p>}
          </>
        )}
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit table">
        {editing && (
          <div className="space-y-4">
            <ActionForm key={editing.id} action={updateTableAction.bind(null, eventId, editing.id)} className="space-y-4" onSuccess={() => setEditing(null)}>
              <label className="block">
                <span className="label">Name</span>
                <input name="name" defaultValue={editing.name} className="field" maxLength={40} />
              </label>
              <label className="block">
                <span className="label">Seats</span>
                <input name="capacity" type="number" min={1} max={40} defaultValue={editing.capacity} className="field" />
              </label>
              <SubmitButton className="btn btn-primary w-full">Save</SubmitButton>
            </ActionForm>
            <ActionButton
              className="btn btn-danger w-full"
              confirm={`Delete ${editing.name}? Anyone seated there goes back to Unseated.`}
              action={async () => {
                await removeTableAction(eventId, editing.id);
                setEditing(null);
              }}
            >
              Delete table
            </ActionButton>
          </div>
        )}
      </Sheet>
    </>
  );
}
