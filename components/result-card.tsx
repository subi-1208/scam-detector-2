import { AnalysisResult } from "@/lib/types";

const toneMap: Record<AnalysisResult["riskLevel"], "low" | "caution" | "high" | "critical"> = {
  낮음: "low",
  주의: "caution",
  위험: "high",
  "매우 위험": "critical",
};

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function ResultCard({ result }: { result: AnalysisResult }) {
  const tone = toneMap[result.riskLevel];

  return (
    <section className="result-card" data-tone={tone}>
      <div className="result-card__header">
        <div>
          <p className="eyebrow">분석 결과</p>
          <h2 className="result-card__title">{result.riskLevel}</h2>
          <p className="result-card__meta">
            {result.type === "text" ? "텍스트 분석" : "URL 분석"} · {formatDate(result.createdAt)}
          </p>
        </div>
        <div className="score-block">
          <div className="score-block__number">{result.score}</div>
          <p className="score-block__caption">위험 점수 / 100</p>
        </div>
      </div>

      <div className="progress-track">
        <span className="progress-track__fill" style={{ width: `${result.score}%` }} />
      </div>

      <div className="result-grid">
        <article className="panel">
          <h3 className="panel__title">주요 경고 사유</h3>
          <ul className="stack-list">
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3 className="panel__title">세부 위험 요인</h3>
          <div className="factor-list">
            {result.factors.length === 0 ? (
              <p className="muted">강한 위험 신호는 제한적으로 감지됐습니다.</p>
            ) : (
              result.factors.map((factor) => (
                <div key={`${factor.id}-${factor.evidence}`} className="factor-item">
                  <div className="factor-item__row">
                    <strong>{factor.label}</strong>
                    <span>+{factor.score}</span>
                  </div>
                  <p>{factor.evidence}</p>
                  <div className="factor-bar">
                    <span style={{ width: `${Math.min(100, factor.score * 4)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      {result.safeSignals.length > 0 ? (
        <article className="panel">
          <h3 className="panel__title">신뢰 보강 요소</h3>
          <div className="chip-row">
            {result.safeSignals.map((signal) => (
              <span key={signal} className="chip chip--safe">
                {signal}
              </span>
            ))}
          </div>
        </article>
      ) : null}

      {result.urlMetadata ? (
        <article className="panel">
          <h3 className="panel__title">URL 분석 메타정보</h3>
          <div className="meta-grid">
            <div>
              <span className="meta-label">최종 URL</span>
              <p>{result.urlMetadata.finalUrl}</p>
            </div>
            <div>
              <span className="meta-label">호스트</span>
              <p>{result.urlMetadata.hostname}</p>
            </div>
            <div>
              <span className="meta-label">프로토콜</span>
              <p>{result.urlMetadata.protocol}</p>
            </div>
            <div>
              <span className="meta-label">HTTP 상태</span>
              <p>{result.urlMetadata.httpStatus ?? "확인 불가"}</p>
            </div>
            <div>
              <span className="meta-label">접속 상태</span>
              <p>
                {result.urlMetadata.fetchStatus === "success"
                  ? "접속 성공"
                  : result.urlMetadata.fetchStatus === "error"
                    ? `실패: ${result.urlMetadata.fetchError}`
                    : "미수행"}
              </p>
            </div>
            <div>
              <span className="meta-label">도메인 생성 시점</span>
              <p>{result.urlMetadata.domainAgeStatus}</p>
            </div>
          </div>
        </article>
      ) : null}

      <div className="result-grid">
        <article className="panel">
          <h3 className="panel__title">행동 권고</h3>
          <ul className="stack-list">
            {result.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3 className="panel__title">공공기관 안내 링크</h3>
          <div className="link-list">
            {result.authorityLinks.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="text-link">
                {link.label}
              </a>
            ))}
          </div>
          <p className="disclaimer">{result.disclaimer}</p>
        </article>
      </div>
    </section>
  );
}
