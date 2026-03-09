import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const base = process.env.CATALOG_GAS_WEBAPP_URL;
  const key = process.env.CATALOG_ADMIN_KEY;

  if (!base) return NextResponse.json({ ok: false, error: "Missing CAS_WEBAPP_URL" }, { status: 500 });
  if (!key) return NextResponse.json({ ok: false, error: "Missing CATALOG_ADMIN_KEY" }, { status: 500 });

  const body = await req.json();

  const url = `${base}?action=adminUpsertCake&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : 500 });
}
