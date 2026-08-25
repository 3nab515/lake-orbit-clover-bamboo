export type DemoOrder = {
  orderId: string;
  ownerId: string;
  status: "paid" | "pending";
  amountSar: number;
  email: string;
  nationalIdDemo: string;
  shippingAddress: string;
  cardLast4: string;
};

export const DEMO_ORDERS: Record<string, DemoOrder> = {
  "1001": {
    orderId: "1001",
    ownerId: "alice",
    status: "paid",
    amountSar: 4820.5,
    email: "alice.nasser@example.invalid",
    nationalIdDemo: "DEMO-1-000-0001",
    shippingAddress: "Riyadh · Al Olaya · Bldg 12",
    cardLast4: "4412",
  },
  "1002": {
    orderId: "1002",
    ownerId: "bob",
    status: "pending",
    amountSar: 190,
    email: "bob.harbi@example.invalid",
    nationalIdDemo: "DEMO-2-000-0002",
    shippingAddress: "Jeddah · Al Zahra · St 8",
    cardLast4: "2290",
  },
};

export function sessionFromHeaders(headers: Headers | Record<string, string>): string | null {
  const get = (k: string) => {
    if (headers instanceof Headers) return headers.get(k);
    return headers[k.toLowerCase()] ?? headers[k] ?? null;
  };
  const cookie = get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)witness-session=([^;]+)/i);
  if (m?.[1]) return decodeURIComponent(m[1]);
  const auth = get("authorization") ?? "";
  const b = auth.match(/^Bearer\s+(.+)$/i);
  if (b?.[1]) return b[1].trim();
  return null;
}

export function handleDemoOrder(opts: {
  id: string;
  headers: Headers | Record<string, string>;
  enforceOwner: boolean;
}): Response {
  const order = DEMO_ORDERS[opts.id];
  if (!order) {
    return Response.json({ error: "order_not_found" }, { status: 404 });
  }
  const session = sessionFromHeaders(opts.headers);
  if (!session) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (session !== "alice" && session !== "bob") {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (opts.enforceOwner && session !== order.ownerId) {
    return Response.json({ error: "forbidden", message: "not your order" }, { status: 403 });
  }
  return Response.json({
    demo: true,
    order,
    viewer: session,
    accessControl: opts.enforceOwner ? "owner-checked" : "missing-owner-check",
  });
}

export function demoRawRequest(origin: string, insecure: boolean, orderId: string): string {
  const path = insecure
    ? `/api/demo/insecure/orders/${orderId}`
    : `/api/demo/secure/orders/${orderId}`;
  const host = new URL(origin).host;
  return [
    `GET ${path} HTTP/1.1`,
    `Host: ${host}`,
    "Accept: application/json",
    "Cookie: witness-session=alice",
    "",
    "",
  ].join("\r\n");
}
