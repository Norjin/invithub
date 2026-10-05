import Link from "next/link";
import { Settings2 } from "lucide-react";
import { requireMember } from "@/server/session";
import { getDb } from "@/server/db";
import { eventPhase } from "@/server/events";
import { Brand } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { TabBar, type NavItem } from "@/components/ui/tab-bar";
import { GuestTopNav } from "@/components/event/guest-top-nav";

export default async function GuestLayout({ children, params }: LayoutProps<"/e/[eventId]">) {
  const { eventId } = await params;
  const { event, user, isAdmin, invite } = await requireMember(eventId);
  const base = `/e/${eventId}`;
  const latestPost = getDb().prepare("SELECT created_at FROM posts WHERE event_id = ? ORDER BY created_at DESC LIMIT 1").get(eventId) as
    | { created_at: string }
    | undefined;
  const fresh = !!latestPost && Date.now() - new Date(latestPost.created_at).getTime() < 86_400_000;
  const items: NavItem[] = [
    { href: base, label: "Event", icon: "event", exact: true },
    { href: `${base}/updates`, label: "Updates", icon: "updates", badge: fresh },
    { href: `${base}/live`, label: "Live", icon: "live", badge: eventPhase(event) === "live" },
    { href: `${base}/pass`, label: "Pass", icon: "pass" },
  ];
  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30 border-b-[0.5px] border-separator">
        <div className="relative mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:px-6">
          <Brand />
          <GuestTopNav items={items} />
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <Link href={`/host/${eventId}`} className="btn btn-secondary btn-sm">
                <Settings2 aria-hidden size={16} /> Host view
              </Link>
            )}
            <Link href="/account" aria-label="Account">
              <Avatar name={user.name} size={32} />
            </Link>
          </div>
        </div>
      </header>
      <main className="pb-tabbar mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-6">
        {invite?.status === "pending" && !isAdmin && (
          <p role="status" className="subhead mb-4 rounded-xl bg-gold-soft px-4 py-3">
            Your request to join is waiting for the host's approval. You'll get a message when it's approved.
          </p>
        )}
        {children}
      </main>
      <TabBar items={items} label="Event" />
    </div>
  );
}
