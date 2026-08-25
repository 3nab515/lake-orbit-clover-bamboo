export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type IdLocation = "path" | "query" | "json" | "form";

export type IdCandidate = {
  key: string;
  value: string;
  location: IdLocation;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export type ParsedHttpRequest = {
  method: string;
  path: string;
  httpVersion: string;
  headers: Record<string, string>;
  headerOrder: string[];
  body: string;
  host: string;
  scheme: "http" | "https";
  url: string;
  query: Record<string, string>;
  parseWarnings: string[];
};

export type IdentityPack = {
  label: string;
  cookie: string;
  authorization: string;
};

export type ProbeResponse = {
  ok: boolean;
  error?: string;
  status: number | null;
  statusText: string;
  redirected: boolean;
  location: string | null;
  contentType: string;
  body: string;
  bodyTruncated: boolean;
  byteLength: number;
  elapsedMs: number;
  finalUrl: string;
};

export type TestKind =
  | "baseline_a"
  | "baseline_b"
  | "cross_b_reads_a"
  | "cross_a_reads_b"
  | "unauth_reads_a"
  | "unauth_reads_b";

export type TestSpec = {
  kind: TestKind;
  title: string;
  purpose: string;
  identity: "A" | "B" | "none";
  objectOwner: "A" | "B";
};

export type BodyKind =
  | "json_object"
  | "json_other"
  | "empty"
  | "html_login"
  | "html_waf"
  | "html_other"
  | "error_text"
  | "unknown";

export type ClassifiedBody = {
  kind: BodyKind;
  json: JsonValue | null;
  notes: string[];
};

export type PairEvidence = {
  statusMatch: boolean;
  lengthRatio: number;
  tokenJaccard: number;
  jsonKeyJaccard: number;
  sharedSensitiveHits: string[];
  sameObjectHint: boolean;
  differentObjectHint: boolean;
};

export type FindingClass =
  | "confirmed_horizontal_idor"
  | "confirmed_unauthenticated_access"
  | "likely_idor"
  | "protected"
  | "public_or_same_for_everyone"
  | "inconclusive"
  | "transport_error";

export type SuiteVerdict = {
  finding: FindingClass;
  confidence: "high" | "medium" | "low" | "none";
  title: string;
  summary: string;
  why: string[];
  whyNotConfirmed: string[];
  reportable: boolean;
};

export type ExecutedTest = {
  spec: TestSpec;
  requestUrl: string;
  method: string;
  identityUsed: string;
  objectId: string;
  response: ProbeResponse;
  classified: ClassifiedBody;
};

export type SuiteResult = {
  ranAt: string;
  targetHost: string;
  endpoint: {
    method: string;
    urlTemplate: string;
    paramKey: string;
    paramLocation: IdLocation;
    idA: string;
    idB: string;
  };
  tests: ExecutedTest[];
  pairs: {
    name: string;
    left: TestKind;
    right: TestKind;
    evidence: PairEvidence;
  }[];
  verdict: SuiteVerdict;
  curls: { label: string; command: string }[];
  reportMarkdown: string;
  mode: "demo" | "live";
};
