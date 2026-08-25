import type { BodyKind, ClassifiedBody, JsonValue, PairEvidence, ProbeResponse } from "./types";

const SENSITIVE_KEY =
  /(email|phone|mobile|national|iqama|ssn|passport|address|card|cvv|iban|salary|amount|balance|dob|birth|token|secret|password|otp)/i;

export function classifyBody(res: ProbeResponse): ClassifiedBody {
  const notes: string[] = [];
  const body = res.body ?? "";
  const ct = (res.contentType || "").toLowerCase();
  const trimmed = body.trim();

  if (res.error) {
    return { kind: "error_text", json: null, notes: [res.error] };
  }
  if (!trimmed) {
    return { kind: "empty", json: null, notes: ["جسم الاستجابة فارغ"] };
  }

  const lower = trimmed.toLowerCase();
  const isHtml = ct.includes("text/html") || /^<!doctype html|<html/i.test(trimmed);

  if (isHtml) {
    if (
      /attention required|cloudflare|access denied|captcha|cf-ray|just a moment/i.test(
        trimmed,
      )
    ) {
      return { kind: "html_waf", json: null, notes: ["صفحة حماية / WAF"] };
    }
    if (
      /form[^>]+password|name="password"|تسجيل الدخول|sign in|log in|login/i.test(
        trimmed,
      )
    ) {
      return { kind: "html_login", json: null, notes: ["تبدو صفحة تسجيل دخول"] };
    }
    return { kind: "html_other", json: null, notes: ["HTML غير JSON"] };
  }

  if (ct.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed) as JsonValue;
      const kind: BodyKind =
        json && typeof json === "object" && !Array.isArray(json)
          ? "json_object"
          : "json_other";
      if (looksLikeApiError(json, res.status)) {
        notes.push("شكل JSON يوحي برسالة خطأ");
      }
      return { kind, json, notes };
    } catch {
      notes.push("Content-Type JSON لكن التحليل فشل");
    }
  }

  if (res.status !== null && res.status >= 400) {
    return { kind: "error_text", json: null, notes: [`HTTP ${res.status}`] };
  }
  if (/unauthorized|forbidden|not allowed|غير مسموح/i.test(lower)) {
    return { kind: "error_text", json: null, notes: ["نص رفض وصول"] };
  }
  return { kind: "unknown", json: null, notes };
}

function looksLikeApiError(json: JsonValue | null, status: number | null): boolean {
  if (!json || typeof json !== "object" || Array.isArray(json)) return false;
  const o = json as Record<string, unknown>;
  if (status && status >= 400) return true;
  const msg = String(o.error ?? o.message ?? o.statusDesc ?? "").toLowerCase();
  return /denied|unauthorized|forbidden|unauthenticated|not found/.test(msg);
}

export function isObjectLike(c: ClassifiedBody, res: ProbeResponse): boolean {
  if (c.kind === "json_object" || c.kind === "json_other") {
    return !looksLikeApiError(c.json, res.status);
  }
  return false;
}

export function comparePair(
  left: { res: ProbeResponse; classified: ClassifiedBody },
  right: { res: ProbeResponse; classified: ClassifiedBody },
): PairEvidence {
  const a = left.res.body;
  const b = right.res.body;
  const tokenJaccard = jaccard(tokens(a), tokens(b));
  const lengthRatio =
    Math.min(left.res.byteLength, right.res.byteLength) /
    Math.max(1, Math.max(left.res.byteLength, right.res.byteLength));

  let jsonKeyJaccard = 0;
  let sharedSensitiveHits: string[] = [];
  let sameObjectHint = false;
  let differentObjectHint = false;

  const ja = asRecord(left.classified.json);
  const jb = asRecord(right.classified.json);
  if (ja && jb) {
    const ka = new Set(flattenKeys(ja));
    const kb = new Set(flattenKeys(jb));
    jsonKeyJaccard = jaccard(ka, kb);
    sharedSensitiveHits = [...ka].filter((k) => kb.has(k) && SENSITIVE_KEY.test(k));

    const idA = firstId(ja);
    const idB = firstId(jb);
    if (idA && idB && idA === idB) sameObjectHint = true;
    if (idA && idB && idA !== idB) differentObjectHint = true;

    const emailA = firstByKey(ja, /email/i);
    const emailB = firstByKey(jb, /email/i);
    if (emailA && emailB && emailA === emailB) sameObjectHint = true;
    if (emailA && emailB && emailA !== emailB) differentObjectHint = true;
  }

  return {
    statusMatch: left.res.status === right.res.status,
    lengthRatio: Number(lengthRatio.toFixed(3)),
    tokenJaccard: Number(tokenJaccard.toFixed(3)),
    jsonKeyJaccard: Number(jsonKeyJaccard.toFixed(3)),
    sharedSensitiveHits,
    sameObjectHint,
    differentObjectHint,
  };
}

function asRecord(json: JsonValue | null): Record<string, JsonValue> | null {
  if (!json || typeof json !== "object") return null;
  if (Array.isArray(json)) {
    const first = json[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, JsonValue>;
    }
    return null;
  }
  return json as Record<string, JsonValue>;
}

function flattenKeys(obj: Record<string, JsonValue>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    keys.push(path);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, JsonValue>, path));
    }
  }
  return keys;
}

function firstId(obj: Record<string, JsonValue>): string | null {
  for (const [k, v] of Object.entries(obj)) {
    if (/^(id|orderid|userid|uuid)$/i.test(k) && (typeof v === "string" || typeof v === "number")) {
      return String(v);
    }
  }
  return null;
}

function firstByKey(obj: Record<string, JsonValue>, re: RegExp): string | null {
  for (const [k, v] of Object.entries(obj)) {
    if (re.test(k) && (typeof v === "string" || typeof v === "number")) return String(v);
  }
  return null;
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9_@.\u0600-\u06FF]+/i)
      .filter((t) => t.length >= 3)
      .slice(0, 400),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
