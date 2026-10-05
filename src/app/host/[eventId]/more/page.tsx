import Link from "next/link";
import { ChevronRight, Eye, ListChecks, Mail, Megaphone, Settings, UserRound } from "lucide-react";
import { requireAdmin } from "@/server/session";
import { PageHeader } from "@/components/ui/section";

export default async function MorePage({ params }: PageProps<"/host/[eventId]/more">) {
  const { eventId } = await params;
  const { event } = await requireAdmin(eventId);
  const base = `/host/${eventId}`;
  const groups: { href: string; label: string; note?: string; Icon: typeof Settings }[][] = [
    [
      { href: `${base}/prepare`, label: "Prepare", note: "To-dos and Secret Santa", Icon: ListChecks },
      { href: `${base}/invite`, label: "Invite", note: "Card, QR code and sending", Icon: Mail },
      { href: `${base}/updates`, label: "Updates", note: "Post news and manage photos", Icon: Megaphone },
    ],
    [
      { href: `${base}/settings`, label: "Event settings", Icon: Settings },
      { href: `/e/${eventId}`, label: "View as guest", Icon: Eye },
      { href: "/account", label: "Account and appearance", Icon: UserRound },
    ],
  ];
  return (
    <>
      <PageHeader eyebrow={event.title} title="More" />
      <div className="space-y-6">
        {groups.map((g, i) => (
          <ul key={i} className="card rows overflow-hidden">
            {g.map(({ href, label, note, Icon }) => (
              <li key={href}>
                <Link href={href} className="flex min-h-[52px] items-center gap-3 px-4 py-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon aria-hidden size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{label}</span>
                    {note && <span className="footnote block text-label-2">{note}</span>}
                  </span>
                  <ChevronRight aria-hidden size={18} className="text-label-3" />
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </>
  );
}
