"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/auth";

export async function createUser(data: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  roleId?: number | null;
}) {
  try {
    const [created] = await db.insert(users).values(data).returning();
    return { success: true, user: created };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function getUserByEmail(email: string) {
  return await db.query.users.findFirst({
    where: { email },
    with: { role: true },
  });
}

export async function getUserById(id: string) {
  return await db.query.users.findFirst({
    where: { id },
    with: { role: true },
  });
}

export async function updateUserPermissions(userId: string, customPermissions: string[]) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        customPermissions: JSON.stringify(customPermissions),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating user permissions:", error);
    return { success: false, error: "Failed to update user permissions" };
  }
}

export async function getAllUsers() {
  try {
    const users = await db.query.users.findMany({
      with: { role: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}

export async function updateUserRole(userId: string, roleId: number) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        roleId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

export async function deleteUser(userId: string) {
  try {
    await db.delete(users).where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
