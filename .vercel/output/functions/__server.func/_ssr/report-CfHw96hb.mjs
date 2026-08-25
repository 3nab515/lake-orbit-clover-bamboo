//#region node_modules/.nitro/vite/services/ssr/assets/report-CfHw96hb.js
var SENSITIVE_KEY = /(email|phone|mobile|national|iqama|ssn|passport|address|card|cvv|iban|salary|amount|balance|dob|birth|token|secret|password|otp)/i;
function classifyBody(res) {
	const notes = [];
	const body = res.body ?? "";
	const ct = (res.contentType || "").toLowerCase();
	const trimmed = body.trim();
	if (res.error) return {
		kind: "error_text",
		json: null,
		notes: [res.error]
	};
	if (!trimmed) return {
		kind: "empty",
		json: null,
		notes: ["جسم الاستجابة فارغ"]
	};
	const lower = trimmed.toLowerCase();
	if (ct.includes("text/html") || /^<!doctype html|<html/i.test(trimmed)) {
		if (/attention required|cloudflare|access denied|captcha|cf-ray|just a moment/i.test(trimmed)) return {
			kind: "html_waf",
			json: null,
			notes: ["صفحة حماية / WAF"]
		};
		if (/form[^>]+password|name="password"|تسجيل الدخول|sign in|log in|login/i.test(trimmed)) return {
			kind: "html_login",
			json: null,
			notes: ["تبدو صفحة تسجيل دخول"]
		};
		return {
			kind: "html_other",
			json: null,
			notes: ["HTML غير JSON"]
		};
	}
	if (ct.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) try {
		const json = JSON.parse(trimmed);
		const kind = json && typeof json === "object" && !Array.isArray(json) ? "json_object" : "json_other";
		if (looksLikeApiError(json, res.status)) notes.push("شكل JSON يوحي برسالة خطأ");
		return {
			kind,
			json,
			notes
		};
	} catch {
		notes.push("Content-Type JSON لكن التحليل فشل");
	}
	if (res.status !== null && res.status >= 400) return {
		kind: "error_text",
		json: null,
		notes: [`HTTP ${res.status}`]
	};
	if (/unauthorized|forbidden|not allowed|غير مسموح/i.test(lower)) return {
		kind: "error_text",
		json: null,
		notes: ["نص رفض وصول"]
	};
	return {
		kind: "unknown",
		json: null,
		notes
	};
}
function looksLikeApiError(json, status) {
	if (!json || typeof json !== "object" || Array.isArray(json)) return false;
	const o = json;
	if (status && status >= 400) return true;
	const msg = String(o.error ?? o.message ?? o.statusDesc ?? "").toLowerCase();
	return /denied|unauthorized|forbidden|unauthenticated|not found/.test(msg);
}
function isObjectLike(c, res) {
	if (c.kind === "json_object" || c.kind === "json_other") return !looksLikeApiError(c.json, res.status);
	return false;
}
function comparePair(left, right) {
	const a = left.res.body;
	const b = right.res.body;
	const tokenJaccard = jaccard(tokens(a), tokens(b));
	const lengthRatio = Math.min(left.res.byteLength, right.res.byteLength) / Math.max(1, Math.max(left.res.byteLength, right.res.byteLength));
	let jsonKeyJaccard = 0;
	let sharedSensitiveHits = [];
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
		differentObjectHint
	};
}
function asRecord(json) {
	if (!json || typeof json !== "object") return null;
	if (Array.isArray(json)) {
		const first = json[0];
		if (first && typeof first === "object" && !Array.isArray(first)) return first;
		return null;
	}
	return json;
}
function flattenKeys(obj, prefix = "") {
	const keys = [];
	for (const [k, v] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${k}` : k;
		keys.push(path);
		if (v && typeof v === "object" && !Array.isArray(v)) keys.push(...flattenKeys(v, path));
	}
	return keys;
}
function firstId(obj) {
	for (const [k, v] of Object.entries(obj)) if (/^(id|orderid|userid|uuid)$/i.test(k) && (typeof v === "string" || typeof v === "number")) return String(v);
	return null;
}
function firstByKey(obj, re) {
	for (const [k, v] of Object.entries(obj)) if (re.test(k) && (typeof v === "string" || typeof v === "number")) return String(v);
	return null;
}
function tokens(text) {
	return new Set(text.toLowerCase().split(/[^a-z0-9_@.\u0600-\u06FF]+/i).filter((t) => t.length >= 3).slice(0, 400));
}
function jaccard(a, b) {
	if (a.size === 0 && b.size === 0) return 1;
	let inter = 0;
	for (const x of a) if (b.has(x)) inter++;
	const union = a.size + b.size - inter;
	return union === 0 ? 0 : inter / union;
}
function byKind(tests, kind) {
	return tests.find((t) => t.spec.kind === kind);
}
function denied(t) {
	if (!t) return false;
	const s = t.response.status;
	if (s === 401 || s === 403 || s === 404) return true;
	if (t.classified.kind === "html_login") return true;
	if (t.classified.kind === "error_text") return true;
	return false;
}
function transportFail(t) {
	return Boolean(t?.response.error) || t?.response.status === null;
}
function buildPairs(tests) {
	const need = [
		[
			"A يملك A  مقابل  B يقرأ A",
			"baseline_a",
			"cross_b_reads_a"
		],
		[
			"B يملك B  مقابل  B يقرأ A",
			"baseline_b",
			"cross_b_reads_a"
		],
		[
			"بدون جلسة  مقابل  B يقرأ A",
			"unauth_reads_a",
			"cross_b_reads_a"
		],
		[
			"A يملك A  مقابل  بدون جلسة",
			"baseline_a",
			"unauth_reads_a"
		]
	];
	const out = [];
	for (const [name, l, r] of need) {
		const left = byKind(tests, l);
		const right = byKind(tests, r);
		if (!left || !right) continue;
		out.push({
			name,
			left: l,
			right: r,
			evidence: comparePair({
				res: left.response,
				classified: left.classified
			}, {
				res: right.response,
				classified: right.classified
			})
		});
	}
	return out;
}
function decideVerdict(tests) {
	const aOwn = byKind(tests, "baseline_a");
	const bOwn = byKind(tests, "baseline_b");
	const bReadsA = byKind(tests, "cross_b_reads_a");
	const aReadsB = byKind(tests, "cross_a_reads_b");
	const unauthA = byKind(tests, "unauth_reads_a");
	const why = [];
	const whyNot = [];
	if (!aOwn || !bReadsA) return v("inconclusive", "none", "غير مكتمل", "لم تُنفَّذ الاختبارات الأساسية.", why, ["يلزم baseline للمالك A واختبار قراءة B لكائن A"]);
	if (transportFail(aOwn) || transportFail(bReadsA)) return v("transport_error", "none", "فشل النقل", "الطلب لم يصل أو رُفض قبل التطبيق (شبكة / SSRF guard / مهلة).", why, ["لا يمكن الحكم على صلاحيات الوصول بدون استجابة من الخادم"]);
	if (aOwn.classified.kind === "html_waf" || bReadsA.classified.kind === "html_waf") return v("inconclusive", "low", "حُجب بواسطة WAF", "الاستجابة صفحة حماية وليست بيانات كائن. هذا ليس إثبات IDOR.", why, ["WAF/Cloudflare لا يساوي ثغرة ولا يساوي حماية تطبيق"]);
	if (!(isObjectLike(aOwn.classified, aOwn.response) && is2xx(aOwn.response.status))) {
		whyNot.push("Baseline للمالك A لم يُرجع كائن JSON صالح — تحقق من الجلسة والمعرّف.");
		return v("inconclusive", "low", "Baseline فشل", "لا يمكن إثبات IDOR إذا كان المالك نفسه لا يحصل على الكائن.", why, whyNot);
	}
	const crossObj = isObjectLike(bReadsA.classified, bReadsA.response) && is2xx(bReadsA.response.status);
	const unauthObj = unauthA && isObjectLike(unauthA.classified, unauthA.response) && is2xx(unauthA.response.status);
	const ownerVsCross = comparePair({
		res: aOwn.response,
		classified: aOwn.classified
	}, {
		res: bReadsA.response,
		classified: bReadsA.classified
	});
	const bOwnOk = bOwn && isObjectLike(bOwn.classified, bOwn.response) && is2xx(bOwn.response.status);
	const bOwnVsCross = bOwnOk ? comparePair({
		res: bOwn.response,
		classified: bOwn.classified
	}, {
		res: bReadsA.response,
		classified: bReadsA.classified
	}) : null;
	const unauthVsCross = unauthA && !transportFail(unauthA) ? comparePair({
		res: unauthA.response,
		classified: unauthA.classified
	}, {
		res: bReadsA.response,
		classified: bReadsA.classified
	}) : null;
	if (unauthObj && ownerVsCross.tokenJaccard >= .7) {
		why.push("بدون مصادقة أُرجع نفس شكل بيانات المالك.");
		why.push(`تشابه النص مع كائن A = ${ownerVsCross.tokenJaccard}`);
		if (ownerVsCross.sharedSensitiveHits.length) why.push(`حقول حسّاسة ظاهرة: ${ownerVsCross.sharedSensitiveHits.join(", ")}`);
		return v("confirmed_unauthenticated_access", "high", "وصول بدون مصادقة", "الكائن يُقرأ بلا جلسة. هذا Broken Authentication / missing access control — ليس IDOR أفقي كلاسيكي.", why, ["لا تسمّه IDOR في التقرير إلا إذا أثبتّ أيضاً أن مستخدماً آخر يصل لكائن ليس له بعد تسجيل الدخول"]);
	}
	if (denied(bReadsA) && !crossObj) {
		why.push(`B→A رجع ${bReadsA.response.status ?? "?"} (${bReadsA.classified.kind}).`);
		if (aReadsB && denied(aReadsB)) why.push("الاتجاه العكسي مرفوض أيضاً.");
		return v("protected", "high", "محمي في هذا الاختبار", "المستخدم B لم يحصل على كائن A. لا تُبلغ عن IDOR من هذه العينة.", why, []);
	}
	if (!crossObj) {
		whyNot.push(`B→A رجع ${bReadsA.response.status ?? "?"} / ${bReadsA.classified.kind} وليس كائن بيانات.`);
		return v("inconclusive", "low", "غير حاسم", "الاستجابة ليست رفضاً واضحاً وليست كائن المالك. لا تكتب Confirmed.", why, whyNot);
	}
	const similarToOwner = ownerVsCross.sameObjectHint || ownerVsCross.tokenJaccard >= .62 || ownerVsCross.jsonKeyJaccard >= .7 && ownerVsCross.lengthRatio >= .55;
	const distinctFromAttackerOwn = !bOwnVsCross || bOwnVsCross.differentObjectHint || bOwnVsCross.tokenJaccard < .85 || !bOwnOk;
	const notJustPublic = !unauthObj && (!unauthVsCross || unauthVsCross.tokenJaccard < .72 || denied(unauthA));
	if (similarToOwner && distinctFromAttackerOwn && notJustPublic) {
		why.push("B حصل على 2xx وكائن JSON.");
		why.push(`تشابه B→A مع كائن A: tokens=${ownerVsCross.tokenJaccard} keys=${ownerVsCross.jsonKeyJaccard}`);
		if (ownerVsCross.sameObjectHint) why.push("نفس معرّف الكائن ظاهر في الاستجابتين.");
		if (ownerVsCross.sharedSensitiveHits.length) why.push(`حقول حسّاسة مشتركة: ${ownerVsCross.sharedSensitiveHits.join(", ")}`);
		if (bOwnOk && bOwnVsCross) why.push(`كائن B نفسه مختلف عن المسروق (tokens=${bOwnVsCross.tokenJaccard}) — ليست صفحة عامة واحدة للجميع.`);
		if (unauthA && denied(unauthA)) why.push("بدون جلسة رُفض — المشكلة صلاحيات بين مستخدمين وليست مورداً عاماً.");
		const high = ownerVsCross.sameObjectHint || ownerVsCross.sharedSensitiveHits.length > 0 || ownerVsCross.tokenJaccard >= .8;
		return v("confirmed_horizontal_idor", high ? "high" : "medium", "IDOR أفقي مؤكد", "مستخدم B قرأ كائن المستخدم A. هذه نتيجة قابلة للتقرير إذا كان الكائن حسّاساً وضمن النطاق.", why, high ? [] : ["التشابه متوسط — أرفق الاستجابتين الخام في التقرير ولا تعتمد على الخلاصة وحدها"]);
	}
	if (similarToOwner && !notJustPublic) {
		why.push("B يرى بيانات تشبه كائن A، لكن بدون جلسة تُرجع شيئاً مشابهاً.");
		return v("public_or_same_for_everyone", "medium", "قد يكون مورداً عاماً", "البيانات متاحة بشكل متشابه بدون هوية. لا تسمّه IDOR حتى تثبت فرقاً بين المستخدمين.", why, ["IDOR يتطلب أن الكائن ملكية خاصة وأن مستخدماً آخر يتجاوز التحقق"]);
	}
	if (similarToOwner && !distinctFromAttackerOwn) {
		whyNot.push("استجابة B→A تشبه كائن B نفسه — ربما قالب واحد أو قائمة عامة.");
		return v("public_or_same_for_everyone", "low", "نفس المحتوى لكل الجلسات", "لا دليل أن B رأى بيانات A تحديداً.", why, whyNot);
	}
	if (is2xx(bReadsA.response.status) && bReadsA.classified.kind === "json_object") {
		why.push("B→A JSON 2xx لكن التشابه مع كائن A غير كافٍ للإثبات.");
		why.push(`tokens=${ownerVsCross.tokenJaccard} keys=${ownerVsCross.jsonKeyJaccard}`);
		return v("likely_idor", "low", "محتمل — يحتاج مقارنة يدوية", "لا تكتب Confirmed. افتح الجسمين جنباً إلى جنب وتأكد أن بيانات A ظاهرة عند B.", why, ["الأداة لا تخمّن PII إذا لم تتطابق الحقول"]);
	}
	return v("inconclusive", "low", "غير حاسم", "لا إثبات ولا نفي قوي.", why, whyNot.length ? whyNot : ["أضف جلسة B صالحة ومعرّف كائن يملكه B"]);
}
function is2xx(status) {
	return status !== null && status >= 200 && status < 300;
}
function v(finding, confidence, title, summary, why, whyNotConfirmed) {
	return {
		finding,
		confidence,
		title,
		summary,
		why,
		whyNotConfirmed,
		reportable: finding === "confirmed_horizontal_idor" || finding === "confirmed_unauthenticated_access"
	};
}
function findingLabel(f) {
	switch (f) {
		case "confirmed_horizontal_idor": return "IDOR مؤكد";
		case "confirmed_unauthenticated_access": return "وصول بلا مصادقة";
		case "likely_idor": return "محتمل";
		case "protected": return "محمي";
		case "public_or_same_for_everyone": return "عام / متطابق";
		case "inconclusive": return "غير حاسم";
		case "transport_error": return "خطأ نقل";
	}
}
function endpointLine(opts) {
	return `${opts.method} ${opts.urlTemplate}  ·  ${opts.paramLocation}:${opts.paramKey}`;
}
function toCurl(opts) {
	const parts = [`curl -i -sS -X ${opts.method} ${shell(opts.url)}`];
	for (const [k, v] of Object.entries(opts.headers)) {
		if (!v) continue;
		parts.push(`  -H ${shell(`${k}: ${v}`)}`);
	}
	if (opts.body && opts.method !== "GET" && opts.method !== "HEAD") parts.push(`  --data-raw ${shell(opts.body)}`);
	return parts.join(" \\\n");
}
function shell(s) {
	return `'${s.replace(/'/g, `'\\''`)}'`;
}
function buildReportMarkdown(result) {
	const e = result.endpoint;
	const v = result.verdict;
	const lines = [];
	lines.push(`# ${v.title}`);
	lines.push("");
	lines.push(`**Class:** ${findingLabel(v.finding)} (${v.confidence} confidence)`);
	lines.push(`**Reportable per Witness rules:** ${v.reportable ? "YES" : "NO — do not submit as confirmed"}`);
	lines.push("");
	lines.push("## Endpoint");
	lines.push("```");
	lines.push(endpointLine(e));
	lines.push(`ID A (victim object): ${e.idA}`);
	lines.push(`ID B (attacker object): ${e.idB || "(not provided)"}`);
	lines.push("```");
	lines.push("");
	lines.push("## Summary");
	lines.push(v.summary);
	lines.push("");
	lines.push("## Evidence the tool used");
	for (const w of v.why) lines.push(`- ${w}`);
	if (v.whyNotConfirmed.length) {
		lines.push("");
		lines.push("## Why this is NOT marked confirmed (if any)");
		for (const w of v.whyNotConfirmed) lines.push(`- ${w}`);
	}
	lines.push("");
	lines.push("## Tests");
	lines.push("| Test | Identity | Object | Status | Bytes | Body kind |");
	lines.push("|---|---|---|---|---|---|");
	for (const t of result.tests) lines.push(`| ${t.spec.title} | ${t.identityUsed} | ${t.objectId} | ${t.response.status ?? t.response.error ?? "-"} | ${t.response.byteLength} | ${t.classified.kind} |`);
	lines.push("");
	lines.push("## Reproduction");
	lines.push("1. Create two users (A victim, B attacker) authorized in-scope.");
	lines.push("2. As A, call the endpoint on A's object — save the JSON.");
	lines.push("3. As B, replay the same request with B's session and A's object id.");
	lines.push("4. Compare bodies. Impact = B reads A's private fields.");
	lines.push("");
	lines.push("## curl");
	for (const c of result.curls) {
		lines.push(`### ${c.label}`);
		lines.push("```bash");
		lines.push(c.command);
		lines.push("```");
		lines.push("");
	}
	lines.push("## Response snippets");
	for (const t of result.tests) {
		lines.push(`### ${t.spec.title} — ${t.response.status ?? "err"}`);
		lines.push("```");
		lines.push(t.response.body.slice(0, 1200) || t.response.error || "(empty)");
		lines.push("```");
		lines.push("");
	}
	lines.push("---");
	lines.push(`_Generated by Witness. Mode=${result.mode}. The tool never invents a confirmed finding without two identities and matching object evidence._`);
	return lines.join("\n");
}
//#endregion
export { endpointLine as a, decideVerdict as i, buildReportMarkdown as n, findingLabel as o, classifyBody as r, toCurl as s, buildPairs as t };
