import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyBody } from "./compare.ts";
import { decideVerdict } from "./verdict.ts";
import type { ExecutedTest, ProbeResponse, TestSpec } from "./types.ts";

function res(partial: Partial<ProbeResponse> & { body: string; status: number }): ProbeResponse {
  return {
    ok: partial.status >= 200 && partial.status < 400,
    error: undefined,
    statusText: "OK",
    redirected: false,
    location: null,
    contentType: "application/json",
    bodyTruncated: false,
    byteLength: partial.body.length,
    elapsedMs: 1,
    finalUrl: "https://example.test/o",
    ...partial,
  };
}

function test(
  kind: TestSpec["kind"],
  title: string,
  response: ProbeResponse,
): ExecutedTest {
  const classified = classifyBody(response);
  return {
    spec: {
      kind,
      title,
      purpose: "",
      identity: kind.startsWith("unauth") ? "none" : kind.includes("b_reads") || kind === "baseline_b" ? "B" : "A",
      objectOwner: kind.includes("reads_b") || kind === "baseline_b" ? "B" : "A",
    },
    requestUrl: "https://example.test/o/1",
    method: "GET",
    identityUsed: "x",
    objectId: "1",
    response,
    classified,
  };
}

const alice = {
  orderId: "1001",
  ownerId: "alice",
  email: "alice@example.invalid",
  amountSar: 50,
};
const bob = {
  orderId: "1002",
  ownerId: "bob",
  email: "bob@example.invalid",
  amountSar: 9,
};

describe("decideVerdict honesty", () => {
  it("confirms horizontal IDOR when B receives A's object", () => {
    const v = decideVerdict([
      test("baseline_a", "a", res({ status: 200, body: JSON.stringify(alice) })),
      test("baseline_b", "b", res({ status: 200, body: JSON.stringify(bob) })),
      test("cross_b_reads_a", "x", res({ status: 200, body: JSON.stringify(alice) })),
      test("unauth_reads_a", "u", res({ status: 401, body: JSON.stringify({ error: "unauthenticated" }) })),
    ]);
    assert.equal(v.finding, "confirmed_horizontal_idor");
    assert.equal(v.reportable, true);
  });

  it("does not confirm when B is forbidden", () => {
    const v = decideVerdict([
      test("baseline_a", "a", res({ status: 200, body: JSON.stringify(alice) })),
      test("cross_b_reads_a", "x", res({ status: 403, body: JSON.stringify({ error: "forbidden" }) })),
      test("unauth_reads_a", "u", res({ status: 401, body: JSON.stringify({ error: "unauthenticated" }) })),
    ]);
    assert.equal(v.finding, "protected");
    assert.equal(v.reportable, false);
  });

  it("labels unauthenticated access separately from IDOR", () => {
    const v = decideVerdict([
      test("baseline_a", "a", res({ status: 200, body: JSON.stringify(alice) })),
      test("cross_b_reads_a", "x", res({ status: 200, body: JSON.stringify(alice) })),
      test("unauth_reads_a", "u", res({ status: 200, body: JSON.stringify(alice) })),
    ]);
    assert.equal(v.finding, "confirmed_unauthenticated_access");
  });

  it("does not confirm WAF HTML as IDOR", () => {
    const html = "<html>Attention Required! Cloudflare cf-ray</html>";
    const v = decideVerdict([
      test(
        "baseline_a",
        "a",
        res({ status: 403, body: html, contentType: "text/html" }),
      ),
      test(
        "cross_b_reads_a",
        "x",
        res({ status: 403, body: html, contentType: "text/html" }),
      ),
    ]);
    assert.equal(v.reportable, false);
    assert.ok(v.finding === "inconclusive" || v.finding === "protected");
  });
});
