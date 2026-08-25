import { createFileRoute } from "@tanstack/react-router";
import { handleDemoOrder } from "@/lib/idor/demo-api";

export const Route = createFileRoute("/api/demo/insecure/orders/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) =>
        handleDemoOrder({
          id: params.id,
          headers: request.headers,
          enforceOwner: false,
        }),
    },
  },
});
