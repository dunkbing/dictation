"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles } from "@/db/schema/roles";

export async function createRole(data: {
  name: string;
  description?: string;
  permissions: string[];
}) {
  try {
    const [role] = await db
      .insert(roles)
      .values({
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      })
      .returning();

    return { success: true, role };
  } catch (error) {
    console.error("Error creating role:", error);
    return { success: false, error: "Failed to create role" };
  }
}

export async function getRoleById(id: number) {
  try {
    const role = await db.query.roles.findFirst({
      where: { id },
    });

    return { success: true, role };
  } catch (error) {
    console.error("Error fetching role:", error);
    return { success: false, error: "Failed to fetch role" };
  }
}

export async function getAllRoles() {
  try {
    const allRoles = await db.query.roles.findMany({
      orderBy: { name: "asc" },
    });

    return { success: true, roles: allRoles };
  } catch (error) {
    console.error("Error fetching roles:", error);
    return { success: false, error: "Failed to fetch roles" };
  }
}

export async function updateRole(
  id: number,
  data: {
    name?: string;
    description?: string;
    permissions?: string[];
  },
) {
  try {
    const [role] = await db
      .update(roles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();

    return { success: true, role };
  } catch (error) {
    console.error("Error updating role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

export async function deleteRole(id: number) {
  try {
    await db.delete(roles).where(eq(roles.id, id));

    return { success: true };
  } catch (error) {
    console.error("Error deleting role:", error);
    return { success: false, error: "Failed to delete role" };
  }
}

export async function getAvailablePermissions(): Promise<string[]> {
  return [
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
}
