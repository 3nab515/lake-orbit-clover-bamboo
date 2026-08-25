//#region node_modules/.nitro/vite/services/ssr/assets/demo-api-DsKBIbDU.js
var DEMO_ORDERS = {
	"1001": {
		orderId: "1001",
		ownerId: "alice",
		status: "paid",
		amountSar: 4820.5,
		email: "alice.nasser@example.invalid",
		nationalIdDemo: "DEMO-1-000-0001",
		shippingAddress: "Riyadh · Al Olaya · Bldg 12",
		cardLast4: "4412"
	},
	"1002": {
		orderId: "1002",
		ownerId: "bob",
		status: "pending",
		amountSar: 190,
		email: "bob.harbi@example.invalid",
		nationalIdDemo: "DEMO-2-000-0002",
		shippingAddress: "Jeddah · Al Zahra · St 8",
		cardLast4: "2290"
	}
};
function sessionFromHeaders(headers) {
	const get = (k) => {
		if (headers instanceof Headers) return headers.get(k);
		return headers[k.toLowerCase()] ?? headers[k] ?? null;
	};
	const m = (get("cookie") ?? "").match(/(?:^|;\s*)witness-session=([^;]+)/i);
	if (m?.[1]) return decodeURIComponent(m[1]);
	const b = (get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
	if (b?.[1]) return b[1].trim();
	return null;
}
function handleDemoOrder(opts) {
	const order = DEMO_ORDERS[opts.id];
	if (!order) return Response.json({ error: "order_not_found" }, { status: 404 });
	const session = sessionFromHeaders(opts.headers);
	if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });
	if (session !== "alice" && session !== "bob") return Response.json({ error: "unauthenticated" }, { status: 401 });
	if (opts.enforceOwner && session !== order.ownerId) return Response.json({
		error: "forbidden",
		message: "not your order"
	}, { status: 403 });
	return Response.json({
		demo: true,
		order,
		viewer: session,
		accessControl: opts.enforceOwner ? "owner-checked" : "missing-owner-check"
	});
}
function demoRawRequest(origin, insecure, orderId) {
	const path = insecure ? `/api/demo/insecure/orders/${orderId}` : `/api/demo/secure/orders/${orderId}`;
	const host = new URL(origin).host;
	return [
		`GET ${path} HTTP/1.1`,
		`Host: ${host}`,
		"Accept: application/json",
		"Cookie: witness-session=alice",
		"",
		""
	].join("\r\n");
}
//#endregion
export { handleDemoOrder as n, demoRawRequest as t };
