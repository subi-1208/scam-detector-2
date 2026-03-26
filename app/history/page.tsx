import { HistoryList } from "@/components/history-list";
import { getHistory } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const items = await getHistory();

  return (
    <div className="stack-section">
      <section className="panel">
        <p className="eyebrow">History</p>
        <h1 className="panel__headline">저장된 분석 결과</h1>
        <p className="muted">
          현재 MVP는 로그인 없이 단일 로컬 사용자 기준으로 결과를 저장합니다. 저장 항목은 입력 유형, 요약, 분석 시각, 위험
          점수, 근거입니다.
        </p>
      </section>

      <HistoryList initialItems={items} />
    </div>
  );
}
