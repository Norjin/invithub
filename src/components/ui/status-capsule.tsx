import { STATUS_LABEL, type InviteStatus } from "@/domain/invite-status";

const TONE: Record<InviteStatus, string> = {
  pending: "bg-muted-soft text-muted",
  approved: "bg-info-soft text-info",
  confirmed: "bg-ok-soft text-ok",
  not_going: "bg-danger-soft text-danger",
};

const DOT: Record<InviteStatus, string> = {
  pending: "bg-muted",
  approved: "bg-info",
  confirmed: "bg-ok",
  not_going: "bg-danger",
};

export function StatusCapsule({ status, className = "" }: { status: InviteStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium whitespace-nowrap ${TONE[status]} ${className}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const STATUS_DOT = DOT;
