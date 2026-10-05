import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="title-2">This page isn't here</h1>
      <p className="subhead max-w-sm text-label-2">The link may be old, or you may need to sign in with the email or phone you were invited with.</p>
      <Link href="/" className="btn btn-primary mt-2">
        Go home
      </Link>
    </main>
  );
}
