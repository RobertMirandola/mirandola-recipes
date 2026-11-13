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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Mirandola Recipes</h1>
      <p className="mt-2 mb-8 text-muted">Enter the password to open your recipes.</p>
      <LoginForm next={next} />
    </main>
  );
}
