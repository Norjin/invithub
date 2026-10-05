"use client";

import { useRouter } from "next/navigation";

export function CoverRemove({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-plain text-danger"
      onClick={async () => {
        const body = new FormData();
        body.set("remove", "1");
        await fetch(endpoint, { method: "POST", body });
        router.refresh();
      }}
    >
      Remove
    </button>
  );
}
