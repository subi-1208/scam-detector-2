export type AnalysisInputType = "text" | "url";

export type RiskLevel = "낮음" | "주의" | "위험" | "매우 위험";

export type FactorKind = "rule" | "heuristic" | "metadata";

export interface AuthorityLink {
  label: string;
  url: string;
}

export interface RuleCategory {
  id: string;
  label: string;
  description: string;
  weight: number;
  appliesTo: Array<AnalysisInputType | "both">;
  patterns: string[];
}

export interface RuleSet {
  version: number;
  updatedAt: string;
  riskThresholds: {
    caution: number;
    high: number;
    critical: number;
  };
  suspiciousTlds: string[];
  trustIndicators: string[];
  authorityLinks: AuthorityLink[];
  warningMessages: string[];
  categories: RuleCategory[];
}

export interface AnalysisFactor {
  id: string;
  label: string;
  score: number;
  evidence: string;
  matches: string[];
  kind: FactorKind;
}

export interface UrlAnalysisMetadata {
  finalUrl: string;
  hostname: string;
  protocol: string;
  httpStatus: number | null;
  fetchStatus: "success" | "error" | "skipped";
  fetchError: string | null;
  hasHttps: boolean;
  pageTitle: string | null;
  hasContactInfo: boolean;
  hasCompanyProfile: boolean;
  hasMessengerLink: boolean;
  hasAggressiveApplyCopy: boolean;
  suspiciousTld: boolean;
  domainAgeStatus: string;
}

export interface AnalysisResult {
  id: string;
  type: AnalysisInputType;
  inputPreview: string;
  rawLength: number;
  score: number;
  probability: number;
  riskLevel: RiskLevel;
  reasons: string[];
  factors: AnalysisFactor[];
  recommendations: string[];
  authorityLinks: AuthorityLink[];
  safeSignals: string[];
  disclaimer: string;
  createdAt: string;
  urlMetadata?: UrlAnalysisMetadata;
}
