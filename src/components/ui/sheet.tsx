"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native <dialog>: a bottom sheet on phones and a centered panel from md up. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none rounded-t-[22px] bg-surface p-0 text-label backdrop:bg-black/40 md:m-auto md:max-w-md md:rounded-[22px]"
    >
      <div className="p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div aria-hidden className="mx-auto -mt-2 mb-3 h-1.5 w-10 rounded-full bg-fill-strong md:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="title-2">{title}</h2>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-full bg-fill text-label-2" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
