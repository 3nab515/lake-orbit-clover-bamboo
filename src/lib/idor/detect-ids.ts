import type { IdCandidate, ParsedHttpRequest } from "./types";

const HIGH_KEYS =
  /^(id|user_?id|account_?id|order_?id|customer_?id|org_?id|document_?id|file_?id|case_?id|ticket_?id|student_?id|profile_?id|resource_?id|object_?id|entity_?id|record_?id|uuid|uid|pk)$/i;

const MEDIUM_KEYS =
  /(id|uuid|guid|number|no|code|ref|key)$/i;

const SKIP_KEYS =
  /^(csrf|xsrf|token|session|sess|jwt|auth|authorization|cookie|timestamp|ts|time|date|nonce|state|signature|sig|hash|hmac|captcha|recaptcha|g-recaptcha-response|requestid|rquid|trace|span)$/i;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
const NUMERIC_RE = /^[0-9]{1,18}$/;
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function valueShape(value: string): { ok: boolean; label: string } {
  if (UUID_RE.test(value)) return { ok: true, label: "UUID" };
  if (OBJECT_ID_RE.test(value)) return { ok: true, label: "ObjectId" };
  if (ULID_RE.test(value)) return { ok: true, label: "ULID" };
  if (NUMERIC_RE.test(value) && value.length >= 1) return { ok: true, label: "رقم" };
  if (/^[A-Za-z0-9_-]{6,64}$/.test(value)) return { ok: true, label: "معرّف نصي" };
  return { ok: false, label: "" };
}

function confidenceFor(key: string, value: string): IdCandidate["confidence"] {
  if (SKIP_KEYS.test(key)) return "low";
  const shape = valueShape(value);
  if (!shape.ok) return "low";
  if (HIGH_KEYS.test(key) && (UUID_RE.test(value) || NUMERIC_RE.test(value) || OBJECT_ID_RE.test(value))) {
    return "high";
  }
  if (HIGH_KEYS.test(key) || MEDIUM_KEYS.test(key)) return "medium";
  if (NUMERIC_RE.test(value) && value.length >= 3) return "medium";
  return "low";
}

export function detectIdCandidates(parsed: ParsedHttpRequest): IdCandidate[] {
  const out: IdCandidate[] = [];
  const seen = new Set<string>();

  const push = (c: IdCandidate) => {
    const id = `${c.location}:${c.key}:${c.value}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push(c);
  };

  const u = new URL(parsed.url);
  const parts = u.pathname.split("/").filter(Boolean);
  parts.forEach((seg, i) => {
    const decoded = decodeURIComponent(seg);
    const shape = valueShape(decoded);
    if (!shape.ok) return;
    const prev = parts[i - 1] ?? "path";
    push({
      key: `path:${i + 1}`,
      value: decoded,
      location: "path",
      confidence: NUMERIC_RE.test(decoded) || UUID_RE.test(decoded) ? "high" : "medium",
      reason: `جزء مسار (${prev}/${decoded}) — ${shape.label}`,
    });
  });

  for (const [k, v] of Object.entries(parsed.query)) {
    if (SKIP_KEYS.test(k)) continue;
    const shape = valueShape(v);
    if (!shape.ok) continue;
    push({
      key: k,
      value: v,
      location: "query",
      confidence: confidenceFor(k, v),
      reason: `query ${k}=${v} — ${shape.label}`,
    });
  }

  const ct = parsed.headers["content-type"] ?? "";
  if (parsed.body.trim()) {
    if (ct.includes("application/json") || parsed.body.trim().startsWith("{")) {
      try {
        walkJson(JSON.parse(parsed.body), [], (path, value) => {
          const key = path[path.length - 1] ?? "json";
          if (SKIP_KEYS.test(key)) return;
          const shape = valueShape(value);
          if (!shape.ok) return;
          push({
            key,
            value,
            location: "json",
            confidence: confidenceFor(key, value),
            reason: `JSON ${path.join(".")} — ${shape.label}`,
          });
        });
      } catch {
        /* ignore */
      }
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(parsed.body);
      params.forEach((v, k) => {
        if (SKIP_KEYS.test(k)) return;
        const shape = valueShape(v);
        if (!shape.ok) return;
        push({
          key: k,
          value: v,
          location: "form",
          confidence: confidenceFor(k, v),
          reason: `form ${k} — ${shape.label}`,
        });
      });
    }
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.confidence] - rank[b.confidence]);
}

function walkJson(
  node: unknown,
  path: string[],
  visit: (path: string[], value: string) => void,
) {
  if (typeof node === "string" || typeof node === "number") {
    visit(path, String(node));
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkJson(item, [...path, String(i)], visit));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      walkJson(v, [...path, k], visit);
    }
  }
}
