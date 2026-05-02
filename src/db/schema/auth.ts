import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { roles, type SelectRole } from "./roles";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  roleId: integer("role_id").references(() => roles.id, {
    onDelete: "restrict",
  }),
  customPermissions: text("custom_permissions").notNull().default("[]"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type UserWithRole = SelectUser & {
  role?: SelectRole | null;
};

export const loginUserSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginUser = z.infer<typeof loginUserSchema>;

export const registerUserSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});
export type RegisterUser = z.infer<typeof registerUserSchema>;
