import { NextResponse } from "next/server";

import { analyzeTextInput, analyzeUrlInput } from "@/lib/analyzer";
import { getRules, saveHistoryItem } from "@/lib/data-store";
import { AnalysisInputType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidType(value: unknown): value is AnalysisInputType {
  return value === "text" || value === "url";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: AnalysisInputType;
      content?: string;
    };

    if (!isValidType(body.type)) {
      return NextResponse.json({ error: "입력 유형이 올바르지 않습니다." }, { status: 400 });
    }

    if (typeof body.content !== "string" || body.content.trim().length === 0) {
      return NextResponse.json({ error: "분석할 텍스트 또는 URL을 입력해 주세요." }, { status: 400 });
    }

    const content = body.content.trim();

    if (body.type === "url") {
      try {
        new URL(content);
      } catch {
        return NextResponse.json({ error: "올바른 URL 형식을 입력해 주세요." }, { status: 400 });
      }
    }

    const rules = await getRules();
    const result = body.type === "text" ? await analyzeTextInput(content, rules) : await analyzeUrlInput(content, rules);

    await saveHistoryItem(result).catch((error) => {
      // Vercel read-only 환경에서 쓰기 실패 시 분석 자체는 정상 반환
      console.warn("saveHistoryItem failed (readonly fallback active):", error);
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "분석 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
