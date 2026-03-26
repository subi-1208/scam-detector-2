import { NextResponse } from "next/server";

import { getRules, saveRules } from "@/lib/data-store";
import { RuleSet } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function devOnlyResponse() {
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  return NextResponse.json(
    {
      error: "관리자 룰 API는 개발 서버에서만 사용할 수 있습니다. npm run dev 환경에서만 열립니다.",
    },
    { status: 403 },
  );
}

function isValidRuleSet(candidate: unknown): candidate is RuleSet {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const rules = candidate as Partial<RuleSet>;

  return (
    typeof rules.version === "number" &&
    typeof rules.updatedAt === "string" &&
    Array.isArray(rules.categories) &&
    Array.isArray(rules.warningMessages) &&
    Array.isArray(rules.authorityLinks) &&
    Array.isArray(rules.suspiciousTlds) &&
    Array.isArray(rules.trustIndicators) &&
    typeof rules.riskThresholds?.caution === "number" &&
    typeof rules.riskThresholds?.high === "number" &&
    typeof rules.riskThresholds?.critical === "number"
  );
}

export async function GET() {
  const blocked = devOnlyResponse();

  if (blocked) {
    return blocked;
  }

  const rules = await getRules();
  return NextResponse.json({ rules });
}

export async function PUT(request: Request) {
  const blocked = devOnlyResponse();

  if (blocked) {
    return blocked;
  }

  const body = (await request.json()) as { rules?: RuleSet };

  if (!isValidRuleSet(body.rules)) {
    return NextResponse.json({ error: "룰셋 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const cleanedRules: RuleSet = {
    ...body.rules,
    categories: body.rules.categories.map((category) => ({
      ...category,
      patterns: category.patterns.map((pattern) => pattern.trim()).filter(Boolean),
      appliesTo: category.appliesTo.length > 0 ? category.appliesTo : ["both"],
    })),
    warningMessages: body.rules.warningMessages.map((message) => message.trim()).filter(Boolean),
    suspiciousTlds: body.rules.suspiciousTlds.map((tld) => tld.trim().replace(/^\./, "")).filter(Boolean),
    trustIndicators: body.rules.trustIndicators.map((signal) => signal.trim()).filter(Boolean),
    authorityLinks: body.rules.authorityLinks
      .map((link) => ({
        label: link.label.trim(),
        url: link.url.trim(),
      }))
      .filter((link) => link.label && link.url),
  };

  const rules = await saveRules(cleanedRules);

  return NextResponse.json({ rules });
}
