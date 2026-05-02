import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { createUser, getUserByEmail } from "@/app/actions/users";
import { loginUserSchema, registerUserSchema } from "@/db/schema/auth";
import { configs } from "@/lib/configs";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/session";

const cookieOpts = {
  httpOnly: true,
  secure: configs.nodeEnv === "production",
  sameSite: "Lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export const authRoute = new Hono()
  .post("/login", zValidator("json", loginUserSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    const found = await getUserByEmail(email);
    if (!found) return c.json({ error: "Invalid credentials" }, 401);

    const valid = await Bun.password.verify(password, found.passwordHash);
    if (!valid) return c.json({ error: "Invalid credentials" }, 401);

    const token = await signSession({
      userId: found.id,
      email: found.email,
      name: found.name,
    });
    setCookie(c, SESSION_COOKIE, token, cookieOpts);

    return c.json({
      user: { id: found.id, email: found.email, name: found.name },
    });
  })
  .post("/register", zValidator("json", registerUserSchema), async (c) => {
    const { email, password, name } = c.req.valid("json");

    const existing = await getUserByEmail(email);
    if (existing) {
      return c.json({ error: "User with this email already exists" }, 409);
    }

    const passwordHash = await Bun.password.hash(password);

    const result = await createUser({
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash,
    });
    if (!result.success || !result.user) {
      return c.json({ error: result.error ?? "Failed to create user" }, 500);
    }

    const token = await signSession({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
    });
    setCookie(c, SESSION_COOKIE, token, cookieOpts);

    return c.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
  })
  .post("/logout", async (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

export type AuthRouteType = typeof authRoute;
