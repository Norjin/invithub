import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronLeft, LogOut } from "lucide-react";
import { requireUser } from "@/server/session";
import { signOutAction, updateNameAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Section } from "@/components/ui/section";
import { ThemePicker, type ThemeChoice } from "@/components/ui/theme-picker";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const raw = (await cookies()).get("ih_theme")?.value;
  const theme: ThemeChoice = raw === "light" || raw === "dark" ? raw : "system";
  return (
    <main className="mx-auto max-w-lg px-5 pt-4 pb-16">
      <Link href="/" className="btn btn-plain -ml-2">
        <ChevronLeft aria-hidden size={20} /> Parties
      </Link>
      <h1 className="large-title mt-2 mb-6">Account</h1>
      <div className="space-y-8">
        <Section title="Profile" padded footer={`You sign in and get updates by ${user.channel === "email" ? "email" : "text message"} at ${user.contact}.`}>
          <ActionForm action={updateNameAction} className="flex gap-2">
            <label htmlFor="name" className="sr-only">
              Name
            </label>
            <input id="name" name="name" defaultValue={user.name} className="field" maxLength={80} required />
            <SubmitButton className="btn btn-secondary">Save</SubmitButton>
          </ActionForm>
        </Section>
        <Section title="Appearance" padded footer="Automatic follows your device's light or dark setting.">
          <ThemePicker initial={theme} />
        </Section>
        <form action={signOutAction}>
          <button className="btn btn-danger w-full">
            <LogOut aria-hidden size={18} /> Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
