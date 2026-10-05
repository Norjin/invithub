import type { InviteStatus } from "@/domain/invite-status";
import type { ContactChannel } from "@/domain/notifications";

export type User = {
  id: string;
  name: string;
  contact: string;
  channel: ContactChannel;
};

export type EventRecord = {
  id: string;
  hostUserId: string;
  title: string;
  description: string;
  theme: string;
  dressCode: string;
  colors: string[];
  venueName: string;
  venueAddress: string;
  latitude: number | null;
  longitude: number | null;
  tempUnit: "fahrenheit" | "celsius";
  timezone: string;
  startsAt: string;
  rsvpClosesAt: string;
  playlistUrl: string;
  giftBudget: string;
  coverPath: string | null;
  defaultPlusOnes: number;
  joinToken: string;
  cardStyle: CardStyle;
  cardMessage: string;
  santaDrawnAt: string | null;
  liveStartedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

export const CARD_STYLES = ["evergreen", "ivory", "midnight"] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export type Invite = {
  id: string;
  eventId: string;
  userId: string | null;
  name: string;
  contact: string;
  channel: ContactChannel;
  status: InviteStatus;
  plusOneAllowance: number;
  passCode: string;
  tableId: string | null;
  checkedInAt: string | null;
  inviteSentAt: string | null;
  createdAt: string;
};

export type PlusOne = {
  id: string;
  inviteId: string;
  name: string;
  checkedInAt: string | null;
};

export type InviteWithPlusOnes = Invite & { plusOnes: PlusOne[] };

export type Table = { id: string; eventId: string; name: string; capacity: number; position: number };

export type TodoSection = "before_rsvp" | "before_party" | "day_of";
export type Todo = {
  id: string;
  eventId: string;
  title: string;
  section: TodoSection;
  dueDate: string | null;
  doneAt: string | null;
};

export type Post = {
  id: string;
  eventId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type Media = {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  fileName: string;
  mime: string;
  size: number;
  createdAt: string;
};

export type Question = {
  id: string;
  eventId: string;
  userId: string;
  authorName: string;
  body: string;
  votes: number;
  votedByMe: boolean;
  answeredAt: string | null;
  createdAt: string;
};

export type RaffleDraw = {
  id: string;
  inviteId: string;
  winnerName: string;
  round: number;
  poolSize: number;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  eventId: string | null;
  postId: string | null;
  inviteId: string | null;
  kind: "login_code" | "post" | "invite";
  channel: ContactChannel;
  recipient: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed";
  provider: string | null;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
};

export class AppError extends Error {}
