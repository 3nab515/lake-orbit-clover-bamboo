import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as endpointLine, o as findingLabel } from "./report-CfHw96hb.mjs";
import { t as demoRawRequest } from "./demo-api-DsKBIbDU.mjs";
import { a as Play, c as Check, i as ShieldAlert, n as Shield, o as LoaderCircle, r as ShieldOff, s as Copy } from "../_libs/lucide-react.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-eqbFZL8e.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var analyzeRequest = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("18591b310f2f01c1e1952f515818aa93f7b31163c1ba8acc8ec0c62d69756590"));
var runAccessSuite = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("c191430a360fbdda0b3e9b02494f9b203bec14ba61d49f2fe5fa89064b2fc081"));
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 min-h-11 px-4", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:bg-accent/90",
			secondary: "bg-surface-2 text-fg border border-border hover:bg-surface",
			ghost: "text-muted hover:text-fg hover:bg-surface-2",
			danger: "bg-bad text-fg hover:bg-bad/90"
		},
		size: {
			default: "h-11",
			sm: "h-9 min-h-9 px-3 text-xs"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
function LabApp() {
	const [raw, setRaw] = (0, import_react.useState)("");
	const [sessionA, setSessionA] = (0, import_react.useState)({
		label: "A",
		cookie: "",
		authorization: ""
	});
	const [sessionB, setSessionB] = (0, import_react.useState)({
		label: "B",
		cookie: "",
		authorization: ""
	});
	const [candidates, setCandidates] = (0, import_react.useState)([]);
	const [parsed, setParsed] = (0, import_react.useState)(null);
	const [paramKey, setParamKey] = (0, import_react.useState)("");
	const [paramLocation, setParamLocation] = (0, import_react.useState)("path");
	const [idA, setIdA] = (0, import_react.useState)("");
	const [idB, setIdB] = (0, import_react.useState)("");
	const [authorized, setAuthorized] = (0, import_react.useState)(false);
	const [mode, setMode] = (0, import_react.useState)("live");
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [result, setResult] = (0, import_react.useState)(null);
	const [copied, setCopied] = (0, import_react.useState)(null);
	const selected = candidates.find((c) => c.key === paramKey && c.location === paramLocation);
	const loadDemo = (insecure) => {
		const origin = window.location.origin;
		const req = demoRawRequest(origin, insecure, "1001");
		setRaw(req);
		setMode("demo");
		setAuthorized(true);
		setSessionA({
			label: "A · alice",
			cookie: "witness-session=alice",
			authorization: ""
		});
		setSessionB({
			label: "B · bob",
			cookie: "witness-session=bob",
			authorization: ""
		});
		setIdA("1001");
		setIdB("1002");
		setParamKey("path:5");
		setParamLocation("path");
		setResult(null);
		setError(null);
		setParsed(null);
		setCandidates([{
			key: "path:5",
			value: "1001",
			location: "path",
			confidence: "high",
			reason: "جزء مسار orders/1001"
		}]);
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
			const out = await runAccessSuite({ data: {
				raw,
				sessionA,
				sessionB,
				paramKey,
				paramLocation,
				idA,
				idB,
				authorized,
				mode
			} });
			setResult(out);
		} catch (e) {
			setError(e instanceof Error ? e.message : "فشل التنفيذ");
		} finally {
			setBusy(null);
		}
	};
	const copy = async (key, text) => {
		await navigator.clipboard.writeText(text);
		setCopied(key);
		setTimeout(() => setCopied(null), 1400);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-4 border-b border-border pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-10 items-center justify-center rounded-lg border border-border bg-surface",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, {
							className: "size-5 text-accent",
							strokeWidth: 1.6
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs tracking-[0.18em] text-muted uppercase",
						children: "Access control lab"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-semibold tracking-tight sm:text-3xl",
						children: "Witness"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "max-w-2xl text-sm leading-relaxed text-muted",
					children: "مختبر إثبات لثغرات IDOR وصلاحيات الوصول. لا يعلن «ثغرة» إلا إذا قارن جلستين واستجابتين. يعطيك الـ endpoint وcURL جاهزين للتقرير."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Honesty, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					onClick: () => loadDemo(true),
					variant: "secondary",
					className: "justify-start",
					children: "تحميل مختبر ضعيف (IDOR متعمّد)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					onClick: () => loadDemo(false),
					variant: "secondary",
					className: "justify-start",
					children: "تحميل مختبر محمي (يجب أن يفشل الإثبات)"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-surface p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium",
							children: "طلب HTTP الخام"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[11px] text-subtle",
							children: "من Burp Repeater"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: raw,
						onChange: (e) => setRaw(e.target.value),
						spellCheck: false,
						placeholder: "GET /api/orders/1001 HTTP/1.1\nHost: target.example\nCookie: session=...",
						className: "min-h-44 w-full rounded-md border border-border bg-bg px-3 py-3 font-mono text-xs leading-relaxed text-fg outline-none focus:ring-2 focus:ring-accent/30"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							size: "sm",
							variant: "secondary",
							onClick: onAnalyze,
							disabled: !raw || busy !== null,
							children: [busy === "analyze" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : null, "استخراج المعرّفات"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-xs text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "الوضع" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: mode,
								onChange: (e) => setMode(e.target.value),
								className: "h-9 rounded-md border border-border bg-bg px-2 text-fg",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "demo",
									children: "عرض داخلي"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "live",
									children: "هدف حي (مخوّل)"
								})]
							})]
						})]
					}),
					parsed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 font-mono text-xs text-info",
						children: [
							parsed.method,
							" ",
							parsed.url
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdentityCard, {
					title: "جلسة A — الضحية",
					value: sessionA,
					onChange: setSessionA
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdentityCard, {
					title: "جلسة B — المهاجم",
					value: sessionB,
					onChange: setSessionB
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-surface p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mb-3 text-sm font-medium",
						children: "معرّف الكائن"
					}),
					candidates.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "حلّل الطلب أولاً. لن نخمّن معرّفاً من تلقاء أنفسنا."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col gap-2",
						children: candidates.map((c) => {
							const active = c.key === paramKey && c.location === paramLocation;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setParamKey(c.key);
									setParamLocation(c.location);
									setIdA(c.value);
								},
								className: cn("flex w-full flex-col gap-1 rounded-md border px-3 py-3 text-right transition-colors", active ? "border-accent/40 bg-bg" : "border-border bg-surface-2 hover:border-muted/40"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono text-xs text-fg",
										children: [
											c.location,
											":",
											c.key,
											" = ",
											c.value
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("text-[10px] uppercase tracking-wide", c.confidence === "high" ? "text-ok" : c.confidence === "medium" ? "text-warn" : "text-subtle"),
										children: c.confidence
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted",
									children: c.reason
								})]
							}) }, `${c.location}:${c.key}:${c.value}`);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "معرّف يملكه A",
							value: idA,
							onChange: setIdA
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "معرّف يملكه B",
							value: idB,
							onChange: setIdB
						})]
					}),
					selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-subtle",
						children: [
							"سيتم استبدال ",
							selected.location,
							":",
							selected.key,
							" فقط. لن نلمس التوكن أو CSRF."
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-start gap-3 text-sm leading-relaxed text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: authorized,
							onChange: (e) => setAuthorized(e.target.checked),
							className: "mt-1 size-4 accent-accent"
						}), "أؤكد أنني مخوّل باختبار هذا الهدف (برنامج مكافآت / نطاق مكتوب / مختبر العرض)."]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						onClick: onRun,
						disabled: busy !== null || !raw || !paramKey,
						children: [busy === "run" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), "تشغيل مقارنة الجلسات"]
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-bad",
						children: error
					}) : null
				]
			}),
			result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultPanel, {
				result,
				copied,
				onCopy: copy
			}) : null
		]
	});
}
function Honesty() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "rounded-xl border border-border bg-surface-2 px-4 py-4 text-sm leading-relaxed text-muted",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 font-medium text-fg",
			children: "عقد الصدق"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "flex list-disc flex-col gap-1 pr-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Confirmed فقط إذا B حصل على كائن A، والجلسة غير المصادق عليها لا تفسّر النتيجة." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "403/401 = محمي. صفحة Cloudflare = غير حاسم. لا تقرير." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "إذا الجميع يرى نفس JSON فهذه ليست IDOR." })
			]
		})]
	});
}
function IdentityCard({ title, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mb-3 text-sm font-medium",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "الاسم في التقرير",
					value: value.label,
					onChange: (label) => onChange({
						...value,
						label
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Cookie",
					value: value.cookie,
					onChange: (cookie) => onChange({
						...value,
						cookie
					}),
					mono: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Authorization",
					value: value.authorization,
					onChange: (authorization) => onChange({
						...value,
						authorization
					}),
					mono: true
				})
			]
		})]
	});
}
function Field({ label, value, onChange, mono }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex flex-col gap-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			value,
			onChange: (e) => onChange(e.target.value),
			className: cn("h-11 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/30", mono && "font-mono text-xs")
		})]
	});
}
function ResultPanel({ result, copied, onCopy }) {
	const tone = toneFor(result.verdict.finding);
	const ep = endpointLine(result.endpoint);
	const snippet = (0, import_react.useMemo)(() => {
		return result.tests.find((t) => t.spec.kind === "cross_b_reads_a")?.response.body.slice(0, 900) ?? "";
	}, [result]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("rounded-xl border p-5", tone.box),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center gap-2",
						children: [tone.icon, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-semibold",
							children: result.verdict.title
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: result.verdict.summary
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-xs text-fg",
						children: [
							findingLabel(result.verdict.finding),
							" · ثقة ",
							result.verdict.confidence,
							" ·",
							" ",
							result.verdict.reportable ? "قابل للتقرير" : "لا تُرسل كمؤكد"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface p-4 sm:p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-medium",
						children: "Endpoint"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyBtn, {
						ok: copied === "ep",
						onClick: () => onCopy("ep", ep)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("pre", {
					className: "overflow-x-auto rounded-md bg-bg p-3 font-mono text-xs leading-relaxed text-fg",
					dir: "ltr",
					children: [
						ep,
						"\n",
						"idA=",
						result.endpoint.idA,
						"  idB=",
						result.endpoint.idB || "—"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-xl border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[640px] text-right text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-surface-2 text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "اختبار"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "هوية"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "ID"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "Status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "Bytes"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-medium",
								children: "نوع الجسم"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: result.tests.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2",
								children: t.spec.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono",
								children: t.identityUsed
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono",
								children: t.objectId
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono",
								children: t.response.status ?? t.response.error ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono",
								children: t.response.byteLength
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2",
								children: t.classified.kind
							})
						]
					}, t.spec.kind)) })]
				})
			}),
			result.pairs.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 text-sm font-medium",
					children: "مقارنات"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-2 text-xs text-muted",
					children: result.pairs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md bg-bg px-3 py-2 font-mono",
						children: [
							p.name,
							" · tokens=",
							p.evidence.tokenJaccard,
							" keys=",
							p.evidence.jsonKeyJaccard,
							" ",
							"len=",
							p.evidence.lengthRatio,
							p.evidence.sameObjectHint ? " · same-object" : "",
							p.evidence.sharedSensitiveHits.length ? ` · ${p.evidence.sharedSensitiveHits.join(",")}` : ""
						]
					}, p.name))
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-2 text-sm font-medium",
					children: "لماذا هذا الحكم"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "list-disc pr-5 text-sm leading-relaxed text-muted",
					children: [result.verdict.why.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: w }, w)), result.verdict.whyNotConfirmed.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: w }, w))]
				})]
			}),
			snippet ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-2 text-sm font-medium",
					children: "عيّنة جسم B→A"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "max-h-56 overflow-auto rounded-md bg-bg p-3 font-mono text-[11px] text-fg",
					dir: "ltr",
					children: snippet
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-2",
				children: result.curls.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-surface p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-medium",
							children: c.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyBtn, {
							ok: copied === c.label,
							onClick: () => onCopy(c.label, c.command)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "overflow-x-auto font-mono text-[11px] text-muted",
						dir: "ltr",
						children: c.command
					})]
				}, c.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-medium",
						children: "تقرير Markdown"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyBtn, {
						ok: copied === "md",
						onClick: () => onCopy("md", result.reportMarkdown)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "max-h-80 overflow-auto rounded-md bg-bg p-3 font-mono text-[11px] leading-relaxed text-fg",
					dir: "ltr",
					children: result.reportMarkdown
				})]
			})
		]
	});
}
function CopyBtn({ ok, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		type: "button",
		size: "sm",
		variant: "ghost",
		onClick,
		children: [ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), ok ? "تم" : "نسخ"]
	});
}
function toneFor(f) {
	if (f === "confirmed_horizontal_idor" || f === "confirmed_unauthenticated_access") return {
		box: "border-bad/40 bg-bad/10",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "size-5 text-bad" })
	};
	if (f === "protected") return {
		box: "border-ok/40 bg-ok/10",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-5 text-ok" })
	};
	if (f === "likely_idor") return {
		box: "border-warn/40 bg-warn/10",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "size-5 text-warn" })
	};
	return {
		box: "border-border bg-surface",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldOff, { className: "size-5 text-muted" })
	};
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-screen bg-bg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LabApp, {})
	});
}
//#endregion
export { Home as component };
