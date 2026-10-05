import Link from "next/link";
import { requireAdmin } from "@/server/session";
import { getDb } from "@/server/db";
import { toInvite } from "@/server/rows";
import { getInviteWithPlusOnes } from "@/server/invites";
import { checkInAction } from "@/app/actions/live";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Avatar } from "@/components/ui/avatar";
import { StatusCapsule } from "@/components/ui/status-capsule";
import { PageHeader } from "@/components/ui/section";

export const metadata = { title: "Check in" };

/** Opened by scanning a guest's pass with any camera app. Viewing never checks anyone in; the button does. */
export default async function CheckInPage({ params }: PageProps<"/host/[eventId]/checkin/[code]">) {
  const { eventId, code } = await params;
  await requireAdmin(eventId);
  const db = getDb();
  const row = db.prepare("SELECT * FROM invites WHERE event_id = ? AND pass_code = ?").get(eventId, code.toUpperCase()) as
    | Record<string, unknown>
    | undefined;
  const invite = row ? getInviteWithPlusOnes(db, toInvite(row).id) : null;

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Check in" />
      {!invite ? (
        <p className="card subhead p-5 text-label-2">No pass with code {code} for this event.</p>
      ) : (
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <Avatar name={invite.name} size={52} />
            <div className="min-w-0 flex-1">
              <p className="title-2 truncate">{invite.name}</p>
              {invite.plusOnes.length > 0 && <p className="subhead text-label-2">+ {invite.plusOnes.map((p) => p.name).join(", ")}</p>}
            </div>
            <StatusCapsule status={invite.status} />
          </div>
          {invite.checkedInAt ? (
            <p className="subhead mt-5 rounded-xl bg-ok-soft px-4 py-3 text-ok">Already checked in.</p>
          ) : (
            <ActionForm action={checkInAction.bind(null, eventId)} className="mt-5">
              <input type="hidden" name="code" value={invite.passCode} />
              <SubmitButton className="btn btn-primary w-full">
                Check in {invite.plusOnes.length ? `party of ${invite.plusOnes.length + 1}` : invite.name.split(" ")[0]}
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      )}
      <Link href={`/host/${eventId}/live`} className="btn btn-plain mt-4 w-full">
        Back to Live
      </Link>
    </div>
  );
}
