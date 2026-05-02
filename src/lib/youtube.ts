import { YoutubeTranscript } from "youtube-transcript";
import type { Sentence } from "@/db/schema/videos";

export type VideoMetadata = {
  youtubeId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
};

export function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:[^&]*&)*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1] ?? null;
  }
  return null;
}

export async function fetchVideoMetadata(youtubeId: string): Promise<VideoMetadata> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Video not found or unavailable (${res.status})`);
  const data = (await res.json()) as { title: string; author_name: string; thumbnail_url: string };
  return {
    youtubeId,
    title: data.title,
    channel: data.author_name,
    thumbnailUrl: data.thumbnail_url,
  };
}

export async function fetchSentences(youtubeId: string): Promise<Sentence[]> {
  const items = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: "en" });
  return items
    .map((item, i) => {
      const startMs = Math.round(item.offset);
      const endMs = startMs + Math.round(item.duration);
      return {
        index: i,
        text: decodeEntities(item.text).replace(/\s+/g, " ").trim(),
        startMs,
        endMs,
      };
    })
    .filter((s) => s.text.length > 0);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;#39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}
