import { AnalysisFactor, AnalysisInputType, AnalysisResult, RiskLevel, RuleCategory, RuleSet, UrlAnalysisMetadata } from "@/lib/types";
import { toPreview } from "@/lib/masking";

const disclaimer = "본 결과는 법적 확정 판정이 아닌 참고용 위험도 예측입니다.";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function createFactor(
  id: string,
  label: string,
  score: number,
  evidence: string,
  matches: string[],
  kind: AnalysisFactor["kind"],
): AnalysisFactor {
  return {
    id,
    label,
    score,
    evidence,
    matches: unique(matches).slice(0, 5),
    kind,
  };
}

function ruleApplies(category: RuleCategory, type: AnalysisInputType): boolean {
  return category.appliesTo.includes(type) || category.appliesTo.includes("both");
}

function collectRuleFactors(content: string, type: AnalysisInputType, rules: RuleSet): AnalysisFactor[] {
  const normalized = normalizeText(content);

  return rules.categories
    .filter((category) => ruleApplies(category, type))
    .map((category) => {
      const matches = category.patterns.filter((pattern) => normalized.includes(pattern.toLowerCase()));

      if (matches.length === 0) {
        return null;
      }

      const score = clamp(Math.round(category.weight * Math.min(1.3, 0.72 + matches.length * 0.18)), 6, 24);

      return createFactor(
        category.id,
        category.label,
        score,
        `${category.description} 일치 표현: ${unique(matches).slice(0, 3).join(", ")}.`,
        matches,
        "rule",
      );
    })
    .filter((factor): factor is AnalysisFactor => factor !== null);
}

function detectTrustSignals(content: string, rules: RuleSet): string[] {
  const normalized = normalizeText(content);

  return unique(rules.trustIndicators.filter((signal) => normalized.includes(signal.toLowerCase())));
}

function detectSalaryOutlier(content: string): AnalysisFactor | null {
  const salaryPatterns = [...content.matchAll(/(월|주|일|연)\s*([\d,]{2,6})\s*(만원|원|달러|usd|\$)/gi)];

  for (const match of salaryPatterns) {
    const period = match[1];
    const amount = Number(match[2].replaceAll(",", ""));
    const unit = match[3].toLowerCase();

    if (Number.isNaN(amount)) {
      continue;
    }

    if (period === "월" && unit === "만원" && amount >= 500) {
      return createFactor(
        "salary_outlier",
        "급여 수치 이상치",
        14,
        `업무 설명 대비 월 ${amount.toLocaleString()}만원 제안은 추가 검증이 필요합니다.`,
        [match[0]],
        "heuristic",
      );
    }

    if (period === "일" && unit === "만원" && amount >= 20) {
      return createFactor(
        "daily_pay_outlier",
        "일당 과장 신호",
        16,
        `단기 제안에서 일 ${amount.toLocaleString()}만원 수준의 보수를 내세웁니다.`,
        [match[0]],
        "heuristic",
      );
    }

    if ((unit === "달러" || unit === "usd" || unit === "$") && amount >= 3000) {
      return createFactor(
        "usd_salary_outlier",
        "해외 급여 과장 신호",
        12,
        `고액 달러 보수를 전면에 내세우고 있습니다.`,
        [match[0]],
        "heuristic",
      );
    }
  }

  return null;
}

function collectTextHeuristics(content: string, rules: RuleSet): { factors: AnalysisFactor[]; safeSignals: string[]; trustReduction: number } {
  const normalized = normalizeText(content);
  const factors: AnalysisFactor[] = [];
  const safeSignals = detectTrustSignals(content, rules);

  const salaryFactor = detectSalaryOutlier(content);

  if (salaryFactor) {
    factors.push(salaryFactor);
  }

  const hasCompanyInfo = /(사업자등록번호|회사소개|corporate|about us|주소|대표번호|contact|homepage|공식 홈페이지)/i.test(content);
  if (!hasCompanyInfo) {
    factors.push(
      createFactor(
        "missing_company_info",
        "회사 실체 정보 부족",
        12,
        "회사명, 사업자 정보, 주소 같은 신뢰 요소가 충분히 드러나지 않습니다.",
        [],
        "heuristic",
      ),
    );
  }

  const messengerOnly =
    /(telegram|텔레그램|whatsapp|왓츠앱|line|라인|오픈채팅|kakaotalk|카카오톡)/i.test(normalized) &&
    !/(지원서|채용 페이지|careers|apply|이메일|email|official|homepage|recruitment process)/i.test(normalized);

  if (messengerOnly) {
    factors.push(
      createFactor(
        "messenger_only_flow",
        "공식 절차 없는 메신저 흐름",
        12,
        "정식 지원 경로보다 메신저 대화를 중심으로 진행하려는 흔적이 보입니다.",
        [],
        "heuristic",
      ),
    );
  }

  const contentTooShort = content.replace(/\s+/g, "").length < 80;
  if (contentTooShort) {
    factors.push(
      createFactor(
        "thin_information",
        "정보 밀도 부족",
        8,
        "공고 길이가 짧고 구체적인 직무·회사 정보가 부족합니다.",
        [],
        "heuristic",
      ),
    );
  }

  const trustReduction = Math.min(14, safeSignals.length * 3);

  return {
    factors,
    safeSignals,
    trustReduction,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (!match) {
    return null;
  }

  return stripHtml(match[1]).slice(0, 120) || null;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

async function fetchUrlSnapshot(url: string): Promise<
  | {
      ok: true;
      html: string;
      text: string;
      finalUrl: string;
      status: number;
      title: string | null;
      contentType: string;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent": "JobScamDetector/0.1",
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    const html = raw.slice(0, 150_000);

    return {
      ok: true,
      html,
      text: stripHtml(html),
      finalUrl: response.url,
      status: response.status,
      title: extractTitle(html),
      contentType,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "페이지 응답 시간이 길어 분석 제한 시간(8초)을 초과했습니다.",
      };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "페이지 접근 중 알 수 없는 오류가 발생했습니다.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function scoreToRiskLevel(score: number, rules: RuleSet): RiskLevel {
  if (score >= rules.riskThresholds.critical) {
    return "매우 위험";
  }

  if (score >= rules.riskThresholds.high) {
    return "위험";
  }

  if (score >= rules.riskThresholds.caution) {
    return "주의";
  }

  return "낮음";
}

function buildReasons(type: AnalysisInputType, factors: AnalysisFactor[]): string[] {
  const ranked = [...factors]
    .sort((left, right) => right.score - left.score)
    .map((factor) => factor.evidence);

  const fallbacks =
    type === "url"
      ? [
          "도메인·페이지 신뢰 요소를 공식 채널과 교차 확인해 보세요.",
          "URL 분석은 접속 가능한 공개 정보 범위 안에서 이뤄집니다.",
          disclaimer,
        ]
      : [
          "정식 채용 절차, 회사 실체, 업무 범위를 교차 확인해 보세요.",
          "해외 취업 제안은 특히 가족·지인과 함께 검토하는 편이 안전합니다.",
          disclaimer,
        ];

  return unique([...ranked, ...fallbacks]).slice(0, Math.max(3, ranked.length));
}

function buildRecommendations(factors: AnalysisFactor[], rules: RuleSet): string[] {
  const ids = new Set(factors.map((factor) => factor.id));
  const recommendations = [...rules.warningMessages];

  if (ids.has("payment_request")) {
    recommendations.push("등록비, 교육비, 보증금 명목의 입금 요구는 즉시 중단하세요.");
  }

  if (ids.has("identity_documents")) {
    recommendations.push("여권·신분증 파일을 보내기 전에는 기업 실체와 채용 담당자를 먼저 확인하세요.");
  }

  if (ids.has("cambodia_pattern")) {
    recommendations.push("해외 이동이 결합된 제안이면 가족에게 일정과 제안 원문을 공유하고 공관 안내를 확인하세요.");
  }

  return unique(recommendations).slice(0, 6);
}

function buildResult(params: {
  type: AnalysisInputType;
  input: string;
  factors: AnalysisFactor[];
  safeSignals: string[];
  trustReduction: number;
  rules: RuleSet;
  urlMetadata?: UrlAnalysisMetadata;
}): AnalysisResult {
  const sortedFactors = [...params.factors].sort((left, right) => right.score - left.score);
  const rawScore = sortedFactors.reduce((sum, factor) => sum + factor.score, 0);
  const score = clamp(Math.round(rawScore - params.trustReduction), 0, 100);
  const riskLevel = scoreToRiskLevel(score, params.rules);

  return {
    id: crypto.randomUUID(),
    type: params.type,
    inputPreview: toPreview(params.input, params.type === "url" ? 140 : 180),
    rawLength: params.input.length,
    score,
    probability: score,
    riskLevel,
    reasons: buildReasons(params.type, sortedFactors),
    factors: sortedFactors,
    recommendations: buildRecommendations(sortedFactors, params.rules),
    authorityLinks: params.rules.authorityLinks,
    safeSignals: unique(params.safeSignals).slice(0, 6),
    disclaimer,
    createdAt: new Date().toISOString(),
    urlMetadata: params.urlMetadata,
  };
}

export async function analyzeTextInput(input: string, rules: RuleSet): Promise<AnalysisResult> {
  const ruleFactors = collectRuleFactors(input, "text", rules);
  const heuristicResult = collectTextHeuristics(input, rules);

  return buildResult({
    type: "text",
    input,
    factors: [...ruleFactors, ...heuristicResult.factors],
    safeSignals: heuristicResult.safeSignals,
    trustReduction: heuristicResult.trustReduction,
    rules,
  });
}

export async function analyzeUrlInput(input: string, rules: RuleSet): Promise<AnalysisResult> {
  const parsedUrl = new URL(input);
  const hostname = parsedUrl.hostname.toLowerCase();
  const tld = hostname.split(".").pop() ?? "";
  const suspiciousTld = rules.suspiciousTlds.includes(tld);

  const factors: AnalysisFactor[] = [];
  const safeSignals: string[] = [];
  let trustReduction = 0;

  if (parsedUrl.protocol !== "https:") {
    factors.push(
      createFactor(
        "no_https",
        "HTTPS 미적용",
        12,
        "HTTPS가 아닌 주소라 전송 신뢰도가 낮습니다.",
        [parsedUrl.protocol],
        "metadata",
      ),
    );
  } else {
    safeSignals.push("HTTPS 적용");
    trustReduction += 4;
  }

  if (suspiciousTld) {
    factors.push(
      createFactor(
        "suspicious_tld",
        "주의 TLD 사용",
        8,
        `신뢰 검증이 필요한 최상위 도메인(.${tld})을 사용합니다.`,
        [tld],
        "metadata",
      ),
    );
  }

  if (hostname.includes("xn--")) {
    factors.push(
      createFactor(
        "punycode_hostname",
        "도메인 위장 가능성",
        10,
        "Punycode 형태의 호스트명이어서 유사 도메인 위장 여부를 확인할 필요가 있습니다.",
        [hostname],
        "metadata",
      ),
    );
  }

  if ((hostname.match(/-/g)?.length ?? 0) >= 2 || /\d{4,}/.test(hostname)) {
    factors.push(
      createFactor(
        "irregular_hostname",
        "비정상적 호스트 구조",
        7,
        "하이픈·숫자가 많은 호스트명은 임시성 사이트에서 자주 보입니다.",
        [hostname],
        "metadata",
      ),
    );
  }

  const snapshot = await fetchUrlSnapshot(input);

  let urlMetadata: UrlAnalysisMetadata = {
    finalUrl: input,
    hostname,
    protocol: parsedUrl.protocol,
    httpStatus: null,
    fetchStatus: "skipped",
    fetchError: null,
    hasHttps: parsedUrl.protocol === "https:",
    pageTitle: null,
    hasContactInfo: false,
    hasCompanyProfile: false,
    hasMessengerLink: false,
    hasAggressiveApplyCopy: false,
    suspiciousTld,
    domainAgeStatus: "MVP에서는 WHOIS/RDAP 연동 전이라 도메인 생성 시점은 별도 확인이 필요합니다.",
  };

  if (!snapshot.ok) {
    factors.push(
      createFactor(
        "fetch_failed",
        "URL 접근 실패",
        8,
        `페이지 접근에 실패했습니다: ${snapshot.error}`,
        [],
        "metadata",
      ),
    );

    urlMetadata = {
      ...urlMetadata,
      fetchStatus: "error",
      fetchError: snapshot.error,
    };
  } else {
    const pageText = snapshot.text;
    const contactPatterns = [/\bcontact\b/i, /문의/i, /주소/i, /대표번호/i, /@/, /\+?\d[\d\s-]{7,}\d/];
    const companyPatterns = [/\babout us\b/i, /회사소개/i, /corporate/i, /사업자등록번호/i, /privacy policy/i, /terms/i];
    const messengerPatterns = [/t\.me/i, /telegram/i, /whatsapp/i, /wa\.me/i, /line\.me/i, /오픈채팅/i];
    const aggressivePatterns = [/apply now/i, /urgent application/i, /지금 지원/i, /당장 연락/i, /마감 임박/i];

    const hasContactInfo = matchesAny(pageText, contactPatterns);
    const hasCompanyProfile = matchesAny(pageText, companyPatterns);
    const hasMessengerLink = matchesAny(snapshot.html, messengerPatterns);
    const hasAggressiveApplyCopy = matchesAny(pageText, aggressivePatterns);

    if (snapshot.status >= 400) {
      factors.push(
        createFactor(
          "http_error",
          "페이지 응답 오류",
          9,
          `페이지가 HTTP ${snapshot.status} 응답을 반환했습니다.`,
          [String(snapshot.status)],
          "metadata",
        ),
      );
    }

    if (!snapshot.contentType.toLowerCase().includes("text/html")) {
      factors.push(
        createFactor(
          "non_html_content",
          "HTML 외 콘텐츠",
          6,
          "HTML 페이지가 아니어서 본문 분석 범위가 제한됩니다.",
          [snapshot.contentType],
          "metadata",
        ),
      );
    }

    if (!hasContactInfo) {
      factors.push(
        createFactor(
          "missing_contact_info",
          "연락처 부족",
          12,
          "페이지에서 주소·대표번호·문의 수단 같은 기본 연락 정보를 찾기 어렵습니다.",
          [],
          "heuristic",
        ),
      );
    } else {
      safeSignals.push("연락처 표시");
      trustReduction += 4;
    }

    if (!hasCompanyProfile) {
      factors.push(
        createFactor(
          "missing_company_profile",
          "회사 소개 정보 부족",
          12,
          "회사 소개, 운영 주체, 약관·개인정보처리방침 같은 기본 신뢰 요소가 부족합니다.",
          [],
          "heuristic",
        ),
      );
    } else {
      safeSignals.push("회사 소개 정보 노출");
      trustReduction += 4;
    }

    if (hasMessengerLink) {
      factors.push(
        createFactor(
          "messenger_link_on_page",
          "메신저 중심 지원 흐름",
          14,
          "페이지 내부에 텔레그램·왓츠앱 등 메신저 연결 흔적이 보입니다.",
          [],
          "heuristic",
        ),
      );
    }

    if (hasAggressiveApplyCopy) {
      factors.push(
        createFactor(
          "aggressive_apply_copy",
          "공격적 지원 유도 문구",
          9,
          "검증보다 빠른 지원과 개인 연락을 재촉하는 문구가 보입니다.",
          [],
          "heuristic",
        ),
      );
    }

    if (pageText.replace(/\s+/g, "").length < 220) {
      factors.push(
        createFactor(
          "thin_page_information",
          "페이지 정보량 부족",
          8,
          "채용 페이지 본문이 짧고 검증 가능한 정보가 충분하지 않습니다.",
          [],
          "heuristic",
        ),
      );
    }

    const pageRuleFactors = collectRuleFactors(pageText, "url", rules).map((factor) => ({
      ...factor,
      score: clamp(Math.round(factor.score * 0.88), 5, 22),
    }));

    const pageTrustSignals = detectTrustSignals(pageText, rules);
    safeSignals.push(...pageTrustSignals);
    trustReduction += Math.min(8, pageTrustSignals.length * 2);
    factors.push(...pageRuleFactors);

    urlMetadata = {
      ...urlMetadata,
      finalUrl: snapshot.finalUrl,
      httpStatus: snapshot.status,
      fetchStatus: "success",
      pageTitle: snapshot.title,
      hasContactInfo,
      hasCompanyProfile,
      hasMessengerLink,
      hasAggressiveApplyCopy,
    };
  }

  return buildResult({
    type: "url",
    input,
    factors,
    safeSignals,
    trustReduction,
    rules,
    urlMetadata,
  });
}
