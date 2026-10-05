"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { deleteMediaAction } from "@/app/actions/live";
import { ActionButton } from "@/components/ui/action-form";

export type PhotoItem = { id: string; by: string; canDelete: boolean };

export function PhotoGrid({ eventId, photos, children }: { eventId: string; photos: PhotoItem[]; children?: React.ReactNode }) {
  const [viewing, setViewing] = useState<PhotoItem | null>(null);
  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {children && <li>{children}</li>}
        {photos.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => setViewing(p)} className="block aspect-square w-full overflow-hidden rounded-xl bg-fill" aria-label={`Photo by ${p.by}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${p.id}`} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {viewing && (
        <div role="dialog" aria-modal aria-label={`Photo by ${viewing.by}`} className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 text-white" onClick={() => setViewing(null)}>
          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <span className="subhead">Shared by {viewing.by}</span>
            <div className="flex items-center gap-2">
              {viewing.canDelete && (
                <ActionButton
                  className="flex size-10 items-center justify-center rounded-full bg-white/15"
                  ariaLabel="Delete photo"
                  confirm="Delete this photo?"
                  showMessage={false}
                  action={async () => {
                    const r = await deleteMediaAction(eventId, viewing.id);
                    setViewing(null);
                    return r;
                  }}
                >
                  <Trash2 size={18} />
                </ActionButton>
              )}
              <button type="button" onClick={() => setViewing(null)} className="flex size-10 items-center justify-center rounded-full bg-white/15" aria-label="Close">
                <X size={20} />
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${viewing.id}`} alt="" className="m-auto max-h-[85vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
