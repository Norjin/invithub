"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, ChevronDown, Minus, Plus, Search, Shield, Trash2, UserPlus } from "lucide-react";
import { INVITE_STATUSES, STATUS_LABEL, type InviteStatus } from "@/domain/invite-status";
import { addGuestAction, hostSavePlusOnesAction, removeGuestAction, setAllowanceAction, setStatusAction } from "@/app/actions/guests";
import { setAdminAction } from "@/app/actions/events";
import { undoCheckInAction } from "@/app/actions/live";
import type { ActionResult } from "@/app/actions/result";
import { ActionButton, ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { STATUS_DOT } from "@/components/ui/status-capsule";

export type GuestRow = {
  id: string;
  name: string;
  contact: string;
  channel: "email" | "phone";
  status: InviteStatus;
  plusOnes: string[];
  plusOneAllowance: number;
  checkedIn: boolean;
  isAdmin: boolean;
  isHost: boolean;
  hasAccount: boolean;
  passCode: string;
  tableName: string | null;
};

const SELECT_TONE: Record<InviteStatus, string> = {
  pending: "bg-muted-soft text-muted",
  approved: "bg-info-soft text-info",
  confirmed: "bg-ok-soft text-ok",
  not_going: "bg-danger-soft text-danger",
};

function placeMenu(button: HTMLElement) {
  const r = button.getBoundingClientRect();
  const width = 220;
  const height = INVITE_STATUSES.length * 44 + 8;
  const gap = 6;
  const below = r.bottom + gap;
  const top = below + height > window.innerHeight - 8 ? Math.max(8, r.top - gap - height) : below;
  const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
  return { top, left, width };
}

function StatusSelect({ eventId, guest }: { eventId: string; guest: GuestRow }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<ActionResult>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => {
      if (buttonRef.current) setPos(placeMenu(buttonRef.current));
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  function choose(to: InviteStatus) {
    setOpen(false);
    if (to === guest.status) return;
    if (guest.tableName && to !== "confirmed" && !window.confirm(`${guest.name} will lose their seat at ${guest.tableName}. Continue?`)) return;
    start(async () => setError(await setStatusAction(eventId, guest.id, to)));
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Status for ${guest.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        onClick={() => {
          if (buttonRef.current) setPos(placeMenu(buttonRef.current));
          setOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1 rounded-full py-1 pr-2 pl-3 text-[13px] font-medium disabled:opacity-60 ${SELECT_TONE[guest.status]}`}
      >
        {STATUS_LABEL[guest.status]}
        <ChevronDown aria-hidden size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label={`Status for ${guest.name}`}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-50 overflow-hidden rounded-[14px] bg-surface py-1 shadow-lift ring-1 ring-separator"
          >
            {INVITE_STATUSES.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s === guest.status}
                  onClick={() => choose(s)}
                  className="flex min-h-11 w-full items-center gap-3 px-3.5 text-left text-[15px] hover:bg-fill"
                >
                  <span aria-hidden className={`size-2 shrink-0 rounded-full ${STATUS_DOT[s]}`} />
                  <span className="flex-1">{STATUS_LABEL[s]}</span>
                  {s === guest.status && <Check aria-hidden size={16} className="text-accent" />}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
      {error && !error.ok && <FormMessage result={error} />}
    </span>
  );
}

function GuestDetails({ eventId, guest }: { eventId: string; guest: GuestRow }) {
  const [names, setNames] = useState(guest.plusOnes);
  const allowance = guest.plusOneAllowance;
  return (
    <div className="space-y-4 border-t-[0.5px] border-separator bg-surface-2/50 px-4 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="subhead text-label-2">Plus-ones allowed</span>
          <ActionButton
            className="flex size-8 items-center justify-center rounded-full bg-fill"
            ariaLabel="Allow one fewer"
            action={() => setAllowanceAction(eventId, guest.id, allowance - 1)}
          >
            <Minus size={16} />
          </ActionButton>
          <span className="w-5 text-center tabular-nums">{allowance}</span>
          <ActionButton
            className="flex size-8 items-center justify-center rounded-full bg-fill"
            ariaLabel="Allow one more"
            action={() => setAllowanceAction(eventId, guest.id, allowance + 1)}
          >
            <Plus size={16} />
          </ActionButton>
        </div>
        <span className="subhead text-label-2">
          Pass <span className="font-mono text-label">{guest.passCode}</span>
        </span>
        {guest.tableName && <span className="subhead text-label-2">Seated at {guest.tableName}</span>}
      </div>

      {allowance > 0 && (
        <ActionForm action={hostSavePlusOnesAction.bind(null, eventId, guest.id)} className="space-y-2">
          <span className="label">Plus-one names</span>
          {Array.from({ length: allowance }, (_, i) => (
            <input
              key={i}
              name="plusOne"
              className="field"
              placeholder={`Guest ${i + 1}`}
              value={names[i] ?? ""}
              onChange={(e) => setNames(Object.assign([...names], { [i]: e.target.value }))}
              maxLength={80}
            />
          ))}
          <SubmitButton className="btn btn-secondary btn-sm">Save names</SubmitButton>
        </ActionForm>
      )}

      <div className="flex flex-wrap gap-2">
        {guest.checkedIn && (
          <ActionButton className="btn btn-secondary btn-sm" action={() => undoCheckInAction(eventId, guest.id)}>
            Undo check-in
          </ActionButton>
        )}
        {!guest.isHost && guest.hasAccount && (
          <ActionButton className="btn btn-secondary btn-sm" action={() => setAdminAction(eventId, guest.id, !guest.isAdmin)}>
            <Shield size={15} /> {guest.isAdmin ? "Remove admin" : "Make admin"}
          </ActionButton>
        )}
        {!guest.isHost && (
          <ActionButton
            className="btn btn-danger btn-sm"
            confirm={`Remove ${guest.name} from the guest list?`}
            action={() => removeGuestAction(eventId, guest.id)}
          >
            <Trash2 size={15} /> Remove
          </ActionButton>
        )}
      </div>
    </div>
  );
}

export function GuestList({ eventId, guests, filter }: { eventId: string; guests: GuestRow[]; filter: InviteStatus | "all" }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [channel, setChannel] = useState<"email" | "phone">("email");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: guests.length };
    for (const s of INVITE_STATUSES) c[s] = guests.filter((g) => g.status === s).length;
    return c;
  }, [guests]);

  const visible = guests.filter(
    (g) => (filter === "all" || g.status === filter) && (!query || `${g.name} ${g.contact}`.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search guests</span>
          <Search aria-hidden size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-label-2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="field pl-10" type="search" />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          <UserPlus aria-hidden size={18} /> Add guest
        </button>
      </div>

      <nav aria-label="Filter by status" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {(["all", ...INVITE_STATUSES] as const).map((s) => (
          <Link
            key={s}
            href={s === "all" ? `/host/${eventId}/guests` : `/host/${eventId}/guests?status=${s}`}
            scroll={false}
            aria-current={filter === s ? "page" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[15px] font-medium whitespace-nowrap ${
              filter === s ? "bg-accent text-on-accent" : "bg-surface text-label"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]} <span className="tabular-nums opacity-70">{counts[s]}</span>
          </Link>
        ))}
      </nav>

      <div className="card overflow-hidden">
        <div className="footnote hidden grid-cols-[1.6fr_1.4fr_90px_150px_90px] gap-3 border-b-[0.5px] border-separator px-4 py-2.5 font-medium text-label-2 md:grid">
          <span>Name</span>
          <span>Contact</span>
          <span>Plus-ones</span>
          <span>Status</span>
          <span>Checked in</span>
        </div>
        {visible.length === 0 ? (
          <p className="subhead p-6 text-center text-label-2">
            {guests.length === 0 ? "No guests yet. Add someone, or share your party QR code." : "No guests match."}
          </p>
        ) : (
          <ul className="rows">
            {visible.map((g) => (
              <li key={g.id}>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 md:grid-cols-[1.6fr_1.4fr_90px_150px_90px]">
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-3 text-left"
                    aria-expanded={openId === g.id}
                    onClick={() => setOpenId(openId === g.id ? null : g.id)}
                  >
                    <Avatar name={g.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {g.name}
                        {g.isHost ? <span className="footnote ml-1.5 text-accent">Host</span> : g.isAdmin && <span className="footnote ml-1.5 text-accent">Admin</span>}
                      </span>
                      <span className="footnote block truncate text-label-2 md:hidden">
                        {g.contact}
                        {g.plusOnes.length > 0 && ` · +${g.plusOnes.length}`}
                      </span>
                    </span>
                  </button>
                  <span className="subhead hidden truncate text-label-2 md:block">{g.contact}</span>
                  <span className="subhead hidden tabular-nums md:block">{g.plusOnes.length}</span>
                  <StatusSelect eventId={eventId} guest={g} />
                  <span className="subhead hidden text-label-2 md:block">{g.checkedIn ? <span className="text-ok">Yes</span> : "—"}</span>
                </div>
                {openId === g.id && <GuestDetails eventId={eventId} guest={g} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add guest">
        <ActionForm action={addGuestAction.bind(null, eventId)} resetOnSuccess className="space-y-4">
          <input type="hidden" name="channel" value={channel} />
          <label className="block">
            <span className="label">Name</span>
            <input name="name" className="field" required maxLength={80} autoComplete="off" />
          </label>
          <div role="radiogroup" aria-label="Contact by" className="grid grid-cols-2 rounded-[10px] bg-fill p-0.5">
            {(["email", "phone"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={channel === c}
                onClick={() => setChannel(c)}
                className={`rounded-[8px] py-2 text-[15px] font-medium ${channel === c ? "bg-surface shadow-lift" : "text-label-2"}`}
              >
                {c === "email" ? "Email" : "Phone"}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label">{channel === "email" ? "Email" : "Phone number"}</span>
            <input key={channel} name="contact" type={channel === "email" ? "email" : "tel"} className="field" required />
          </label>
          <label className="block">
            <span className="label">Plus-ones allowed</span>
            <input name="plusOnes" type="number" min={0} max={10} defaultValue={1} className="field" />
          </label>
          <p className="footnote text-label-2">They're added as Approved. Invitations go out from the Invite page.</p>
          <SubmitButton className="btn btn-primary w-full">Add guest</SubmitButton>
        </ActionForm>
      </Sheet>
    </>
  );
}
