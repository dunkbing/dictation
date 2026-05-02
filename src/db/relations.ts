import { defineRelations } from "drizzle-orm";
import { users } from "./schema/auth";
import { roles } from "./schema/roles";
import { videos } from "./schema/videos";

export const schema = { users, roles, videos };

export const relations = defineRelations(schema, (r) => ({
  users: {
    role: r.one.roles({
      from: r.users.roleId,
      to: r.roles.id,
    }),
  },
  roles: {
    users: r.many.users(),
  },
}));
