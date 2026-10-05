# InvitHub

Create a party, invite guests with a QR code or by email/SMS, and run the night: RSVPs, seating, Secret Santa, live questions, a raffle, shared photos and host updates.

## Run it

```bash
npm install
npm run seed   # optional: a sample party; sign in as host@example.com
npm run dev
```

Open http://localhost:3000. Sign-in uses a one-time code. Without an email or SMS provider configured, the code is shown on screen and every message is written to the dev outbox at `/dev/outbox`.

## Configuration

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Public URL used in QR codes, invites and links in messages |
| `DATA_DIR` | Where the SQLite database and uploads live (default `./data`) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Send email through Resend |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Send SMS through Twilio |

In production, messages for a channel with no provider stay queued with an error instead of going to the outbox.

Weather comes from Open-Meteo and needs no key. Forecasts appear 16 days before the party.

## Scripts

- `npm test`: domain, service and UI tests (Vitest)
- `npm run typecheck`
- `npm run build` / `npm start`

## Layout

- `src/domain`: pure rules (status changes, seating, Secret Santa, raffle, time zones)
- `src/server`: database services; each takes a `db` so tests use an in-memory database
- `src/app/actions`: server actions that check access, then call services
- `src/app/host/[eventId]`: host pages; `src/app/e/[eventId]`: guest pages
