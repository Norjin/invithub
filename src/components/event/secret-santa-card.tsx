import { Gift } from "lucide-react";

export function SecretSantaCard({ recipient, budget }: { recipient: string | null; budget: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
        <Gift aria-hidden size={22} />
      </span>
      <div className="min-w-0">
        <p className="headline">Your Secret Santa</p>
        {recipient ? (
          <p className="subhead text-label-2">
            You're bringing a gift for <span className="font-semibold text-label">{recipient}</span>
            {budget && ` · Budget ${budget}`}
          </p>
        ) : (
          <p className="subhead text-label-2">Your host hasn't drawn names yet.{budget && ` Budget ${budget}.`}</p>
        )}
      </div>
    </div>
  );
}
