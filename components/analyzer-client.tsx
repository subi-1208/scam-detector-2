"use client";

import { useRef, useState } from "react";

import { ResultCard } from "@/components/result-card";
import { AnalysisInputType, AnalysisResult } from "@/lib/types";

const samples: Record<AnalysisInputType, string[]> = {
  text: [
    "캄보디아 온라인 고객센터 채용, 월 700만원 이상 보장, 숙소 및 항공권 제공, 자세한 내용은 텔레그램으로 문의",
    "초보자 가능, 간단한 업무, 당장 출국 가능하신 분만 연락주세요. 등록비 입금 후 면접 일정 안내",
    "해외 부업 제안입니다. 여권 사본과 연락처를 먼저 보내주시면 빠르게 진행해드립니다.",
  ],
  url: [
    "https://example.com/jobs",
    "http://urgent-hiring-vip.site/apply-now",
    "https://careers.example.org/remote-support",
  ],
};

const modeDescriptions: Record<AnalysisInputType, string> = {
  text: "채용 공고, 메신저 대화, 문자, 이메일 원문을 붙여 넣어 위험 신호를 검사합니다.",
  url: "채용 사이트 또는 지원 페이지 주소를 넣으면 공개 페이지 구조와 문구를 함께 점검합니다.",
};

export function AnalyzerClient() {
  const [mode, setMode] = useState<AnalysisInputType>("text");
  const [content, setContent] = useState(samples.text[0]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: mode,
          content,
        }),
      });

      const payload = (await response.json()) as { result?: AnalysisResult; error?: string };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "분석 요청을 처리하지 못했습니다.");
      }

      setResult(payload.result);

      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function applySample(sample: string) {
    setContent(sample);
    setError("");
  }

  function switchMode(nextMode: AnalysisInputType) {
    setMode(nextMode);
    setContent(samples[nextMode][0]);
    setError("");
  }

  return (
    <div className="analyzer-shell">
      <div className="tabs" role="tablist" aria-label="분석 입력 유형">
        <button type="button" className="tab" data-active={mode === "text"} onClick={() => switchMode("text")}>
          텍스트 분석
        </button>
        <button type="button" className="tab" data-active={mode === "url"} onClick={() => switchMode("url")}>
          URL 분석
        </button>
      </div>

      <form className="analyzer-form" onSubmit={handleSubmit}>
        <div className="panel">
          <p className="eyebrow">{mode === "text" ? "Text Mode" : "URL Mode"}</p>
          <h2 className="panel__headline">{mode === "text" ? "수상한 제안 문구를 붙여 넣으세요" : "채용 사이트 주소를 입력하세요"}</h2>
          <p className="muted">{modeDescriptions[mode]}</p>

          <div className="sample-row">
            {samples[mode].map((sample) => (
              <button key={sample} type="button" className="sample-chip" onClick={() => applySample(sample)}>
                샘플 불러오기
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <textarea
              className="field field--textarea"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="채용 공고, 메신저 대화, 이메일 원문을 그대로 붙여 넣어 주세요."
            />
          ) : (
            <input
              className="field"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="https://example.com/jobs"
              inputMode="url"
            />
          )}

          <div className="cta-row">
            <button type="submit" className="button button--primary" disabled={isSubmitting}>
              {isSubmitting ? "분석 중..." : mode === "text" ? "텍스트 분석하기" : "URL 분석하기"}
            </button>
            <p className="muted">
              {mode === "text" ? "목표 응답 시간 3초 이내" : "공개 페이지 접근 여부에 따라 5~10초 정도 걸릴 수 있습니다."}
            </p>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}
        </div>
      </form>

      <div ref={resultRef}>{result ? <ResultCard result={result} /> : null}</div>
    </div>
  );
}
