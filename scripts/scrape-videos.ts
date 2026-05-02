import { createVideo, getVideoByYoutubeId } from "@/app/actions/videos";
import { extractYoutubeId, fetchSentences, fetchVideoMetadata } from "@/lib/youtube";

const URLS = [
  "https://www.youtube.com/watch?v=t6-fT0hjTvc",
  "https://www.youtube.com/watch?v=DJeUGpcle8s",
  "https://www.youtube.com/watch?v=HaLISMAGdOE",
  "https://www.youtube.com/watch?v=fDUFP7EeXLE",
];

let added = 0;
let skipped = 0;
let failed = 0;

for (const url of URLS) {
  const youtubeId = extractYoutubeId(url);
  if (!youtubeId) {
    console.error(`✗ Could not extract video ID from ${url}`);
    failed++;
    continue;
  }

  const existing = await getVideoByYoutubeId(youtubeId);
  if (existing) {
    console.log(`↷ Skipping ${youtubeId} — already in DB (${existing.title})`);
    skipped++;
    continue;
  }

  try {
    const [meta, sentenceData] = await Promise.all([
      fetchVideoMetadata(youtubeId),
      fetchSentences(youtubeId),
    ]);

    const created = await createVideo({
      youtubeId: meta.youtubeId,
      title: meta.title,
      channel: meta.channel,
      thumbnailUrl: meta.thumbnailUrl,
      sentences: sentenceData,
    });
    if (!created.success || !created.video) {
      throw new Error(created.error ?? "Failed to insert video");
    }

    console.log(`✓ Added ${youtubeId} — "${meta.title}" (${sentenceData.length} sentences)`);
    added++;
  } catch (error) {
    console.error(`✗ Failed ${youtubeId}:`, error instanceof Error ? error.message : error);
    failed++;
  }
}

console.log(`\nDone. Added: ${added}, Skipped: ${skipped}, Failed: ${failed}`);
process.exit(0);
