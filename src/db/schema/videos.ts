import { integer, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { users } from "./auth";

export type Sentence = {
  index: number;
  text: string;
  startMs: number;
  endMs: number;
};

export const videos = pgTable("videos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  youtubeId: varchar("youtube_id", { length: 16 }).notNull().unique(),
  title: text().notNull(),
  channel: text().notNull(),
  thumbnailUrl: text("thumbnail_url"),
  addedBy: text("added_by").references(() => users.id, { onDelete: "set null" }),
  sentences: jsonb().$type<Sentence[]>().notNull().default([]),
});

export type SelectVideo = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;
