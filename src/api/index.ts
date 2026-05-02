import { Hono } from "hono";
import { logger } from "hono/logger";
import { getSessionFromHeaders, type SessionPayload } from "@/lib/session";
import { authRoute } from "./routes/auth";
import { rolesRoute } from "./routes/roles";
import { usersRoute } from "./routes/users";
import { videosRoute } from "./routes/videos";

export type Variables = {
  session: SessionPayload | null;
};

const app = new Hono<{ Variables: Variables }>()
  .use(logger())
  .use("*", async (c, next) => {
    const session = await getSessionFromHeaders(c.req.raw.headers);
    c.set("session", session);
    return next();
  })
  .get("/health", (c) =>
    c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
  )
  .route("/auth", authRoute)
  .route("/users", usersRoute)
  .route("/roles", rolesRoute)
  .route("/videos", videosRoute);

export default app;
export type AppType = typeof app;
