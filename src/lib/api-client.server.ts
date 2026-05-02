import "server-only";
import { headers } from "next/headers";
import { hc } from "hono/client";
import app, { type AppType } from "@/api";

export async function serverApiClient() {
  const h = await headers();
  return hc<AppType>("http://internal", {
    fetch: (input: string | URL | Request, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init);
      return app.fetch(req);
    },
    headers: { cookie: h.get("cookie") ?? "" },
  });
}
