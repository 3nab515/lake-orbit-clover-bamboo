import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { parseRawHttp } from "./parse-request";
import { detectIdCandidates } from "./detect-ids";
import { executeSuite } from "./execute.server";
import type { IdLocation, IdentityPack } from "./types";

export const analyzeRequest = createServerFn({ method: "POST" })
  .validator((input: { raw: string }) => input)
  .handler(async ({ data }) => {
    const parsed = parseRawHttp(data.raw);
    const candidates = detectIdCandidates(parsed);
    return { parsed, candidates };
  });

export const runAccessSuite = createServerFn({ method: "POST" })
  .validator(
    (input: {
      raw: string;
      sessionA: IdentityPack;
      sessionB: IdentityPack;
      paramKey: string;
      paramLocation: IdLocation;
      idA: string;
      idB: string;
      authorized: boolean;
      mode: "demo" | "live";
    }) => input,
  )
  .handler(async ({ data }) => {
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
      selfOrigin,
    });
  });
