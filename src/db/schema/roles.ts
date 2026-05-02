import { integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: varchar({ length: 500 }),
  permissions: jsonb().$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type SelectRole = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
