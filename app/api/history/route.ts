import { NextResponse } from "next/server";

import { deleteHistoryItem, getHistory } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getHistory();
  return NextResponse.json({ items });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "삭제할 항목 ID가 없습니다." }, { status: 400 });
  }

  const deleted = await deleteHistoryItem(id);

  if (!deleted) {
    return NextResponse.json({ error: "대상을 찾지 못했습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
