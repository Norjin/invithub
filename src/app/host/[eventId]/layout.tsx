import { requireAdmin } from "@/server/session";
import { HostSidebar } from "@/components/host/host-sidebar";
import { TabBar, type NavItem } from "@/components/ui/tab-bar";
import { formatDay } from "@/lib/format";

export default async function HostLayout({ children, params }: LayoutProps<"/host/[eventId]">) {
  const { eventId } = await params;
  const { event } = await requireAdmin(eventId);
  const base = `/host/${eventId}`;
  const groups: NavItem[][] = [
    [
      { href: base, label: "Overview", icon: "overview", exact: true },
      { href: `${base}/guests`, label: "Guests", icon: "guests" },
      { href: `${base}/seating`, label: "Seating", icon: "seating" },
      { href: `${base}/prepare`, label: "Prepare", icon: "prepare" },
    ],
    [
      { href: `${base}/invite`, label: "Invite", icon: "invite" },
      { href: `${base}/updates`, label: "Updates", icon: "posts" },
      { href: `${base}/live`, label: "Live", icon: "live" },
    ],
  ];
  const footer: NavItem[] = [
    { href: `${base}/settings`, label: "Event settings", icon: "settings" },
    { href: `/e/${eventId}`, label: "View as guest", icon: "preview" },
  ];
  const tabs: NavItem[] = [
    { href: base, label: "Overview", icon: "overview", exact: true },
    { href: `${base}/guests`, label: "Guests", icon: "guests" },
    { href: `${base}/seating`, label: "Seating", icon: "seating" },
    { href: `${base}/live`, label: "Live", icon: "live", badge: !!event.liveStartedAt && !event.endedAt },
    {
      href: `${base}/more`,
      label: "More",
      icon: "more",
      matches: [`${base}/prepare`, `${base}/invite`, `${base}/updates`, `${base}/settings`],
    },
  ];
  return (
    <div className="flex min-h-dvh">
      <HostSidebar title={event.title} date={formatDay(event.startsAt, event.timezone)} items={groups} footer={footer} />
      <main className="pb-tabbar min-w-0 flex-1 px-4 pt-6 md:px-10 md:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <TabBar items={tabs} label="Host" />
    </div>
  );
}
