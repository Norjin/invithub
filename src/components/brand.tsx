import Link from "next/link";
import { Snowflake } from "lucide-react";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-[19px] font-semibold tracking-tight">
      <Snowflake aria-hidden size={22} className="text-accent" />
      InvitHub
    </Link>
  );
}
