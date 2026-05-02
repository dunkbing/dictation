import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import { z } from "zod";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUserPermissions,
  updateUserRole,
} from "@/app/actions/users";
import type { Variables } from "..";

const requireAuth = async (c: Context, next: () => Promise<void>) => {
  const session = c.get("session");
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return next();
};

export const usersRoute = new Hono<{ Variables: Variables }>()
  .get("/me", requireAuth, async (c) => {
    const session = c.get("session");
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const userData = await getUserById(session.userId);
    if (!userData) return c.json({ error: "User not found" }, 404);

    return c.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        roleId: userData.roleId,
        role: userData.role,
        customPermissions: userData.customPermissions,
      },
    });
  })
  .get("/", requireAuth, async (c) => {
    const result = await getAllUsers();
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ users: result.users ?? [] });
  })
  .get("/:id", requireAuth, async (c) => {
    const found = await getUserById(c.req.param("id")!);
    if (!found) return c.json({ error: "User not found" }, 404);
    return c.json({ user: found });
  })
  .patch(
    "/:id/role",
    requireAuth,
    zValidator("json", z.object({ roleId: z.number().int() })),
    async (c) => {
      const { roleId } = c.req.valid("json");
      const result = await updateUserRole(c.req.param("id")!, roleId);
      if (!result.success) return c.json({ error: result.error }, 500);
      return c.json({ user: result.user });
    },
  )
  .patch(
    "/:id/permissions",
    requireAuth,
    zValidator("json", z.object({ customPermissions: z.array(z.string()) })),
    async (c) => {
      const { customPermissions } = c.req.valid("json");
      const result = await updateUserPermissions(c.req.param("id")!, customPermissions);
      if (!result.success) return c.json({ error: result.error }, 500);
      return c.json({ user: result.user });
    },
  )
  .delete("/:id", requireAuth, async (c) => {
    const result = await deleteUser(c.req.param("id")!);
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ ok: true });
  });

export type UsersRouteType = typeof usersRoute;
