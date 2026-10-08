import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const body = await request.json();
  if (typeof body.png !== "string" || !body.png.startsWith("data:image/png;base64,") || body.png.length > 30000000) return new NextResponse(null, { status: 400 });
  const directory = path.join(process.cwd(), "docs/design-references/immersive-portfolio/armi-v015-runtime");
  await mkdir(directory, { recursive: true });
  const stage = String(body.metrics?.shot ?? "");
  const name = /^[a-z]+$/.test(stage) ? `scroll-${stage}` : body.metrics?.shot === "ProductOpening" ? "browser-product" : body.portrait ? "browser-reference" : "browser-desktop";
  await writeFile(path.join(directory, `${name}.png`), Buffer.from(body.png.split(",")[1], "base64"));
  await writeFile(path.join(directory, `${name}-metrics.json`), JSON.stringify(body.metrics, null, 2));
  return NextResponse.json({ saved: name });
}
