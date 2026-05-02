import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { roles } from "@/db/schema/roles";

const ADMIN_ROLE_NAME = "Admin";
const ADMIN_PERMISSIONS = [
  "create:User",
  "read:User",
  "update:User",
  "delete:User",
  "invite:User",
  "create:Role",
  "read:Role",
  "update:Role",
  "delete:Role",
  "create:Video",
  "read:Video",
  "update:Video",
  "delete:Video",
  "read:Dashboard",
  "read:Settings",
  "update:Settings",
  "manage:all",
];

const email = process.env.ADMIN_EMAIL || "admin@gmail.com";
const password = process.env.ADMIN_PASSWORD || "Admin123@";
const name = process.env.ADMIN_NAME ?? "Admin";

if (!email || !password) {
  console.error(
    "Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret [ADMIN_NAME=Name] bun run scripts/create-admin.ts",
  );
  process.exit(1);
}

const existingAdminRole = await db.query.roles.findFirst({
  where: { name: ADMIN_ROLE_NAME },
  with: { users: true },
});

if (existingAdminRole && existingAdminRole.users.length > 0) {
  console.error(`Admin already exists: ${existingAdminRole.users[0].email}`);
  process.exit(1);
}

const adminRole =
  existingAdminRole ??
  (
    await db
      .insert(roles)
      .values({
        name: ADMIN_ROLE_NAME,
        description: "Administrator with full access",
        permissions: ADMIN_PERMISSIONS,
      })
      .returning()
  )[0];

const existingUser = await db.query.users.findFirst({ where: { email } });
if (existingUser) {
  console.error(`User with email ${email} already exists`);
  process.exit(1);
}

const [admin] = await db
  .insert(users)
  .values({
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash: await Bun.password.hash(password),
    roleId: adminRole.id,
  })
  .returning();

console.log(`Created admin: ${admin.email} (id: ${admin.id})`);
process.exit(0);
