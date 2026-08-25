import type { ParsedHttpRequest } from "./types";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "host",
]);

export function parseRawHttp(raw: string): ParsedHttpRequest {
  const warnings: string[] = [];
  const normalized = raw.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "").trim();
  if (!normalized) {
    throw new Error("الصق طلب HTTP خام من Burp (السطر الأول + الهيدرز + البودي).");
  }

  const split = normalized.split("\n\n");
  const head = split[0] ?? "";
  const body = split.slice(1).join("\n\n");
  const lines = head.split("\n").filter((l, i) => i === 0 || l.trim().length > 0);
  const requestLine = lines[0]?.trim() ?? "";
  const match = requestLine.match(
    /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)(?:\s+HTTP\/[\d.]+)?$/i,
  );
  if (!match) {
    throw new Error(
      "سطر الطلب غير مفهوم. الشكل المتوقع: GET /path HTTP/2  أو  POST https://host/path",
    );
  }

  const method = match[1]!.toUpperCase();
  let target = match[2]!;
  const headers: Record<string, string> = {};
  const headerOrder: string[] = [];

  for (const line of lines.slice(1)) {
    const idx = line.indexOf(":");
    if (idx <= 0) {
      warnings.push(`تم تجاهل سطر هيدر غير صالح: ${line.slice(0, 80)}`);
      continue;
    }
    const name = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    const key = name.toLowerCase();
    if (headers[key]) headers[key] = `${headers[key]}; ${value}`;
    else {
      headers[key] = value;
      headerOrder.push(key);
    }
  }

  let scheme: "http" | "https" = "https";
  let host = headers.host ?? "";
  let path = target;

  if (/^https?:\/\//i.test(target)) {
    const u = new URL(target);
    scheme = u.protocol === "http:" ? "http" : "https";
    host = u.host;
    path = `${u.pathname}${u.search}`;
  } else if (!target.startsWith("/")) {
    path = `/${target}`;
    warnings.push("المسار لم يبدأ بـ / فتمت إضافته.");
  }

  if (!host) {
    throw new Error("لا يوجد Host. أضف هيدر Host أو استخدم رابط كامل في سطر الطلب.");
  }

  const url = `${scheme}://${host}${path}`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`الرابط غير صالح: ${url}`);
  }

  const query: Record<string, string> = {};
  parsed.searchParams.forEach((v, k) => {
    query[k] = v;
  });

  return {
    method,
    path: `${parsed.pathname}${parsed.search}`,
    httpVersion: "HTTP/1.1",
    headers,
    headerOrder,
    body,
    host: parsed.host,
    scheme,
    url: parsed.toString(),
    query,
    parseWarnings: warnings,
  };
}

export function headersForFetch(
  parsed: ParsedHttpRequest,
  identity: { cookie?: string; authorization?: string },
  stripAuth: boolean,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.headers)) {
    if (HOP_BY_HOP.has(k)) continue;
    if (stripAuth && (k === "cookie" || k === "authorization")) continue;
    out[k] = v;
  }
  if (stripAuth) return out;
  if (identity.cookie?.trim()) out.cookie = identity.cookie.trim();
  if (identity.authorization?.trim()) {
    out.authorization = identity.authorization.trim();
  }
  return out;
}

export function applyId(
  parsed: ParsedHttpRequest,
  location: "path" | "query" | "json" | "form",
  key: string,
  fromValue: string,
  toValue: string,
): { url: string; body: string } {
  const u = new URL(parsed.url);
  let body = parsed.body;

  if (location === "path") {
    const parts = u.pathname.split("/");
    let replaced = false;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === fromValue) {
        parts[i] = encodeURIComponent(toValue);
        replaced = true;
        break;
      }
    }
    if (!replaced && key.startsWith("path:")) {
      const idx = Number(key.slice(5));
      if (Number.isInteger(idx) && parts[idx] !== undefined) {
        parts[idx] = encodeURIComponent(toValue);
      }
    }
    u.pathname = parts.join("/");
  } else if (location === "query") {
    if (u.searchParams.has(key)) u.searchParams.set(key, toValue);
  } else if (location === "json") {
    try {
      const data = JSON.parse(body || "{}") as unknown;
      const next = replaceJsonKey(data, key, fromValue, toValue);
      body = JSON.stringify(next);
    } catch {
      body = body.split(fromValue).join(toValue);
    }
  } else if (location === "form") {
    const params = new URLSearchParams(body);
    if (params.has(key)) params.set(key, toValue);
    body = params.toString();
  }

  return { url: u.toString(), body };
}

function replaceJsonKey(data: unknown, key: string, from: string, to: string): unknown {
  if (Array.isArray(data)) return data.map((x) => replaceJsonKey(x, key, from, to));
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === key && String(v) === from) out[k] = to;
      else out[k] = replaceJsonKey(v, key, from, to);
    }
    return out;
  }
  return data;
}
