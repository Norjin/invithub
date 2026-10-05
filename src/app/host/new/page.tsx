import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/session";
import { createEventAction } from "@/app/actions/events";
import { EventForm } from "@/components/host/event-form";

export const metadata = { title: "New party" };

export default async function NewEventPage() {
  await requireUser("/host/new");
  return (
    <main className="mx-auto max-w-2xl px-5 pt-4 pb-16">
      <Link href="/" className="btn btn-plain -ml-2">
        <ChevronLeft aria-hidden size={20} /> Parties
      </Link>
      <h1 className="large-title mt-2 mb-6">New party</h1>
      <EventForm action={createEventAction} submitLabel="Create party" />
    </main>
  );
}
