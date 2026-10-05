import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { SignInForm } from "@/components/auth/sign-in-form";
import { currentUser } from "@/server/session";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const { next } = await searchParams;
  const dest = typeof next === "string" ? next : "/";
  if (await currentUser()) redirect(dest);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <Brand />
        <h1 className="title-2 mt-6">Sign in</h1>
        <p className="subhead mt-1 text-label-2">Use the email or phone number your host invited.</p>
      </div>
      <div className="card p-5">
        <SignInForm next={dest} />
      </div>
    </main>
  );
}
