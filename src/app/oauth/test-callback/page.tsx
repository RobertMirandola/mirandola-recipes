import type { Metadata } from "next";

export const metadata: Metadata = { title: "OAuth test callback" };

/** Shows the code a local OAuth client was sent. Used while testing the flow. */
export default async function TestCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shown = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  return (
    <main className="mx-auto max-w-[720px] px-6 py-16 sm:px-12">
      <h1 className="text-[32px] leading-tight font-bold tracking-tight">OAuth test callback</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Local testing only. The authorization server sent the browser here.
      </p>
      <dl className="space-y-3 break-all">
        {Object.entries(shown).map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs text-muted">{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
