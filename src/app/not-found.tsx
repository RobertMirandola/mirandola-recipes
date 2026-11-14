import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-center px-6 sm:px-12">
      <h1 className="text-[32px] leading-tight font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted">That recipe is not in this list.</p>
      <Link href="/" className="mt-4 text-sm text-accent hover:underline">
        Back to recipes
      </Link>
    </main>
  );
}
