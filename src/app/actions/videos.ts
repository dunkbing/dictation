"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { type InsertVideo, videos } from "@/db/schema/videos";

export async function getAllVideos() {
  try {
    const list = await db.query.videos.findMany({
      orderBy: { id: "desc" },
    });
    return { success: true, videos: list };
  } catch (error) {
    console.error("Error fetching videos:", error);
    return { success: false, error: "Failed to fetch videos" };
  }
}

export async function getVideoById(id: number) {
  try {
    const video = await db.query.videos.findFirst({ where: { id } });
    return { success: true, video };
  } catch (error) {
    console.error("Error fetching video:", error);
    return { success: false, error: "Failed to fetch video" };
  }
}

export async function getVideoByYoutubeId(youtubeId: string) {
  return await db.query.videos.findFirst({ where: { youtubeId } });
}

export async function createVideo(data: InsertVideo) {
  try {
    const [created] = await db.insert(videos).values(data).returning();
    return { success: true, video: created };
  } catch (error) {
    console.error("Error creating video:", error);
    return { success: false, error: "Failed to create video" };
  }
}

export async function updateVideo(
  id: number,
  data: Partial<Pick<InsertVideo, "title" | "channel" | "thumbnailUrl" | "sentences">>,
) {
  try {
    const [updated] = await db.update(videos).set(data).where(eq(videos.id, id)).returning();
    return { success: true, video: updated };
  } catch (error) {
    console.error("Error updating video:", error);
    return { success: false, error: "Failed to update video" };
  }
}

export async function deleteVideo(id: number) {
  try {
    await db.delete(videos).where(eq(videos.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting video:", error);
    return { success: false, error: "Failed to delete video" };
  }
}
