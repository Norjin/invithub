"use client";

import { useState } from "react";
import { Check, Copy, Download, Share } from "lucide-react";

export function ShareTools({ joinUrl, cardUrl, title }: { joinUrl: string; cardUrl: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setError(null);
    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], "invitation.png", { type: "image/png" });
      const data: ShareData = { title, text: `You're invited to ${title}`, url: joinUrl };
      if (navigator.canShare?.({ ...data, files: [file] })) await navigator.share({ ...data, files: [file] });
      else if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(joinUrl);
        setCopied(true);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Sharing isn't available here. Copy the link instead.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-secondary" onClick={share}>
          <Share aria-hidden size={18} /> Share
        </button>
        <a className="btn btn-secondary" href={cardUrl} download="invitation.png">
          <Download aria-hidden size={18} /> Card image
        </a>
      </div>
      <button
        type="button"
        className="btn btn-plain w-full"
        onClick={async () => {
          await navigator.clipboard.writeText(joinUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check aria-hidden size={18} /> : <Copy aria-hidden size={18} />} {copied ? "Link copied" : "Copy invite link"}
      </button>
      {error && <p className="footnote text-danger">{error}</p>}
    </div>
  );
}
