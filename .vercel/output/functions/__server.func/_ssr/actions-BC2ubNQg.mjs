import { i as getRequest, n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { i as decideVerdict, n as buildReportMarkdown, r as classifyBody, s as toCurl, t as buildPairs } from "./report-CfHw96hb.mjs";
import { n as handleDemoOrder } from "./demo-api-DsKBIbDU.mjs";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
//#region node_modules/.nitro/vite/services/ssr/assets/actions-BC2ubNQg.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var HOP_BY_HOP = /* @__PURE__ */ new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailers",
	"transfer-encoding",
	"upgrade",
	"content-length",
	"host"
]);
function parseRawHttp(raw) {
	const warnings = [];
	const normalized = raw.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "").trim();
	if (!normalized) throw new Error("الصق طلب HTTP خام من Burp (السطر الأول + الهيدرز + البودي).");
	const split = normalized.split("\n\n");
	const head = split[0] ?? "";
	const body = split.slice(1).join("\n\n");
	const lines = head.split("\n").filter((l, i) => i === 0 || l.trim().length > 0);
	const match = (lines[0]?.trim() ?? "").match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)(?:\s+HTTP\/[\d.]+)?$/i);
	if (!match) throw new Error("سطر الطلب غير مفهوم. الشكل المتوقع: GET /path HTTP/2  أو  POST https://host/path");
	const method = match[1].toUpperCase();
	let target = match[2];
	const headers = {};
	const headerOrder = [];
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
	let scheme = "https";
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
	if (!host) throw new Error("لا يوجد Host. أضف هيدر Host أو استخدم رابط كامل في سطر الطلب.");
	const url = `${scheme}://${host}${path}`;
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error(`الرابط غير صالح: ${url}`);
	}
	const query = {};
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
		parseWarnings: warnings
	};
}
function headersForFetch(parsed, identity, stripAuth) {
	const out = {};
	for (const [k, v] of Object.entries(parsed.headers)) {
		if (HOP_BY_HOP.has(k)) continue;
		if (stripAuth && (k === "cookie" || k === "authorization")) continue;
		out[k] = v;
	}
	if (stripAuth) return out;
	if (identity.cookie?.trim()) out.cookie = identity.cookie.trim();
	if (identity.authorization?.trim()) out.authorization = identity.authorization.trim();
	return out;
}
function applyId(parsed, location, key, fromValue, toValue) {
	const u = new URL(parsed.url);
	let body = parsed.body;
	if (location === "path") {
		const parts = u.pathname.split("/");
		let replaced = false;
		for (let i = 0; i < parts.length; i++) if (parts[i] === fromValue) {
			parts[i] = encodeURIComponent(toValue);
			replaced = true;
			break;
		}
		if (!replaced && key.startsWith("path:")) {
			const idx = Number(key.slice(5));
			if (Number.isInteger(idx) && parts[idx] !== void 0) parts[idx] = encodeURIComponent(toValue);
		}
		u.pathname = parts.join("/");
	} else if (location === "query") {
		if (u.searchParams.has(key)) u.searchParams.set(key, toValue);
	} else if (location === "json") try {
		const next = replaceJsonKey(JSON.parse(body || "{}"), key, fromValue, toValue);
		body = JSON.stringify(next);
	} catch {
		body = body.split(fromValue).join(toValue);
	}
	else if (location === "form") {
		const params = new URLSearchParams(body);
		if (params.has(key)) params.set(key, toValue);
		body = params.toString();
	}
	return {
		url: u.toString(),
		body
	};
}
function replaceJsonKey(data, key, from, to) {
	if (Array.isArray(data)) return data.map((x) => replaceJsonKey(x, key, from, to));
	if (data && typeof data === "object") {
		const obj = data;
		const out = {};
		for (const [k, v] of Object.entries(obj)) if (k === key && String(v) === from) out[k] = to;
		else out[k] = replaceJsonKey(v, key, from, to);
		return out;
	}
	return data;
}
var HIGH_KEYS = /^(id|user_?id|account_?id|order_?id|customer_?id|org_?id|document_?id|file_?id|case_?id|ticket_?id|student_?id|profile_?id|resource_?id|object_?id|entity_?id|record_?id|uuid|uid|pk)$/i;
var MEDIUM_KEYS = /(id|uuid|guid|number|no|code|ref|key)$/i;
var SKIP_KEYS = /^(csrf|xsrf|token|session|sess|jwt|auth|authorization|cookie|timestamp|ts|time|date|nonce|state|signature|sig|hash|hmac|captcha|recaptcha|g-recaptcha-response|requestid|rquid|trace|span)$/i;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
var NUMERIC_RE = /^[0-9]{1,18}$/;
var ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
function valueShape(value) {
	if (UUID_RE.test(value)) return {
		ok: true,
		label: "UUID"
	};
	if (OBJECT_ID_RE.test(value)) return {
		ok: true,
		label: "ObjectId"
	};
	if (ULID_RE.test(value)) return {
		ok: true,
		label: "ULID"
	};
	if (NUMERIC_RE.test(value) && value.length >= 1) return {
		ok: true,
		label: "رقم"
	};
	if (/^[A-Za-z0-9_-]{6,64}$/.test(value)) return {
		ok: true,
		label: "معرّف نصي"
	};
	return {
		ok: false,
		label: ""
	};
}
function confidenceFor(key, value) {
	if (SKIP_KEYS.test(key)) return "low";
	if (!valueShape(value).ok) return "low";
	if (HIGH_KEYS.test(key) && (UUID_RE.test(value) || NUMERIC_RE.test(value) || OBJECT_ID_RE.test(value))) return "high";
	if (HIGH_KEYS.test(key) || MEDIUM_KEYS.test(key)) return "medium";
	if (NUMERIC_RE.test(value) && value.length >= 3) return "medium";
	return "low";
}
function detectIdCandidates(parsed) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	const push = (c) => {
		const id = `${c.location}:${c.key}:${c.value}`;
		if (seen.has(id)) return;
		seen.add(id);
		out.push(c);
	};
	const parts = new URL(parsed.url).pathname.split("/").filter(Boolean);
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
			reason: `جزء مسار (${prev}/${decoded}) — ${shape.label}`
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
			reason: `query ${k}=${v} — ${shape.label}`
		});
	}
	const ct = parsed.headers["content-type"] ?? "";
	if (parsed.body.trim()) {
		if (ct.includes("application/json") || parsed.body.trim().startsWith("{")) try {
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
					reason: `JSON ${path.join(".")} — ${shape.label}`
				});
			});
		} catch {}
		else if (ct.includes("application/x-www-form-urlencoded")) new URLSearchParams(parsed.body).forEach((v, k) => {
			if (SKIP_KEYS.test(k)) return;
			const shape = valueShape(v);
			if (!shape.ok) return;
			push({
				key: k,
				value: v,
				location: "form",
				confidence: confidenceFor(k, v),
				reason: `form ${k} — ${shape.label}`
			});
		});
	}
	const rank = {
		high: 0,
		medium: 1,
		low: 2
	};
	return out.sort((a, b) => rank[a.confidence] - rank[b.confidence]);
}
function walkJson(node, path, visit) {
	if (typeof node === "string" || typeof node === "number") {
		visit(path, String(node));
		return;
	}
	if (Array.isArray(node)) {
		node.forEach((item, i) => walkJson(item, [...path, String(i)], visit));
		return;
	}
	if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) walkJson(v, [...path, k], visit);
}
var BLOCKED_HOSTS = /* @__PURE__ */ new Set([
	"localhost",
	"localhost.localdomain",
	"metadata.google.internal",
	"metadata.google",
	"instance-data"
]);
async function assertSafeUrl(raw) {
	let url;
	try {
		url = new URL(raw);
	} catch {
		throw new Error("رابط الهدف غير صالح");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("يُسمح فقط بـ http/https");
	const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
	if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("المضيف محظور (محلي / metadata)");
	if (host === "0.0.0.0") throw new Error("المضيف محظور");
	if (isIP(host)) {
		if (isPrivateIp(host)) throw new Error("عناوين IP الخاصة محظورة");
		return url;
	}
	const results = await lookup(host, { all: true });
	if (!results.length) throw new Error("تعذر حل اسم المضيف");
	for (const r of results) if (isPrivateIp(r.address)) throw new Error("اسم المضيف يشير إلى شبكة خاصة — مرفوض");
	return url;
}
function isPrivateIp(ip) {
	const v4 = ip.includes(".") && !ip.includes(":") ? ip : mappedV4(ip);
	if (v4) {
		const p = v4.split(".").map(Number);
		if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
		const [a, b] = p;
		if (a === 0 || a === 10 || a === 127) return true;
		if (a === 169 && b === 254) return true;
		if (a === 172 && b !== void 0 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 100 && b !== void 0 && b >= 64 && b <= 127) return true;
		if (a === 198 && (b === 18 || b === 19)) return true;
		return false;
	}
	const x = ip.toLowerCase();
	if (x === "::1" || x === "::") return true;
	if (x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80")) return true;
	return false;
}
function mappedV4(ip) {
	return ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1] ?? null;
}
var MAX_BODY = 18e4;
var TIMEOUT_MS = 12e3;
var SPECS = [
	{
		kind: "baseline_a",
		title: "A يقرأ كائنه",
		purpose: "Baseline — إن فشل، بقية النتائج بلا معنى",
		identity: "A",
		objectOwner: "A"
	},
	{
		kind: "baseline_b",
		title: "B يقرأ كائنه",
		purpose: "يثبت أن جلسة B صالحة وأن الكائنين مختلفان",
		identity: "B",
		objectOwner: "B"
	},
	{
		kind: "cross_b_reads_a",
		title: "B يقرأ كائن A",
		purpose: "اختبار IDOR الأفقي الأساسي",
		identity: "B",
		objectOwner: "A"
	},
	{
		kind: "cross_a_reads_b",
		title: "A يقرأ كائن B",
		purpose: "الاتجاه العكسي",
		identity: "A",
		objectOwner: "B"
	},
	{
		kind: "unauth_reads_a",
		title: "بدون جلسة → كائن A",
		purpose: "يفصل المورد العام عن IDOR",
		identity: "none",
		objectOwner: "A"
	}
];
async function executeSuite(input) {
	if (!input.authorized) throw new Error("أقرّ أولاً أنك مخوّل باختبار هذا الهدف.");
	if (!input.idA.trim()) throw new Error("معرّف كائن A مطلوب.");
	if (input.mode === "live") await assertSafeUrl(input.parsed.url);
	const tests = [];
	for (const spec of SPECS) {
		if (spec.objectOwner === "B" && !input.idB.trim()) continue;
		const objectId = spec.objectOwner === "A" ? input.idA.trim() : input.idB.trim();
		const fromValue = guessOriginalValue(input);
		const applied = applyId(input.parsed, input.paramLocation, input.paramKey, fromValue, objectId);
		const identity = spec.identity === "A" ? input.sessionA : spec.identity === "B" ? input.sessionB : {
			label: "none",
			cookie: "",
			authorization: ""
		};
		const headers = headersForFetch(input.parsed, {
			cookie: identity.cookie,
			authorization: identity.authorization
		}, spec.identity === "none");
		const response = await dispatch({
			url: applied.url,
			method: input.parsed.method,
			headers,
			body: applied.body,
			mode: input.mode,
			selfOrigin: input.selfOrigin
		});
		tests.push({
			spec,
			requestUrl: applied.url,
			method: input.parsed.method,
			identityUsed: spec.identity === "none" ? "none" : identity.label || spec.identity,
			objectId,
			response,
			classified: classifyBody(response)
		});
	}
	const pairs = buildPairs(tests);
	const verdict = decideVerdict(tests);
	const urlTemplate = templateUrl(input.parsed.url, input.idA, input.paramLocation);
	const curls = tests.filter((t) => t.spec.kind === "baseline_a" || t.spec.kind === "cross_b_reads_a").map((t) => {
		const ident = t.spec.identity === "A" ? input.sessionA : t.spec.identity === "B" ? input.sessionB : null;
		const headers = headersForFetch(input.parsed, ident ? {
			cookie: ident.cookie,
			authorization: ident.authorization
		} : {}, t.spec.identity === "none");
		const applied = applyId(input.parsed, input.paramLocation, input.paramKey, guessOriginalValue(input), t.objectId);
		return {
			label: t.spec.title,
			command: toCurl({
				method: input.parsed.method,
				url: applied.url,
				headers,
				body: applied.body
			})
		};
	});
	const result = {
		ranAt: (/* @__PURE__ */ new Date()).toISOString(),
		targetHost: new URL(input.parsed.url).host,
		endpoint: {
			method: input.parsed.method,
			urlTemplate,
			paramKey: input.paramKey,
			paramLocation: input.paramLocation,
			idA: input.idA.trim(),
			idB: input.idB.trim()
		},
		tests,
		pairs,
		verdict,
		curls,
		reportMarkdown: "",
		mode: input.mode
	};
	result.reportMarkdown = buildReportMarkdown(result);
	return result;
}
function guessOriginalValue(input) {
	try {
		const u = new URL(input.parsed.url);
		if (input.paramLocation === "path") {
			const parts = u.pathname.split("/").filter(Boolean);
			if (parts.includes(input.idA)) return input.idA;
			const idx = Number(String(input.paramKey).replace("path:", ""));
			if (Number.isInteger(idx) && parts[idx - 1]) return decodeURIComponent(parts[idx - 1]);
			return parts[parts.length - 1] ?? input.idA;
		}
		if (input.paramLocation === "query") return u.searchParams.get(input.paramKey) ?? input.idA;
	} catch {}
	return input.idA;
}
function templateUrl(url, idA, loc) {
	if (loc === "path" && idA) return url.split(idA).join("{id}");
	return url;
}
async function dispatch(opts) {
	const started = Date.now();
	try {
		const target = new URL(opts.url);
		const self = new URL(opts.selfOrigin);
		if (target.pathname.startsWith("/api/demo/") && (opts.mode === "demo" || target.host === self.host)) return fromResponse(await demoFetch(target, opts.headers), opts.url, started);
		if (opts.mode === "demo") throw new Error("وضع العرض يعمل فقط على /api/demo/*");
		await assertSafeUrl(opts.url);
		const ac = new AbortController();
		const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
		try {
			const init = {
				method: opts.method,
				headers: opts.headers,
				redirect: "manual",
				signal: ac.signal
			};
			if (opts.body && opts.method !== "GET" && opts.method !== "HEAD") init.body = opts.body;
			return fromResponse(await fetch(opts.url, init), opts.url, started);
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
			finalUrl: opts.url
		};
	}
}
async function demoFetch(url, headers) {
	const insecure = url.pathname.startsWith("/api/demo/insecure/orders/");
	const secure = url.pathname.startsWith("/api/demo/secure/orders/");
	const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
	if (!insecure && !secure) return Response.json({ error: "unknown_demo_route" }, { status: 404 });
	const h = new Headers();
	for (const [k, v] of Object.entries(headers)) h.set(k, v);
	return handleDemoOrder({
		id,
		headers: h,
		enforceOwner: secure
	});
}
async function fromResponse(res, finalUrl, started) {
	const buf = new Uint8Array(await res.arrayBuffer());
	const truncated = buf.byteLength > MAX_BODY;
	const slice = truncated ? buf.slice(0, MAX_BODY) : buf;
	const body = new TextDecoder("utf-8", { fatal: false }).decode(slice);
	return {
		ok: res.status >= 200 && res.status < 400,
		status: res.status,
		statusText: res.statusText,
		redirected: res.type === "opaqueredirect" || res.status >= 300 && res.status < 400,
		location: res.headers.get("location"),
		contentType: res.headers.get("content-type") ?? "",
		body,
		bodyTruncated: truncated,
		byteLength: buf.byteLength,
		elapsedMs: Date.now() - started,
		finalUrl
	};
}
var analyzeRequest_createServerFn_handler = createServerRpc({
	id: "18591b310f2f01c1e1952f515818aa93f7b31163c1ba8acc8ec0c62d69756590",
	name: "analyzeRequest",
	filename: "src/lib/idor/actions.ts"
}, (opts) => analyzeRequest.__executeServer(opts));
var analyzeRequest = createServerFn({ method: "POST" }).validator((input) => input).handler(analyzeRequest_createServerFn_handler, async ({ data }) => {
	const parsed = parseRawHttp(data.raw);
	return {
		parsed,
		candidates: detectIdCandidates(parsed)
	};
});
var runAccessSuite_createServerFn_handler = createServerRpc({
	id: "c191430a360fbdda0b3e9b02494f9b203bec14ba61d49f2fe5fa89064b2fc081",
	name: "runAccessSuite",
	filename: "src/lib/idor/actions.ts"
}, (opts) => runAccessSuite.__executeServer(opts));
var runAccessSuite = createServerFn({ method: "POST" }).validator((input) => input).handler(runAccessSuite_createServerFn_handler, async ({ data }) => {
	const parsed = parseRawHttp(data.raw);
	const req = getRequest();
	const selfOrigin = new URL(req.url).origin;
	return executeSuite({
		parsed,
		sessionA: data.sessionA,
		sessionB: data.sessionB,
		paramKey: data.paramKey,
		paramLocation: data.paramLocation,
		idA: data.idA,
		idB: data.idB,
		authorized: data.authorized,
		mode: data.mode,
		selfOrigin
	});
});
//#endregion
export { analyzeRequest_createServerFn_handler, runAccessSuite_createServerFn_handler };
