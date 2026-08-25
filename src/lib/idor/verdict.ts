import { comparePair, isObjectLike } from "./compare";
import type {
  ExecutedTest,
  FindingClass,
  PairEvidence,
  SuiteVerdict,
  TestKind,
} from "./types";

function byKind(tests: ExecutedTest[], kind: TestKind): ExecutedTest | undefined {
  return tests.find((t) => t.spec.kind === kind);
}

function denied(t: ExecutedTest | undefined): boolean {
  if (!t) return false;
  const s = t.response.status;
  if (s === 401 || s === 403 || s === 404) return true;
  if (t.classified.kind === "html_login") return true;
  if (t.classified.kind === "error_text") return true;
  return false;
}

function transportFail(t: ExecutedTest | undefined): boolean {
  return Boolean(t?.response.error) || t?.response.status === null;
}

export function buildPairs(tests: ExecutedTest[]): {
  name: string;
  left: TestKind;
  right: TestKind;
  evidence: PairEvidence;
}[] {
  const need: [string, TestKind, TestKind][] = [
    ["A يملك A  مقابل  B يقرأ A", "baseline_a", "cross_b_reads_a"],
    ["B يملك B  مقابل  B يقرأ A", "baseline_b", "cross_b_reads_a"],
    ["بدون جلسة  مقابل  B يقرأ A", "unauth_reads_a", "cross_b_reads_a"],
    ["A يملك A  مقابل  بدون جلسة", "baseline_a", "unauth_reads_a"],
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
      evidence: comparePair(
        { res: left.response, classified: left.classified },
        { res: right.response, classified: right.classified },
      ),
    });
  }
  return out;
}

export function decideVerdict(tests: ExecutedTest[]): SuiteVerdict {
  const aOwn = byKind(tests, "baseline_a");
  const bOwn = byKind(tests, "baseline_b");
  const bReadsA = byKind(tests, "cross_b_reads_a");
  const aReadsB = byKind(tests, "cross_a_reads_b");
  const unauthA = byKind(tests, "unauth_reads_a");

  const why: string[] = [];
  const whyNot: string[] = [];

  if (!aOwn || !bReadsA) {
    return v("inconclusive", "none", "غير مكتمل", "لم تُنفَّذ الاختبارات الأساسية.", why, [
      "يلزم baseline للمالك A واختبار قراءة B لكائن A",
    ]);
  }

  if (transportFail(aOwn) || transportFail(bReadsA)) {
    return v(
      "transport_error",
      "none",
      "فشل النقل",
      "الطلب لم يصل أو رُفض قبل التطبيق (شبكة / SSRF guard / مهلة).",
      why,
      ["لا يمكن الحكم على صلاحيات الوصول بدون استجابة من الخادم"],
    );
  }

  if (aOwn.classified.kind === "html_waf" || bReadsA.classified.kind === "html_waf") {
    return v(
      "inconclusive",
      "low",
      "حُجب بواسطة WAF",
      "الاستجابة صفحة حماية وليست بيانات كائن. هذا ليس إثبات IDOR.",
      why,
      ["WAF/Cloudflare لا يساوي ثغرة ولا يساوي حماية تطبيق"],
    );
  }

  const aOk = isObjectLike(aOwn.classified, aOwn.response) && is2xx(aOwn.response.status);
  if (!aOk) {
    whyNot.push("Baseline للمالك A لم يُرجع كائن JSON صالح — تحقق من الجلسة والمعرّف.");
    return v(
      "inconclusive",
      "low",
      "Baseline فشل",
      "لا يمكن إثبات IDOR إذا كان المالك نفسه لا يحصل على الكائن.",
      why,
      whyNot,
    );
  }

  const crossObj = isObjectLike(bReadsA.classified, bReadsA.response) && is2xx(bReadsA.response.status);
  const unauthObj =
    unauthA && isObjectLike(unauthA.classified, unauthA.response) && is2xx(unauthA.response.status);

  const ownerVsCross = comparePair(
    { res: aOwn.response, classified: aOwn.classified },
    { res: bReadsA.response, classified: bReadsA.classified },
  );

  const bOwnOk = bOwn && isObjectLike(bOwn.classified, bOwn.response) && is2xx(bOwn.response.status);
  const bOwnVsCross = bOwnOk
    ? comparePair(
        { res: bOwn.response, classified: bOwn.classified },
        { res: bReadsA.response, classified: bReadsA.classified },
      )
    : null;

  const unauthVsCross =
    unauthA && !transportFail(unauthA)
      ? comparePair(
          { res: unauthA.response, classified: unauthA.classified },
          { res: bReadsA.response, classified: bReadsA.classified },
        )
      : null;

  if (unauthObj && ownerVsCross.tokenJaccard >= 0.7) {
    why.push("بدون مصادقة أُرجع نفس شكل بيانات المالك.");
    why.push(`تشابه النص مع كائن A = ${ownerVsCross.tokenJaccard}`);
    if (ownerVsCross.sharedSensitiveHits.length) {
      why.push(`حقول حسّاسة ظاهرة: ${ownerVsCross.sharedSensitiveHits.join(", ")}`);
    }
    return v(
      "confirmed_unauthenticated_access",
      "high",
      "وصول بدون مصادقة",
      "الكائن يُقرأ بلا جلسة. هذا Broken Authentication / missing access control — ليس IDOR أفقي كلاسيكي.",
      why,
      ["لا تسمّه IDOR في التقرير إلا إذا أثبتّ أيضاً أن مستخدماً آخر يصل لكائن ليس له بعد تسجيل الدخول"],
    );
  }

  if (denied(bReadsA) && !crossObj) {
    why.push(`B→A رجع ${bReadsA.response.status ?? "?"} (${bReadsA.classified.kind}).`);
    if (aReadsB && denied(aReadsB)) why.push("الاتجاه العكسي مرفوض أيضاً.");
    return v(
      "protected",
      "high",
      "محمي في هذا الاختبار",
      "المستخدم B لم يحصل على كائن A. لا تُبلغ عن IDOR من هذه العينة.",
      why,
      [],
    );
  }

  if (!crossObj) {
    whyNot.push(
      `B→A رجع ${bReadsA.response.status ?? "?"} / ${bReadsA.classified.kind} وليس كائن بيانات.`,
    );
    return v(
      "inconclusive",
      "low",
      "غير حاسم",
      "الاستجابة ليست رفضاً واضحاً وليست كائن المالك. لا تكتب Confirmed.",
      why,
      whyNot,
    );
  }

  const similarToOwner =
    ownerVsCross.sameObjectHint ||
    ownerVsCross.tokenJaccard >= 0.62 ||
    (ownerVsCross.jsonKeyJaccard >= 0.7 && ownerVsCross.lengthRatio >= 0.55);

  const distinctFromAttackerOwn =
    !bOwnVsCross ||
    bOwnVsCross.differentObjectHint ||
    bOwnVsCross.tokenJaccard < 0.85 ||
    !bOwnOk;

  const notJustPublic =
    !unauthObj &&
    (!unauthVsCross || unauthVsCross.tokenJaccard < 0.72 || denied(unauthA));

  if (similarToOwner && distinctFromAttackerOwn && notJustPublic) {
    why.push("B حصل على 2xx وكائن JSON.");
    why.push(`تشابه B→A مع كائن A: tokens=${ownerVsCross.tokenJaccard} keys=${ownerVsCross.jsonKeyJaccard}`);
    if (ownerVsCross.sameObjectHint) why.push("نفس معرّف الكائن ظاهر في الاستجابتين.");
    if (ownerVsCross.sharedSensitiveHits.length) {
      why.push(`حقول حسّاسة مشتركة: ${ownerVsCross.sharedSensitiveHits.join(", ")}`);
    }
    if (bOwnOk && bOwnVsCross) {
      why.push(
        `كائن B نفسه مختلف عن المسروق (tokens=${bOwnVsCross.tokenJaccard}) — ليست صفحة عامة واحدة للجميع.`,
      );
    }
    if (unauthA && denied(unauthA)) why.push("بدون جلسة رُفض — المشكلة صلاحيات بين مستخدمين وليست مورداً عاماً.");
    const high =
      ownerVsCross.sameObjectHint || ownerVsCross.sharedSensitiveHits.length > 0 || ownerVsCross.tokenJaccard >= 0.8;
    return v(
      "confirmed_horizontal_idor",
      high ? "high" : "medium",
      "IDOR أفقي مؤكد",
      "مستخدم B قرأ كائن المستخدم A. هذه نتيجة قابلة للتقرير إذا كان الكائن حسّاساً وضمن النطاق.",
      why,
      high ? [] : ["التشابه متوسط — أرفق الاستجابتين الخام في التقرير ولا تعتمد على الخلاصة وحدها"],
    );
  }

  if (similarToOwner && !notJustPublic) {
    why.push("B يرى بيانات تشبه كائن A، لكن بدون جلسة تُرجع شيئاً مشابهاً.");
    return v(
      "public_or_same_for_everyone",
      "medium",
      "قد يكون مورداً عاماً",
      "البيانات متاحة بشكل متشابه بدون هوية. لا تسمّه IDOR حتى تثبت فرقاً بين المستخدمين.",
      why,
      ["IDOR يتطلب أن الكائن ملكية خاصة وأن مستخدماً آخر يتجاوز التحقق"],
    );
  }

  if (similarToOwner && !distinctFromAttackerOwn) {
    whyNot.push("استجابة B→A تشبه كائن B نفسه — ربما قالب واحد أو قائمة عامة.");
    return v(
      "public_or_same_for_everyone",
      "low",
      "نفس المحتوى لكل الجلسات",
      "لا دليل أن B رأى بيانات A تحديداً.",
      why,
      whyNot,
    );
  }

  if (is2xx(bReadsA.response.status) && bReadsA.classified.kind === "json_object") {
    why.push("B→A JSON 2xx لكن التشابه مع كائن A غير كافٍ للإثبات.");
    why.push(`tokens=${ownerVsCross.tokenJaccard} keys=${ownerVsCross.jsonKeyJaccard}`);
    return v(
      "likely_idor",
      "low",
      "محتمل — يحتاج مقارنة يدوية",
      "لا تكتب Confirmed. افتح الجسمين جنباً إلى جنب وتأكد أن بيانات A ظاهرة عند B.",
      why,
      ["الأداة لا تخمّن PII إذا لم تتطابق الحقول"],
    );
  }

  return v(
    "inconclusive",
    "low",
    "غير حاسم",
    "لا إثبات ولا نفي قوي.",
    why,
    whyNot.length ? whyNot : ["أضف جلسة B صالحة ومعرّف كائن يملكه B"],
  );
}

function is2xx(status: number | null): boolean {
  return status !== null && status >= 200 && status < 300;
}

function v(
  finding: FindingClass,
  confidence: SuiteVerdict["confidence"],
  title: string,
  summary: string,
  why: string[],
  whyNotConfirmed: string[],
): SuiteVerdict {
  const reportable =
    finding === "confirmed_horizontal_idor" || finding === "confirmed_unauthenticated_access";
  return { finding, confidence, title, summary, why, whyNotConfirmed, reportable };
}

export function findingLabel(f: FindingClass): string {
  switch (f) {
    case "confirmed_horizontal_idor":
      return "IDOR مؤكد";
    case "confirmed_unauthenticated_access":
      return "وصول بلا مصادقة";
    case "likely_idor":
      return "محتمل";
    case "protected":
      return "محمي";
    case "public_or_same_for_everyone":
      return "عام / متطابق";
    case "inconclusive":
      return "غير حاسم";
    case "transport_error":
      return "خطأ نقل";
  }
}
