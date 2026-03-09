import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.CATALOG_GAS_WEBAPP_URL;
  if (!base) {
    return NextResponse.json({ ok: false, error: "Missing CATALOG_GAS_WEBAPP_URL" }, { status: 500 });
  }

  const url = `${base}?action=getCatalog`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  return NextResponse.json(data, { status: res.ok ? 200 : 500 });
}
