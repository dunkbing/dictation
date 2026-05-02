import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import { z } from "zod";
import {
  createRole,
  deleteRole,
  getAllRoles,
  getAvailablePermissions,
  getRoleById,
  updateRole,
} from "@/app/actions/roles";
import type { Variables } from "..";

const requireAuth = async (c: Context, next: () => Promise<void>) => {
  const session = c.get("session");
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return next();
};

const roleBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

const roleUpdateSchema = roleBodySchema.partial();

export const rolesRoute = new Hono<{ Variables: Variables }>()
  .get("/permissions", requireAuth, async (c) => {
    return c.json({ permissions: await getAvailablePermissions() });
  })
  .get("/", requireAuth, async (c) => {
    const result = await getAllRoles();
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ roles: result.roles ?? [] });
  })
  .get("/:id", requireAuth, async (c) => {
    const id = Number.parseInt(c.req.param("id")!, 10);
    const result = await getRoleById(id);
    if (!result.success) return c.json({ error: result.error }, 500);
    if (!result.role) return c.json({ error: "Role not found" }, 404);
    return c.json({ role: result.role });
  })
  .post("/", requireAuth, zValidator("json", roleBodySchema), async (c) => {
    const result = await createRole(c.req.valid("json"));
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ role: result.role });
  })
  .patch("/:id", requireAuth, zValidator("json", roleUpdateSchema), async (c) => {
    const id = Number.parseInt(c.req.param("id")!, 10);
    const result = await updateRole(id, c.req.valid("json"));
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ role: result.role });
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = Number.parseInt(c.req.param("id")!, 10);
    const result = await deleteRole(id);
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ ok: true });
  });

export type RolesRouteType = typeof rolesRoute;
