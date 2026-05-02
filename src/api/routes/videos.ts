import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { getUserById } from "@/app/actions/users";
import {
  createVideo,
  deleteVideo,
  getAllVideos,
  getVideoById,
  getVideoByYoutubeId,
  updateVideo,
} from "@/app/actions/videos";
import { type Actions, defineAbilityFor, type Subjects } from "@/lib/casl/ability";
import { scoreSentence } from "@/lib/dictation";
import { extractYoutubeId, fetchSentences, fetchVideoMetadata } from "@/lib/youtube";
import type { Variables } from "..";

const requireAuth = async (c: Context, next: () => Promise<void>) => {
  const session = c.get("session");
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return next();
};

async function requirePermission(c: Context, action: Actions, subject: Subjects) {
  const session = c.get("session");
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const user = await getUserById(session.userId);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const customPermissions = JSON.parse(user.customPermissions || "[]") as string[];
  const all = [...(user.role?.permissions ?? []), ...customPermissions];
  const ability = defineAbilityFor(all);
  if (!ability.can(action, subject)) return c.json({ error: "Forbidden" }, 403);
  return null;
}

const sentenceSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
});

const updateVideoSchema = z.object({
  title: z.string().min(1).optional(),
  channel: z.string().min(1).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  sentences: z.array(sentenceSchema).optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const videosRoute = new Hono<{ Variables: Variables }>()
  .post(
    "/score",
    requireAuth,
    zValidator("json", z.object({ truth: z.string(), input: z.string() })),
    async (c) => {
      const { truth, input } = c.req.valid("json");
      return c.json(scoreSentence(truth, input));
    },
  )
  .get("/", requireAuth, async (c) => {
    const result = await getAllVideos();
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ videos: result.videos ?? [] });
  })
  .post("/", requireAuth, zValidator("json", z.object({ url: z.string().min(1) })), async (c) => {
    const denied = await requirePermission(c, "create", "Video");
    if (denied) return denied;

    const { url } = c.req.valid("json");
    const youtubeId = extractYoutubeId(url);
    if (!youtubeId) return c.json({ error: "Invalid YouTube URL" }, 400);

    const existing = await getVideoByYoutubeId(youtubeId);
    if (existing) return c.json({ error: "Video already exists" }, 409);

    try {
      const [meta, sentences] = await Promise.all([
        fetchVideoMetadata(youtubeId),
        fetchSentences(youtubeId),
      ]);
      const session = c.get("session");
      const result = await createVideo({
        youtubeId: meta.youtubeId,
        title: meta.title,
        channel: meta.channel,
        thumbnailUrl: meta.thumbnailUrl,
        sentences,
        addedBy: session?.userId ?? null,
      });
      if (!result.success || !result.video) {
        return c.json({ error: result.error ?? "Failed to create video" }, 500);
      }
      return c.json({ video: result.video }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scrape video";
      return c.json({ error: message }, 500);
    }
  })
  .get("/:id", requireAuth, async (c) => {
    const id = Number.parseInt(c.req.param("id")!, 10);
    if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const result = await getVideoById(id);
    if (!result.success) return c.json({ error: result.error }, 500);
    if (!result.video) return c.json({ error: "Video not found" }, 404);
    return c.json({ video: result.video });
  })
  .patch("/:id", requireAuth, zValidator("json", updateVideoSchema), async (c) => {
    const denied = await requirePermission(c, "update", "Video");
    if (denied) return denied;
    const id = Number.parseInt(c.req.param("id")!, 10);
    if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const result = await updateVideo(id, c.req.valid("json"));
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ video: result.video });
  })
  .delete("/:id", requireAuth, async (c) => {
    const denied = await requirePermission(c, "delete", "Video");
    if (denied) return denied;
    const id = Number.parseInt(c.req.param("id")!, 10);
    if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const result = await deleteVideo(id);
    if (!result.success) return c.json({ error: result.error }, 500);
    return c.json({ ok: true });
  });

export type VideosRouteType = typeof videosRoute;
