import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { hasSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeReturnPath((await searchParams).next);
  if (await hasSession()) {
    redirect(next);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-6 py-16">
      <div aria-hidden="true" className="mb-2 text-6xl leading-none">
        🍲
      </div>
      <h1 className="text-[32px] leading-tight font-bold tracking-tight">Mirandola Recipes</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Enter the password to open your recipes.</p>
      <LoginForm next={next} />
    </main>
  );
}
