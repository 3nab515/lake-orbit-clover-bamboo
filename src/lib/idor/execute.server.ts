import { applyId, headersForFetch } from "./parse-request";
import { classifyBody } from "./compare";
import { handleDemoOrder } from "./demo-api";
import { buildReportMarkdown, toCurl } from "./report";
import { assertSafeUrl } from "./ssrf-guard";
import { buildPairs, decideVerdict } from "./verdict";
import type {
  ExecutedTest,
  IdLocation,
  IdentityPack,
  ParsedHttpRequest,
  ProbeResponse,
  SuiteResult,
  TestKind,
  TestSpec,
} from "./types";

const MAX_BODY = 180_000;
const TIMEOUT_MS = 12_000;

const SPECS: TestSpec[] = [
  {
    kind: "baseline_a",
    title: "A يقرأ كائنه",
    purpose: "Baseline — إن فشل، بقية النتائج بلا معنى",
    identity: "A",
    objectOwner: "A",
  },
  {
    kind: "baseline_b",
    title: "B يقرأ كائنه",
    purpose: "يثبت أن جلسة B صالحة وأن الكائنين مختلفان",
    identity: "B",
    objectOwner: "B",
  },
  {
    kind: "cross_b_reads_a",
    title: "B يقرأ كائن A",
    purpose: "اختبار IDOR الأفقي الأساسي",
    identity: "B",
    objectOwner: "A",
  },
  {
    kind: "cross_a_reads_b",
    title: "A يقرأ كائن B",
    purpose: "الاتجاه العكسي",
    identity: "A",
    objectOwner: "B",
  },
  {
    kind: "unauth_reads_a",
    title: "بدون جلسة → كائن A",
    purpose: "يفصل المورد العام عن IDOR",
    identity: "none",
    objectOwner: "A",
  },
];

export type RunInput = {
  parsed: ParsedHttpRequest;
  sessionA: IdentityPack;
  sessionB: IdentityPack;
  paramKey: string;
  paramLocation: IdLocation;
  idA: string;
  idB: string;
  authorized: boolean;
  mode: "demo" | "live";
  selfOrigin: string;
};

export async function executeSuite(input: RunInput): Promise<SuiteResult> {
  if (!input.authorized) {
    throw new Error("أقرّ أولاً أنك مخوّل باختبار هذا الهدف.");
  }
  if (!input.idA.trim()) throw new Error("معرّف كائن A مطلوب.");
  if (input.mode === "live") {
    await assertSafeUrl(input.parsed.url);
  }

  const tests: ExecutedTest[] = [];
  for (const spec of SPECS) {
    if (spec.objectOwner === "B" && !input.idB.trim()) continue;
    const objectId = spec.objectOwner === "A" ? input.idA.trim() : input.idB.trim();
    const fromValue = guessOriginalValue(input);
    const applied = applyId(
      input.parsed,
      input.paramLocation,
      input.paramKey,
      fromValue,
      objectId,
    );
    const identity =
      spec.identity === "A"
        ? input.sessionA
        : spec.identity === "B"
          ? input.sessionB
          : { label: "none", cookie: "", authorization: "" };
    const headers = headersForFetch(
      input.parsed,
      { cookie: identity.cookie, authorization: identity.authorization },
      spec.identity === "none",
    );
    const response = await dispatch({
      url: applied.url,
      method: input.parsed.method,
      headers,
      body: applied.body,
      mode: input.mode,
      selfOrigin: input.selfOrigin,
    });
    tests.push({
      spec,
      requestUrl: applied.url,
      method: input.parsed.method,
      identityUsed: spec.identity === "none" ? "none" : identity.label || spec.identity,
      objectId,
      response,
      classified: classifyBody(response),
    });
  }

  const pairs = buildPairs(tests);
  const verdict = decideVerdict(tests);
  const urlTemplate = templateUrl(input.parsed.url, input.idA, input.paramLocation);

  const curls = tests
    .filter((t) => t.spec.kind === "baseline_a" || t.spec.kind === "cross_b_reads_a")
    .map((t) => {
      const ident =
        t.spec.identity === "A" ? input.sessionA : t.spec.identity === "B" ? input.sessionB : null;
      const headers = headersForFetch(
        input.parsed,
        ident ? { cookie: ident.cookie, authorization: ident.authorization } : {},
        t.spec.identity === "none",
      );
      const applied = applyId(
        input.parsed,
        input.paramLocation,
        input.paramKey,
        guessOriginalValue(input),
        t.objectId,
      );
      return {
        label: t.spec.title,
        command: toCurl({
          method: input.parsed.method,
          url: applied.url,
          headers,
          body: applied.body,
        }),
      };
    });

  const result: SuiteResult = {
    ranAt: new Date().toISOString(),
    targetHost: new URL(input.parsed.url).host,
    endpoint: {
      method: input.parsed.method,
      urlTemplate,
      paramKey: input.paramKey,
      paramLocation: input.paramLocation,
      idA: input.idA.trim(),
      idB: input.idB.trim(),
    },
    tests,
    pairs,
    verdict,
    curls,
    reportMarkdown: "",
    mode: input.mode,
  };
  result.reportMarkdown = buildReportMarkdown(result);
  return result;
}

function guessOriginalValue(input: RunInput): string {
  try {
    const u = new URL(input.parsed.url);
    if (input.paramLocation === "path") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.includes(input.idA)) return input.idA;
      const idx = Number(String(input.paramKey).replace("path:", ""));
      if (Number.isInteger(idx) && parts[idx - 1]) return decodeURIComponent(parts[idx - 1]!);
      return parts[parts.length - 1] ?? input.idA;
    }
    if (input.paramLocation === "query") {
      return u.searchParams.get(input.paramKey) ?? input.idA;
    }
  } catch {
    /* ignore */
  }
  return input.idA;
}

function templateUrl(url: string, idA: string, loc: IdLocation): string {
  if (loc === "path" && idA) return url.split(idA).join("{id}");
  return url;
}

async function dispatch(opts: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  mode: "demo" | "live";
  selfOrigin: string;
}): Promise<ProbeResponse> {
  const started = Date.now();
  try {
    const target = new URL(opts.url);
    const self = new URL(opts.selfOrigin);
    const demo = target.pathname.startsWith("/api/demo/");
    if (demo && (opts.mode === "demo" || target.host === self.host)) {
      return fromResponse(await demoFetch(target, opts.headers), opts.url, started);
    }
    if (opts.mode === "demo") {
      throw new Error("وضع العرض يعمل فقط على /api/demo/*");
    }
    await assertSafeUrl(opts.url);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const init: RequestInit = {
        method: opts.method,
        headers: opts.headers,
        redirect: "manual",
        signal: ac.signal,
      };
      if (opts.body && opts.method !== "GET" && opts.method !== "HEAD") {
        init.body = opts.body;
      }
      const res = await fetch(opts.url, init);
      return fromResponse(res, opts.url, started);
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "فشل الطلب",
      status: null,
      statusText: "",
      redirected: false,
      location: null,
      contentType: "",
      body: "",
      bodyTruncated: false,
      byteLength: 0,
      elapsedMs: Date.now() - started,
      finalUrl: opts.url,
    };
  }
}

async function demoFetch(url: URL, headers: Record<string, string>): Promise<Response> {
  const insecure = url.pathname.startsWith("/api/demo/insecure/orders/");
  const secure = url.pathname.startsWith("/api/demo/secure/orders/");
  const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
  if (!insecure && !secure) {
    return Response.json({ error: "unknown_demo_route" }, { status: 404 });
  }
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return handleDemoOrder({ id, headers: h, enforceOwner: secure });
}

async function fromResponse(res: Response, finalUrl: string, started: number): Promise<ProbeResponse> {
  const buf = new Uint8Array(await res.arrayBuffer());
  const truncated = buf.byteLength > MAX_BODY;
  const slice = truncated ? buf.slice(0, MAX_BODY) : buf;
  const body = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  return {
    ok: res.status >= 200 && res.status < 400,
    status: res.status,
    statusText: res.statusText,
    redirected: res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400),
    location: res.headers.get("location"),
    contentType: res.headers.get("content-type") ?? "",
    body,
    bodyTruncated: truncated,
    byteLength: buf.byteLength,
    elapsedMs: Date.now() - started,
    finalUrl,
  };
}

export function testKindOrder(): TestKind[] {
  return SPECS.map((s) => s.kind);
}
