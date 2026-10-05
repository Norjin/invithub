"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { checkInAction } from "@/app/actions/live";
import { FormMessage, SubmitButton } from "@/components/ui/action-form";

type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** Pass QR codes hold a check-in URL ending in the pass code; plain codes work too. */
export function codeFromScan(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    return url.pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return trimmed;
  }
}

export function CheckInPanel({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(checkInAction.bind(null, eventId), null);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => setSupported(typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices), []);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current || stopped) return;
        video.current.srcObject = stream;
        await video.current.play();
        const loop = async () => {
          if (stopped || !video.current) return;
          const hits = await detector.detect(video.current).catch(() => []);
          if (hits[0]) {
            codeInput.current!.value = codeFromScan(hits[0].rawValue);
            form.current?.requestSubmit();
            setScanning(false);
            return;
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        setScanning(false);
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  return (
    <div className="space-y-3">
      {scanning ? (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline />
          <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80" />
          <button type="button" onClick={() => setScanning(false)} className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Stop scanning">
            <X size={18} />
          </button>
        </div>
      ) : (
        supported && (
          <button type="button" onClick={() => setScanning(true)} className="btn btn-primary w-full">
            <ScanLine aria-hidden size={20} /> Scan pass
          </button>
        )
      )}
      <form ref={form} action={action} className="flex gap-2">
        <label htmlFor="pass-code" className="sr-only">
          Pass code
        </label>
        <input
          ref={codeInput}
          id="pass-code"
          name="code"
          className="field font-mono uppercase"
          placeholder="Pass code"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={60}
          required
        />
        <SubmitButton className="btn btn-secondary">Check in</SubmitButton>
      </form>
      <FormMessage result={state} />
      {!supported && <p className="footnote text-label-2">Tip: scanning a guest's pass with your phone's camera app opens a check-in screen here.</p>}
    </div>
  );
}
