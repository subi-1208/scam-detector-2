"use client";

import { useEffect, useState } from "react";

import { RuleCategory, RuleSet } from "@/lib/types";

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(values: string[]): string {
  return values.join("\n");
}

function createCategory(): RuleCategory {
  return {
    id: crypto.randomUUID().slice(0, 8),
    label: "새 룰 카테고리",
    description: "설명을 입력하세요.",
    weight: 10,
    appliesTo: ["both"],
    patterns: [],
  };
}

export function AdminRulesEditor() {
  const [rules, setRules] = useState<RuleSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRules() {
      try {
        const response = await fetch("/api/admin/rules");
        const payload = (await response.json()) as { rules?: RuleSet; error?: string };

        if (!response.ok || !payload.rules) {
          throw new Error(payload.error ?? "룰셋을 불러오지 못했습니다.");
        }

        setRules(payload.rules);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "관리자 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    void loadRules();
  }, []);

  function updateRules(updater: (current: RuleSet) => RuleSet) {
    setRules((current) => (current ? updater(current) : current));
  }

  async function handleSave() {
    if (!rules) {
      return;
    }

    setSaving(true);
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/admin/rules", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ rules }),
      });

      const payload = (await response.json()) as { rules?: RuleSet; error?: string };

      if (!response.ok || !payload.rules) {
        throw new Error(payload.error ?? "룰셋 저장에 실패했습니다.");
      }

      setRules(payload.rules);
      setStatus("룰셋이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h2 className="panel__headline">룰셋 불러오는 중...</h2>
      </section>
    );
  }

  if (!rules) {
    return (
      <section className="panel">
        <h2 className="panel__headline">룰셋을 불러오지 못했습니다.</h2>
        <p className="muted">{error || "잠시 후 다시 시도해 주세요."}</p>
      </section>
    );
  }

  return (
    <section className="stack-section">
      <article className="panel">
        <p className="eyebrow">Admin</p>
        <h2 className="panel__headline">MVP 룰셋 편집기</h2>
        <p className="muted">
          현재 버전은 인증 없이 로컬 파일 기반으로 동작합니다. `data/rules.json`에 저장되며 새 사기 패턴을 바로 반영할 수 있습니다.
        </p>

        {status ? <p className="success-banner">{status}</p> : null}
        {error ? <p className="error-banner">{error}</p> : null}

        <div className="admin-grid">
          <label className="field-group">
            <span>주의 시작 점수</span>
            <input
              className="field"
              type="number"
              value={rules.riskThresholds.caution}
              onChange={(event) =>
                updateRules((current) => ({
                  ...current,
                  riskThresholds: {
                    ...current.riskThresholds,
                    caution: Number(event.target.value),
                  },
                }))
              }
            />
          </label>

          <label className="field-group">
            <span>위험 시작 점수</span>
            <input
              className="field"
              type="number"
              value={rules.riskThresholds.high}
              onChange={(event) =>
                updateRules((current) => ({
                  ...current,
                  riskThresholds: {
                    ...current.riskThresholds,
                    high: Number(event.target.value),
                  },
                }))
              }
            />
          </label>

          <label className="field-group">
            <span>매우 위험 시작 점수</span>
            <input
              className="field"
              type="number"
              value={rules.riskThresholds.critical}
              onChange={(event) =>
                updateRules((current) => ({
                  ...current,
                  riskThresholds: {
                    ...current.riskThresholds,
                    critical: Number(event.target.value),
                  },
                }))
              }
            />
          </label>
        </div>

        <div className="admin-grid admin-grid--single">
          <label className="field-group">
            <span>신뢰 보강 키워드</span>
            <textarea
              className="field field--textarea field--short"
              value={joinLines(rules.trustIndicators)}
              onChange={(event) =>
                updateRules((current) => ({
                  ...current,
                  trustIndicators: splitLines(event.target.value),
                }))
              }
            />
          </label>

          <label className="field-group">
            <span>주의 TLD</span>
            <textarea
              className="field field--textarea field--short"
              value={joinLines(rules.suspiciousTlds)}
              onChange={(event) =>
                updateRules((current) => ({
                  ...current,
                  suspiciousTlds: splitLines(event.target.value),
                }))
              }
            />
          </label>

          <label className="field-group">
            <span>경고 문구</span>
            <textarea
              className="field field--textarea field--short"
              value={joinLines(rules.warningMessages)}
              onChange={(event) =>
                updateRules((current) => ({
                  ...current,
                  warningMessages: splitLines(event.target.value),
                }))
              }
            />
          </label>
        </div>
      </article>

      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Authority Links</p>
            <h3 className="panel__title">공공기관 안내 링크</h3>
          </div>
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              updateRules((current) => ({
                ...current,
                authorityLinks: [...current.authorityLinks, { label: "새 링크", url: "https://" }],
              }))
            }
          >
            링크 추가
          </button>
        </div>

        <div className="stack-section">
          {rules.authorityLinks.map((link, index) => (
            <div key={`${link.label}-${index}`} className="admin-link-row">
              <input
                className="field"
                value={link.label}
                onChange={(event) =>
                  updateRules((current) => ({
                    ...current,
                    authorityLinks: current.authorityLinks.map((currentLink, linkIndex) =>
                      linkIndex === index ? { ...currentLink, label: event.target.value } : currentLink,
                    ),
                  }))
                }
              />
              <input
                className="field"
                value={link.url}
                onChange={(event) =>
                  updateRules((current) => ({
                    ...current,
                    authorityLinks: current.authorityLinks.map((currentLink, linkIndex) =>
                      linkIndex === index ? { ...currentLink, url: event.target.value } : currentLink,
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="button button--ghost"
                onClick={() =>
                  updateRules((current) => ({
                    ...current,
                    authorityLinks: current.authorityLinks.filter((_, linkIndex) => linkIndex !== index),
                  }))
                }
              >
                제거
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Categories</p>
            <h3 className="panel__title">위험 룰 카테고리</h3>
          </div>
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              updateRules((current) => ({
                ...current,
                categories: [...current.categories, createCategory()],
              }))
            }
          >
            카테고리 추가
          </button>
        </div>

        <div className="stack-section">
          {rules.categories.map((category, index) => (
            <article key={category.id} className="rule-card">
              <div className="rule-card__header">
                <h4>{category.label}</h4>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() =>
                    updateRules((current) => ({
                      ...current,
                      categories: current.categories.filter((_, categoryIndex) => categoryIndex !== index),
                    }))
                  }
                >
                  삭제
                </button>
              </div>

              <div className="admin-grid">
                <label className="field-group">
                  <span>ID</span>
                  <input
                    className="field"
                    value={category.id}
                    onChange={(event) =>
                      updateRules((current) => ({
                        ...current,
                        categories: current.categories.map((currentCategory, categoryIndex) =>
                          categoryIndex === index ? { ...currentCategory, id: event.target.value } : currentCategory,
                        ),
                      }))
                    }
                  />
                </label>

                <label className="field-group">
                  <span>라벨</span>
                  <input
                    className="field"
                    value={category.label}
                    onChange={(event) =>
                      updateRules((current) => ({
                        ...current,
                        categories: current.categories.map((currentCategory, categoryIndex) =>
                          categoryIndex === index ? { ...currentCategory, label: event.target.value } : currentCategory,
                        ),
                      }))
                    }
                  />
                </label>

                <label className="field-group">
                  <span>가중치</span>
                  <input
                    className="field"
                    type="number"
                    value={category.weight}
                    onChange={(event) =>
                      updateRules((current) => ({
                        ...current,
                        categories: current.categories.map((currentCategory, categoryIndex) =>
                          categoryIndex === index
                            ? { ...currentCategory, weight: Number(event.target.value) }
                            : currentCategory,
                        ),
                      }))
                    }
                  />
                </label>
              </div>

              <label className="field-group">
                <span>설명</span>
                <input
                  className="field"
                  value={category.description}
                  onChange={(event) =>
                    updateRules((current) => ({
                      ...current,
                      categories: current.categories.map((currentCategory, categoryIndex) =>
                        categoryIndex === index ? { ...currentCategory, description: event.target.value } : currentCategory,
                      ),
                    }))
                  }
                />
              </label>

              <div className="checkbox-row">
                {(["text", "url", "both"] as const).map((scope) => {
                  const checked = category.appliesTo.includes(scope);

                  return (
                    <label key={scope} className="checkbox-pill">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          updateRules((current) => ({
                            ...current,
                            categories: current.categories.map((currentCategory, categoryIndex) => {
                              if (categoryIndex !== index) {
                                return currentCategory;
                              }

                              const appliesTo = event.target.checked
                                ? [...currentCategory.appliesTo, scope]
                                : currentCategory.appliesTo.filter((value) => value !== scope);

                              return {
                                ...currentCategory,
                                appliesTo: appliesTo.length > 0 ? Array.from(new Set(appliesTo)) : ["both"],
                              };
                            }),
                          }))
                        }
                      />
                      <span>{scope}</span>
                    </label>
                  );
                })}
              </div>

              <label className="field-group">
                <span>패턴 목록</span>
                <textarea
                  className="field field--textarea"
                  value={joinLines(category.patterns)}
                  onChange={(event) =>
                    updateRules((current) => ({
                      ...current,
                      categories: current.categories.map((currentCategory, categoryIndex) =>
                        categoryIndex === index ? { ...currentCategory, patterns: splitLines(event.target.value) } : currentCategory,
                      ),
                    }))
                  }
                />
              </label>
            </article>
          ))}
        </div>
      </article>

      <div className="cta-row">
        <button type="button" className="button button--primary" disabled={saving} onClick={handleSave}>
          {saving ? "저장 중..." : "룰셋 저장"}
        </button>
      </div>
    </section>
  );
}
