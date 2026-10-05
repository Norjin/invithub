export const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('email','phone')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_codes (
  id TEXT PRIMARY KEY,
  contact TEXT NOT NULL,
  channel TEXT NOT NULL,
  name TEXT,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS login_codes_contact ON login_codes(contact, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  host_user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT '',
  dress_code TEXT NOT NULL DEFAULT '',
  colors TEXT NOT NULL DEFAULT '[]',
  venue_name TEXT NOT NULL DEFAULT '',
  venue_address TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  temp_unit TEXT NOT NULL DEFAULT 'fahrenheit',
  timezone TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  rsvp_closes_at TEXT NOT NULL,
  playlist_url TEXT NOT NULL DEFAULT '',
  gift_budget TEXT NOT NULL DEFAULT '',
  cover_path TEXT,
  default_plus_ones INTEGER NOT NULL DEFAULT 1,
  join_token TEXT NOT NULL UNIQUE,
  card_style TEXT NOT NULL DEFAULT 'evergreen',
  card_message TEXT NOT NULL DEFAULT '',
  santa_drawn_at TEXT,
  live_started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_admins (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS tables_ (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','phone')),
  status TEXT NOT NULL CHECK (status IN ('pending','approved','confirmed','not_going')),
  plus_one_allowance INTEGER NOT NULL DEFAULT 0,
  pass_code TEXT NOT NULL UNIQUE,
  table_id TEXT REFERENCES tables_(id) ON DELETE SET NULL,
  checked_in_at TEXT,
  invite_sent_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (event_id, contact)
);
CREATE INDEX IF NOT EXISTS invites_user ON invites(user_id);

CREATE TABLE IF NOT EXISTS plus_ones (
  id TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  checked_in_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('before_rsvp','before_party','day_of')),
  due_date TEXT,
  done_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  invite_id TEXT REFERENCES invites(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','sent','failed')),
  provider TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS santa_pairs (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  giver_invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  receiver_invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, giver_invite_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  answered_at TEXT,
  hidden_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (question_id, user_id)
);

CREATE TABLE IF NOT EXISTS raffle_draws (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  pool_size INTEGER NOT NULL,
  voided_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weather_cache (
  event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
`;
