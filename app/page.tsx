import { AnalyzerClient } from "@/components/analyzer-client";

export default function HomePage() {
  return (
    <div className="stack-section">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Job Scam Detector</p>
          <h1>가짜 취업 제안의 위험 신호를 점수와 근거로 보여주는 분석 웹서비스</h1>
          <p className="hero__lead">
            텍스트와 URL을 각각 분석해 고수익 미끼, 메신저 유도, 회사 정보 부족, 동남아 연계 감금형 스캠 패턴 같은 요소를
            정리합니다. 결과는 참고용 예측이며, 왜 위험해 보이는지 설명하는 데 초점을 둡니다.
          </p>
        </div>

        <div className="hero__cards">
          <article className="info-card">
            <span className="info-card__index">01</span>
            <h2>탐지 범위</h2>
            <p>해외 고수익 제안, 메신저 기반 채용, 회사 실체 불명 공고, 캄보디아 연계 취업사기 유사 패턴</p>
          </article>
          <article className="info-card">
            <span className="info-card__index">02</span>
            <h2>출력 방식</h2>
            <p>0~100점 위험 점수, 등급, 세부 위험 요인, 행동 권고, 공공기관 링크를 함께 제공합니다.</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Analyze</p>
        <h2 className="panel__headline">텍스트 또는 URL을 입력해 보세요</h2>
        <p className="muted">
          고위험으로 나와도 법적 확정 판정은 아닙니다. 반대로 낮게 나와도 실제 사기를 완전히 배제하지는 못하므로, 항상 공식
          채널과 교차 확인해 주세요.
        </p>
      </section>

      <AnalyzerClient />
    </div>
  );
}
