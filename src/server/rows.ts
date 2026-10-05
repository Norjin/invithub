import type { DB } from "./db";
import type {
  CardStyle,
  EventRecord,
  Invite,
  InviteWithPlusOnes,
  NotificationRecord,
  PlusOne,
  Table,
  Todo,
  User,
} from "./types";

type Row = Record<string, unknown>;

const s = (v: unknown) => v as string;
const sn = (v: unknown) => (v ?? null) as string | null;

export function toUser(r: Row): User {
  return { id: s(r.id), name: s(r.name), contact: s(r.contact), channel: r.channel as User["channel"] };
}

export function toEvent(r: Row): EventRecord {
  return {
    id: s(r.id),
    hostUserId: s(r.host_user_id),
    title: s(r.title),
    description: s(r.description),
    theme: s(r.theme),
    dressCode: s(r.dress_code),
    colors: JSON.parse(s(r.colors)) as string[],
    venueName: s(r.venue_name),
    venueAddress: s(r.venue_address),
    latitude: (r.latitude ?? null) as number | null,
    longitude: (r.longitude ?? null) as number | null,
    tempUnit: r.temp_unit as EventRecord["tempUnit"],
    timezone: s(r.timezone),
    startsAt: s(r.starts_at),
    rsvpClosesAt: s(r.rsvp_closes_at),
    playlistUrl: s(r.playlist_url),
    giftBudget: s(r.gift_budget),
    coverPath: sn(r.cover_path),
    defaultPlusOnes: r.default_plus_ones as number,
    joinToken: s(r.join_token),
    cardStyle: r.card_style as CardStyle,
    cardMessage: s(r.card_message),
    santaDrawnAt: sn(r.santa_drawn_at),
    liveStartedAt: sn(r.live_started_at),
    endedAt: sn(r.ended_at),
    createdAt: s(r.created_at),
  };
}

export function toInvite(r: Row): Invite {
  return {
    id: s(r.id),
    eventId: s(r.event_id),
    userId: sn(r.user_id),
    name: s(r.name),
    contact: s(r.contact),
    channel: r.channel as Invite["channel"],
    status: r.status as Invite["status"],
    plusOneAllowance: r.plus_one_allowance as number,
    passCode: s(r.pass_code),
    tableId: sn(r.table_id),
    checkedInAt: sn(r.checked_in_at),
    inviteSentAt: sn(r.invite_sent_at),
    createdAt: s(r.created_at),
  };
}

export function toPlusOne(r: Row): PlusOne {
  return { id: s(r.id), inviteId: s(r.invite_id), name: s(r.name), checkedInAt: sn(r.checked_in_at) };
}

export function toTable(r: Row): Table {
  return {
    id: s(r.id),
    eventId: s(r.event_id),
    name: s(r.name),
    capacity: r.capacity as number,
    position: r.position as number,
  };
}

export function toTodo(r: Row): Todo {
  return {
    id: s(r.id),
    eventId: s(r.event_id),
    title: s(r.title),
    section: r.section as Todo["section"],
    dueDate: sn(r.due_date),
    doneAt: sn(r.done_at),
  };
}

export function toNotification(r: Row): NotificationRecord {
  return {
    id: s(r.id),
    eventId: sn(r.event_id),
    postId: sn(r.post_id),
    inviteId: sn(r.invite_id),
    kind: r.kind as NotificationRecord["kind"],
    channel: r.channel as NotificationRecord["channel"],
    recipient: s(r.recipient),
    subject: s(r.subject),
    body: s(r.body),
    status: r.status as NotificationRecord["status"],
    provider: sn(r.provider),
    error: sn(r.error),
    createdAt: s(r.created_at),
    sentAt: sn(r.sent_at),
  };
}

export function attachPlusOnes(db: DB, invites: Invite[]): InviteWithPlusOnes[] {
  if (invites.length === 0) return [];
  const placeholders = invites.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM plus_ones WHERE invite_id IN (${placeholders}) ORDER BY created_at`)
    .all(...invites.map((i) => i.id)) as Row[];
  const byInvite = new Map<string, PlusOne[]>();
  for (const r of rows) {
    const p = toPlusOne(r);
    byInvite.set(p.inviteId, [...(byInvite.get(p.inviteId) ?? []), p]);
  }
  return invites.map((i) => ({ ...i, plusOnes: byInvite.get(i.id) ?? [] }));
}
