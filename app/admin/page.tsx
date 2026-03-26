import { notFound } from "next/navigation";

import { AdminRulesEditor } from "@/components/admin-rules-editor";

export default function AdminPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="stack-section">
      <section className="panel">
        <p className="eyebrow">Rules Admin</p>
        <h1 className="panel__headline">위험 키워드와 룰셋 수정</h1>
        <p className="muted">
          관리자 기능 MVP입니다. 새로운 사기 문구, 경고 문구, 주의 도메인, 공공기관 링크를 이 화면에서 수정할 수 있습니다.
        </p>
      </section>

      <AdminRulesEditor />
    </div>
  );
}
