import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  LoaderCircle,
  Shield,
  ShieldAlert,
  ShieldOff,
  Play,
} from "lucide-react";
import { analyzeRequest, runAccessSuite } from "@/lib/idor/actions";
import { demoRawRequest } from "@/lib/idor/demo-api";
import { endpointLine } from "@/lib/idor/report";
import { findingLabel } from "@/lib/idor/verdict";
import type {
  FindingClass,
  IdCandidate,
  IdentityPack,
  ParsedHttpRequest,
  SuiteResult,
} from "@/lib/idor/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LabApp() {
  const [raw, setRaw] = useState("");
  const [sessionA, setSessionA] = useState<IdentityPack>({
    label: "A",
    cookie: "",
    authorization: "",
  });
  const [sessionB, setSessionB] = useState<IdentityPack>({
    label: "B",
    cookie: "",
    authorization: "",
  });
  const [candidates, setCandidates] = useState<IdCandidate[]>([]);
  const [parsed, setParsed] = useState<ParsedHttpRequest | null>(null);
  const [paramKey, setParamKey] = useState("");
  const [paramLocation, setParamLocation] = useState<IdCandidate["location"]>("path");
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [mode, setMode] = useState<"demo" | "live">("live");
  const [busy, setBusy] = useState<"analyze" | "run" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuiteResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const selected = candidates.find(
    (c) => c.key === paramKey && c.location === paramLocation,
  );

  const loadDemo = (insecure: boolean) => {
    const origin = window.location.origin;
    const req = demoRawRequest(origin, insecure, "1001");
    setRaw(req);
    setMode("demo");
    setAuthorized(true);
    setSessionA({ label: "A · alice", cookie: "witness-session=alice", authorization: "" });
    setSessionB({ label: "B · bob", cookie: "witness-session=bob", authorization: "" });
    setIdA("1001");
    setIdB("1002");
    setParamKey("path:5");
    setParamLocation("path");
    setResult(null);
    setError(null);
    setParsed(null);
    setCandidates([
      {
        key: "path:5",
        value: "1001",
        location: "path",
        confidence: "high",
        reason: "جزء مسار orders/1001",
      },
    ]);
  };

  const onAnalyze = async () => {
    setBusy("analyze");
    setError(null);
    try {
      const out = await analyzeRequest({ data: { raw } });
      setParsed(out.parsed);
      setCandidates(out.candidates);
      const best = out.candidates.find((c) => c.confidence === "high") ?? out.candidates[0];
      if (best) {
        setParamKey(best.key);
        setParamLocation(best.location);
        if (!idA) setIdA(best.value);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحليل");
    } finally {
      setBusy(null);
    }
  };

  const onRun = async () => {
    setBusy("run");
    setError(null);
    try {
      const out = await runAccessSuite({
        data: {
          raw,
          sessionA,
          sessionB,
          paramKey,
          paramLocation,
          idA,
          idB,
          authorized,
          mode,
        },
      });
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التنفيذ");
    } finally {
      setBusy(null);
    }
  };

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface">
            <Shield className="size-5 text-accent" strokeWidth={1.6} />
          </span>
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
              Access control lab
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Witness</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          مختبر إثبات لثغرات IDOR وصلاحيات الوصول. لا يعلن «ثغرة» إلا إذا قارن جلستين
          واستجابتين. يعطيك الـ endpoint وcURL جاهزين للتقرير.
        </p>
      </header>

      <Honesty />

      <section className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => loadDemo(true)}
          variant="secondary"
          className="justify-start"
        >
          تحميل مختبر ضعيف (IDOR متعمّد)
        </Button>
        <Button
          type="button"
          onClick={() => loadDemo(false)}
          variant="secondary"
          className="justify-start"
        >
          تحميل مختبر محمي (يجب أن يفشل الإثبات)
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">طلب HTTP الخام</h2>
          <span className="font-mono text-[11px] text-subtle">من Burp Repeater</span>
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          spellCheck={false}
          placeholder={"GET /api/orders/1001 HTTP/1.1\nHost: target.example\nCookie: session=..."}
          className="min-h-44 w-full rounded-md border border-border bg-bg px-3 py-3 font-mono text-xs leading-relaxed text-fg outline-none focus:ring-2 focus:ring-accent/30"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onAnalyze} disabled={!raw || busy !== null}>
            {busy === "analyze" ? <LoaderCircle className="size-4 animate-spin" /> : null}
            استخراج المعرّفات
          </Button>
          <label className="flex items-center gap-2 text-xs text-muted">
            <span>الوضع</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "demo" | "live")}
              className="h-9 rounded-md border border-border bg-bg px-2 text-fg"
            >
              <option value="demo">عرض داخلي</option>
              <option value="live">هدف حي (مخوّل)</option>
            </select>
          </label>
        </div>
        {parsed ? (
          <p className="mt-3 font-mono text-xs text-info">
            {parsed.method} {parsed.url}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <IdentityCard title="جلسة A — الضحية" value={sessionA} onChange={setSessionA} />
        <IdentityCard title="جلسة B — المهاجم" value={sessionB} onChange={setSessionB} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-medium">معرّف الكائن</h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">حلّل الطلب أولاً. لن نخمّن معرّفاً من تلقاء أنفسنا.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidates.map((c) => {
              const active = c.key === paramKey && c.location === paramLocation;
              return (
                <li key={`${c.location}:${c.key}:${c.value}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setParamKey(c.key);
                      setParamLocation(c.location);
                      setIdA(c.value);
                    }}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-md border px-3 py-3 text-right transition-colors",
                      active
                        ? "border-accent/40 bg-bg"
                        : "border-border bg-surface-2 hover:border-muted/40",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-fg">
                        {c.location}:{c.key} = {c.value}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wide",
                          c.confidence === "high"
                            ? "text-ok"
                            : c.confidence === "medium"
                              ? "text-warn"
                              : "text-subtle",
                        )}
                      >
                        {c.confidence}
                      </span>
                    </span>
                    <span className="text-xs text-muted">{c.reason}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="معرّف يملكه A" value={idA} onChange={setIdA} />
          <Field label="معرّف يملكه B" value={idB} onChange={setIdB} />
        </div>
        {selected ? (
          <p className="mt-2 text-xs text-subtle">
            سيتم استبدال {selected.location}:{selected.key} فقط. لن نلمس التوكن أو CSRF.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
            className="mt-1 size-4 accent-accent"
          />
          أؤكد أنني مخوّل باختبار هذا الهدف (برنامج مكافآت / نطاق مكتوب / مختبر العرض).
        </label>
        <Button type="button" onClick={onRun} disabled={busy !== null || !raw || !paramKey}>
          {busy === "run" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          تشغيل مقارنة الجلسات
        </Button>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
      </section>

      {result ? <ResultPanel result={result} copied={copied} onCopy={copy} /> : null}
    </div>
  );
}

function Honesty() {
  return (
    <aside className="rounded-xl border border-border bg-surface-2 px-4 py-4 text-sm leading-relaxed text-muted">
      <p className="mb-2 font-medium text-fg">عقد الصدق</p>
      <ul className="flex list-disc flex-col gap-1 pr-5">
        <li>Confirmed فقط إذا B حصل على كائن A، والجلسة غير المصادق عليها لا تفسّر النتيجة.</li>
        <li>403/401 = محمي. صفحة Cloudflare = غير حاسم. لا تقرير.</li>
        <li>إذا الجميع يرى نفس JSON فهذه ليست IDOR.</li>
      </ul>
    </aside>
  );
}

function IdentityCard({
  title,
  value,
  onChange,
}: {
  title: string;
  value: IdentityPack;
  onChange: (v: IdentityPack) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      <div className="flex flex-col gap-3">
        <Field
          label="الاسم في التقرير"
          value={value.label}
          onChange={(label) => onChange({ ...value, label })}
        />
        <Field
          label="Cookie"
          value={value.cookie}
          onChange={(cookie) => onChange({ ...value, cookie })}
          mono
        />
        <Field
          label="Authorization"
          value={value.authorization}
          onChange={(authorization) => onChange({ ...value, authorization })}
          mono
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/30",
          mono && "font-mono text-xs",
        )}
      />
    </label>
  );
}

function ResultPanel({
  result,
  copied,
  onCopy,
}: {
  result: SuiteResult;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const tone = toneFor(result.verdict.finding);
  const ep = endpointLine(result.endpoint);

  const snippet = useMemo(() => {
    const cross = result.tests.find((t) => t.spec.kind === "cross_b_reads_a");
    return cross?.response.body.slice(0, 900) ?? "";
  }, [result]);

  return (
    <section className="flex flex-col gap-4">
      <div className={cn("rounded-xl border p-5", tone.box)}>
        <div className="mb-2 flex items-center gap-2">
          {tone.icon}
          <h2 className="text-lg font-semibold">{result.verdict.title}</h2>
        </div>
        <p className="text-sm text-muted">{result.verdict.summary}</p>
        <p className="mt-2 font-mono text-xs text-fg">
          {findingLabel(result.verdict.finding)} · ثقة {result.verdict.confidence} ·{" "}
          {result.verdict.reportable ? "قابل للتقرير" : "لا تُرسل كمؤكد"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Endpoint</h3>
          <CopyBtn ok={copied === "ep"} onClick={() => onCopy("ep", ep)} />
        </div>
        <pre className="overflow-x-auto rounded-md bg-bg p-3 font-mono text-xs leading-relaxed text-fg" dir="ltr">
          {ep}
          {"\n"}idA={result.endpoint.idA}  idB={result.endpoint.idB || "—"}
        </pre>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-right text-xs">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">اختبار</th>
              <th className="px-3 py-2 font-medium">هوية</th>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Bytes</th>
              <th className="px-3 py-2 font-medium">نوع الجسم</th>
            </tr>
          </thead>
          <tbody>
            {result.tests.map((t) => (
              <tr key={t.spec.kind} className="border-t border-border">
                <td className="px-3 py-2">{t.spec.title}</td>
                <td className="px-3 py-2 font-mono">{t.identityUsed}</td>
                <td className="px-3 py-2 font-mono">{t.objectId}</td>
                <td className="px-3 py-2 font-mono">
                  {t.response.status ?? t.response.error ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono">{t.response.byteLength}</td>
                <td className="px-3 py-2">{t.classified.kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.pairs.length ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium">مقارنات</h3>
          <ul className="flex flex-col gap-2 text-xs text-muted">
            {result.pairs.map((p) => (
              <li key={p.name} className="rounded-md bg-bg px-3 py-2 font-mono">
                {p.name} · tokens={p.evidence.tokenJaccard} keys={p.evidence.jsonKeyJaccard}{" "}
                len={p.evidence.lengthRatio}
                {p.evidence.sameObjectHint ? " · same-object" : ""}
                {p.evidence.sharedSensitiveHits.length
                  ? ` · ${p.evidence.sharedSensitiveHits.join(",")}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-sm font-medium">لماذا هذا الحكم</h3>
        <ul className="list-disc pr-5 text-sm leading-relaxed text-muted">
          {result.verdict.why.map((w) => (
            <li key={w}>{w}</li>
          ))}
          {result.verdict.whyNotConfirmed.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>

      {snippet ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-medium">عيّنة جسم B→A</h3>
          <pre className="max-h-56 overflow-auto rounded-md bg-bg p-3 font-mono text-[11px] text-fg" dir="ltr">
            {snippet}
          </pre>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {result.curls.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{c.label}</h3>
              <CopyBtn ok={copied === c.label} onClick={() => onCopy(c.label, c.command)} />
            </div>
            <pre className="overflow-x-auto font-mono text-[11px] text-muted" dir="ltr">
              {c.command}
            </pre>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">تقرير Markdown</h3>
          <CopyBtn
            ok={copied === "md"}
            onClick={() => onCopy("md", result.reportMarkdown)}
          />
        </div>
        <pre className="max-h-80 overflow-auto rounded-md bg-bg p-3 font-mono text-[11px] leading-relaxed text-fg" dir="ltr">
          {result.reportMarkdown}
        </pre>
      </div>
    </section>
  );
}

function CopyBtn({ ok, onClick }: { ok: boolean; onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="ghost" onClick={onClick}>
      {ok ? <Check className="size-4" /> : <Copy className="size-4" />}
      {ok ? "تم" : "نسخ"}
    </Button>
  );
}

function toneFor(f: FindingClass) {
  if (f === "confirmed_horizontal_idor" || f === "confirmed_unauthenticated_access") {
    return {
      box: "border-bad/40 bg-bad/10",
      icon: <ShieldAlert className="size-5 text-bad" />,
    };
  }
  if (f === "protected") {
    return {
      box: "border-ok/40 bg-ok/10",
      icon: <Shield className="size-5 text-ok" />,
    };
  }
  if (f === "likely_idor") {
    return {
      box: "border-warn/40 bg-warn/10",
      icon: <ShieldAlert className="size-5 text-warn" />,
    };
  }
  return {
    box: "border-border bg-surface",
    icon: <ShieldOff className="size-5 text-muted" />,
  };
}
