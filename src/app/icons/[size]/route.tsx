import { appIcon } from "@/lib/app-icon";

const SIZES = new Set(["192", "512"]);

export function generateStaticParams() {
  return [...SIZES].map((size) => ({ size }));
}

/** PNG icons named by the web app manifest. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
): Promise<Response> {
  const { size } = await params;
  if (!SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }
  return appIcon(Number(size));
}
