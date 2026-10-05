"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";

export function PhotoUploader({ endpoint, label = "Add photo", tile = true }: { endpoint: string; label?: string; tile?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    for (const f of Array.from(files)) body.append("file", f);
    const res = await fetch(endpoint, { method: "POST", body });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!res.ok) {
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Upload failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className={tile ? "contents" : ""}>
      <input ref={input} type="file" accept="image/*" multiple={tile} className="sr-only" onChange={(e) => upload(e.target.files)} tabIndex={-1} aria-hidden />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={
          tile
            ? "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-accent text-[13px] font-medium text-accent disabled:opacity-50"
            : "btn btn-secondary"
        }
      >
        <ImagePlus aria-hidden size={tile ? 24 : 18} />
        {busy ? "Uploading…" : label}
      </button>
      {error && (
        <p role="alert" className={`footnote text-danger ${tile ? "col-span-full" : "mt-2"}`}>
          {error}
        </p>
      )}
    </div>
  );
}
