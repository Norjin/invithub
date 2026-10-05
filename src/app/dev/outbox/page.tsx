import { notFound } from "next/navigation";
import { getDb } from "@/server/db";
import { listOutbox } from "@/server/notify";
import { timeAgo } from "@/lib/format";
import { LiveRefresher } from "@/components/ui/live-refresher";

export const metadata = { title: "Dev outbox" };

export default function OutboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const items = listOutbox(getDb());
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <LiveRefresher />
      <h1 className="large-title">Dev outbox</h1>
      <p className="subhead mb-5 text-label-2">Messages that would be sent by email or SMS. Configure Resend or Twilio to send them for real.</p>
      {items.length === 0 ? (
        <p className="card subhead p-5 text-label-2">Nothing sent yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className="card p-4">
              <p className="footnote text-label-2">
                {n.channel.toUpperCase()} to <span className="font-medium text-label">{n.recipient}</span> · {n.kind} · {timeAgo(n.createdAt)}
              </p>
              {n.subject && <p className="headline mt-1">{n.subject}</p>}
              <pre className="subhead mt-1 font-sans whitespace-pre-wrap">{n.body}</pre>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
