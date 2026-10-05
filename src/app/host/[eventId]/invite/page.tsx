import QRCode from "qrcode";
import { RefreshCw, Send } from "lucide-react";
import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { listInvites } from "@/server/invites";
import { appUrl } from "@/server/url";
import { emailMeCardAction, sendInvitesAction } from "@/app/actions/guests";
import { rotateJoinLinkAction } from "@/app/actions/events";
import { ActionButton, ActionForm, SubmitButton } from "@/components/ui/action-form";
import { PageHeader, Section } from "@/components/ui/section";
import { QR } from "@/components/ui/qr";
import { CardComposer } from "@/components/host/card-composer";
import { ShareTools } from "@/components/host/share-tools";
import { formatEventDate } from "@/lib/format";

export const metadata = { title: "Invite" };

export default async function InvitePage({ params }: PageProps<"/host/[eventId]/invite">) {
  const { eventId } = await params;
  const { event, user } = await requireAdmin(eventId);
  const joinUrl = appUrl(`/join/${event.joinToken}`);
  const cardUrl = `/api/events/${eventId}/card?v=${encodeURIComponent(event.cardStyle + event.cardMessage + event.joinToken)}`;
  const qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 1 });
  const guests = listInvites(getDb(), eventId).filter((i) => i.userId !== event.hostUserId);
  const sendable = guests.filter((i) => i.status === "approved" || i.status === "pending");
  const unsent = sendable.filter((i) => !i.inviteSentAt).length;

  return (
    <>
      <PageHeader eyebrow={event.title} title="Invite" />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <Section title="Invitation card" padded>
          <CardComposer
            eventId={eventId}
            initialStyle={event.cardStyle}
            initialMessage={event.cardMessage}
            title={event.title}
            when={formatEventDate(event.startsAt, event.timezone, "long")}
            where={event.venueName}
            theme={[event.theme, event.dressCode].filter(Boolean).join(" · ")}
            qrSvg={qrSvg}
          />
        </Section>

        <div className="space-y-8">
          <Section
            title="Send"
            padded
            footer={`Each guest gets the card on the channel they were added with. Approved and pending guests only.`}
          >
            <ActionForm action={sendInvitesAction.bind(null, eventId)} className="space-y-3">
              <p className="subhead text-label-2">
                {unsent > 0 ? `${unsent} of ${sendable.length} haven't been sent an invitation.` : sendable.length ? "Everyone has been sent an invitation." : "Add guests first."}
              </p>
              <SubmitButton className="btn btn-primary w-full" pendingLabel="Sending…">
                <Send aria-hidden size={18} /> {unsent > 0 ? `Send to ${unsent}` : "Send"}
              </SubmitButton>
              {sendable.length > unsent && (
                <button name="scope" value="all" className="btn btn-plain w-full">
                  Resend to all {sendable.length}
                </button>
              )}
            </ActionForm>
            <div className="mt-3 border-t-[0.5px] border-separator pt-3">
              <ActionButton className="btn btn-secondary w-full" action={emailMeCardAction.bind(null, eventId)}>
                {user.channel === "email" ? "Email me the card" : "Text me the card"}
              </ActionButton>
            </div>
          </Section>

          <Section title="Share" padded footer="Post the card anywhere. People who scan it request to join, and you approve them.">
            <div className="mb-4 flex justify-center">
              <QR value={joinUrl} size={200} label="Party QR code" />
            </div>
            <ShareTools joinUrl={joinUrl} cardUrl={cardUrl} title={event.title} />
            <div className="mt-3 border-t-[0.5px] border-separator pt-3">
              <ActionButton
                className="btn btn-plain w-full text-danger"
                confirm="Make a new link and QR code? The old ones stop working."
                action={rotateJoinLinkAction.bind(null, eventId)}
              >
                <RefreshCw aria-hidden size={16} /> Reset link
              </ActionButton>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
