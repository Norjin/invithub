import path from "node:path";
import { dataDir, openDb } from "../src/server/db";
import { newId, nowIso } from "../src/server/ids";
import { createEvent } from "../src/server/events";
import { addGuest, setInviteStatus, setPlusOnes } from "../src/server/invites";
import { addTable } from "../src/server/seating";
import { createPost } from "../src/server/posts";
import type { InviteStatus } from "../src/domain/invite-status";

const HOST_EMAIL = "host@example.com";
const db = openDb(path.join(dataDir(), "invithub.db"));

if (db.prepare("SELECT 1 FROM users WHERE contact = ?").get(HOST_EMAIL)) {
  console.log(`Already seeded. Sign in as ${HOST_EMAIL}.`);
  process.exit(0);
}

const hostId = newId();
db.prepare("INSERT INTO users (id, name, contact, channel, created_at) VALUES (?, ?, ?, 'email', ?)").run(hostId, "Norjinsuren", HOST_EMAIL, nowIso());

const event = createEvent(db, hostId, {
  title: "Winter Glow Party",
  description: "An evening of twinkle lights, warm drinks and good company. Bring a wrapped gift for your Secret Santa.",
  theme: "Winter Glow",
  dressCode: "Festive cocktail",
  colors: ["#1e6b43", "#c9a227", "#f4efe6"],
  venueName: "The Loft",
  venueAddress: "1200 W Fulton Market, Chicago, IL",
  timezone: "America/Chicago",
  startsAtLocal: "2026-12-12T19:00",
  rsvpClosesAtLocal: "2026-12-01T23:59",
  playlistUrl: "https://music.apple.com/us/playlist/holiday-party",
  giftBudget: "$30",
  defaultPlusOnes: 1,
});

const guests: [string, InviteStatus, string[]][] = [
  ["Maya Chen", "confirmed", ["Leo Chen"]],
  ["Sam Rivera", "confirmed", []],
  ["Priya Patel", "approved", []],
  ["Jordan Lee", "pending", []],
  ["Ava Brooks", "not_going", []],
  ["Noah Kim", "confirmed", ["Ella Kim"]],
];
for (const [name, status, plusOnes] of guests) {
  const invite = addGuest(db, event.id, { name, channel: "email", contact: `${name.split(" ")[0].toLowerCase()}@example.com`, plusOneAllowance: 1 });
  if (plusOnes.length) setPlusOnes(db, invite.id, plusOnes, "host");
  if (status !== invite.status) setInviteStatus(db, invite.id, status, "host");
}

addTable(db, event.id, 8, "Table 1");
addTable(db, event.id, 8, "Table 2");
createPost(db, event.id, hostId, "Parking is free in the lot behind the building after 6 pm. See you soon!");

console.log(`Seeded "${event.title}". Sign in as ${HOST_EMAIL}; guests are <firstname>@example.com.`);
