"use client";

import { useState } from "react";

import { AnalysisResult } from "@/lib/types";

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function HistoryList({ initialItems }: { initialItems: AnalysisResult[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function removeItem(id: string) {
    setPendingId(id);
    setError("");

    try {
      const response = await fetch(`/api/history?id=${id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "이력 삭제에 실패했습니다.");
      }

      setItems((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <section className="panel">
        <h2 className="panel__headline">저장된 분석 이력이 없습니다.</h2>
        <p className="muted">메인 화면에서 분석을 실행하면 결과가 여기에 저장됩니다.</p>
      </section>
    );
  }

  return (
    <section className="stack-section">
      {error ? <p className="error-banner">{error}</p> : null}
      <div className="history-grid">
        {items.map((item) => (
          <article key={item.id} className="history-card">
            <div className="history-card__header">
              <span className="chip">{item.type === "text" ? "텍스트" : "URL"}</span>
              <span className="history-score" data-tone={item.riskLevel}>
                {item.score}점 · {item.riskLevel}
              </span>
            </div>
            <h3 className="history-card__title">{item.inputPreview}</h3>
            <p className="history-card__meta">{formatDate(item.createdAt)}</p>
            <ul className="stack-list stack-list--compact">
              {item.reasons.slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <button
              type="button"
              className="button button--secondary"
              disabled={pendingId === item.id}
              onClick={() => removeItem(item.id)}
            >
              {pendingId === item.id ? "삭제 중..." : "삭제"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
