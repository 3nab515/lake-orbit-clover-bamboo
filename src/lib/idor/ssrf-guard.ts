import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google",
  "instance-data",
]);

export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("رابط الهدف غير صالح");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("يُسمح فقط بـ http/https");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("المضيف محظور (محلي / metadata)");
  }
  if (host === "0.0.0.0") throw new Error("المضيف محظور");

  const ipLiteral = isIP(host);
  if (ipLiteral) {
    if (isPrivateIp(host)) throw new Error("عناوين IP الخاصة محظورة");
    return url;
  }

  const results = await lookup(host, { all: true });
  if (!results.length) throw new Error("تعذر حل اسم المضيف");
  for (const r of results) {
    if (isPrivateIp(r.address)) {
      throw new Error("اسم المضيف يشير إلى شبكة خاصة — مرفوض");
    }
  }
  return url;
}

export function isPrivateIp(ip: string): boolean {
  const v4 = ip.includes(".") && !ip.includes(":") ? ip : mappedV4(ip);
  if (v4) {
    const p = v4.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
  }
  const x = ip.toLowerCase();
  if (x === "::1" || x === "::") return true;
  if (x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80")) return true;
  return false;
}

function mappedV4(ip: string): string | null {
  const m = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return m?.[1] ?? null;
}
