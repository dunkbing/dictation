"use client";

import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pause,
  Play,
  Plus,
  Save,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SelectVideo, Sentence } from "@/db/schema/videos";
import { apiClient } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n/config";
import { LEVEL_TAGS, TOPIC_TAGS, VIDEO_TAGS } from "@/lib/video-tags";
import type { YTPlayer } from "@/lib/youtube-player";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export default function EditVideoClient({ lang, video }: { lang: Locale; video: SelectVideo }) {
  const [meta, setMeta] = useState<SelectVideo>(video);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stopAtMsRef = useRef<number | null>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const containerId = `yt-edit-${meta.youtubeId}`;
    containerRef.current.id = containerId;

    const init = () => {
      if (!window.YT) return;
      playerRef.current = new window.YT.Player(containerId, {
        videoId: meta.youtubeId,
        playerVars: {
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
        },
      });
    };

    if (window.YT?.Player) {
      init();
    } else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = init;
    }

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {
        // noop
      }
      playerRef.current = null;
    };
  }, [meta.youtubeId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime?.();
      if (typeof t !== "number") return;
      const ms = Math.round(t * 1000);
      setCurrentMs(ms);
      const playing = player.getPlayerState?.() === 1;
      setIsPlaying((prev) => (prev !== playing ? playing : prev));

      if (stopAtMsRef.current !== null && ms >= stopAtMsRef.current) {
        player.pauseVideo();
        stopAtMsRef.current = null;
      }

      // Sticky match: if the current active still contains the playhead, keep it.
      // Otherwise pick the first sentence whose [startMs, endMs) contains it.
      const matches: number[] = [];
      meta.sentences.forEach((s, i) => {
        if (ms >= s.startMs && ms < s.endMs) matches.push(i);
      });
      setActiveIdx((prev) => {
        if (matches.length === 0) return null;
        if (prev !== null && matches.includes(prev)) return prev;
        return matches[0] ?? null;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [meta.sentences]);

  // Scroll the active row into view when playback advances.
  useEffect(() => {
    if (activeIdx === null) return;
    rowRefs.current[activeIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.getPlayerState?.() === 1) {
      player.pauseVideo();
      return;
    }
    stopAtMsRef.current = null;
    player.playVideo();
  };

  const playClip = (s: Sentence) => {
    if (!playerRef.current) return;
    stopAtMsRef.current = s.endMs;
    playerRef.current.seekTo(s.startMs / 1000, true);
    playerRef.current.playVideo();
  };

  const seekTo = (ms: number) => {
    if (!playerRef.current) return;
    stopAtMsRef.current = null;
    playerRef.current.seekTo(ms / 1000, true);
  };

  const updateSentence = (idx: number, patch: Partial<Sentence>) => {
    setMeta((prev) => ({
      ...prev,
      sentences: prev.sentences.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const removeSentence = (idx: number) => {
    setMeta((prev) => ({
      ...prev,
      sentences: prev.sentences.filter((_, i) => i !== idx),
    }));
  };

  const addAfter = (idx: number) => {
    setMeta((prev) => {
      const newSentence: Sentence = {
        index: idx + 1,
        text: "",
        startMs: currentMs,
        endMs: currentMs + 2000,
      };
      const next = [
        ...prev.sentences.slice(0, idx + 1),
        newSentence,
        ...prev.sentences.slice(idx + 1),
      ];
      return { ...prev, sentences: next };
    });
  };

  const toggleTag = (tag: string) => {
    setMeta((prev) => {
      const has = prev.tags.includes(tag);
      return {
        ...prev,
        tags: has ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
      };
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    setMeta((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.sentences.length) return prev;
      const next = [...prev.sentences];
      const a = next[idx];
      const b = next[target];
      if (!a || !b) return prev;
      next[idx] = b;
      next[target] = a;
      return { ...prev, sentences: next };
    });
  };

  const save = async () => {
    setError("");
    setSaving(true);
    const reindexed = meta.sentences.map((s, i) => ({ ...s, index: i }));
    const res = await apiClient.videos[":id"].$patch({
      param: { id: String(meta.id) },
      json: {
        title: meta.title,
        channel: meta.channel,
        thumbnailUrl: meta.thumbnailUrl || null,
        sentences: reindexed,
        tags: meta.tags,
      },
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Failed to save");
      return;
    }
    setMeta((m) => ({ ...m, sentences: reindexed }));
    setSavedAt(Date.now());
  };

  return (
    <div className="grid grid-cols-[420px_1fr] gap-4 h-[calc(100vh-8rem)] overflow-hidden">
      {/* LEFT: Video, controls, metadata */}
      <div className="flex flex-col gap-3">
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
              <div ref={containerRef} className="w-full h-full" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" onClick={togglePlay} className="flex-1">
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> Play
                  </>
                )}
              </Button>
              <div className="font-mono text-sm tabular-nums px-3 py-1 rounded bg-muted">
                {formatTime(currentMs)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder="Title"
            />
            <Input
              value={meta.channel}
              onChange={(e) => setMeta({ ...meta, channel: e.target.value })}
              placeholder="Channel"
            />
            <Input
              value={meta.thumbnailUrl ?? ""}
              onChange={(e) => setMeta({ ...meta, thumbnailUrl: e.target.value || null })}
              placeholder="Thumbnail URL"
            />
            <p className="text-xs text-muted-foreground">YouTube ID: {meta.youtubeId}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tags ({meta.tags.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value="" onValueChange={(v) => v && toggleTag(v)}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Add topic..." />
                </SelectTrigger>
                <SelectContent>
                  {TOPIC_TAGS.filter((t) => !meta.tags.includes(t.value)).map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      # {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value="" onValueChange={(v) => v && toggleTag(v)}>
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Add level..." />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_TAGS.filter((t) => !meta.tags.includes(t.value)).map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      # {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {meta.tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags selected.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {meta.tags.map((value) => {
                  const tag = VIDEO_TAGS.find((t) => t.value === value);
                  return (
                    <Badge key={value} variant="secondary" className="gap-1">
                      # {tag?.label ?? value}
                      <button
                        type="button"
                        onClick={() => toggleTag(value)}
                        className="hover:text-destructive"
                        aria-label={`Remove ${tag?.label ?? value}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save changes
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/${lang}/practice/${meta.id}`}>Back</Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {savedAt && !saving && (
          <p className="text-xs text-muted-foreground">
            Saved at {new Date(savedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* RIGHT: Sentences */}
      <Card className="flex flex-col min-h-0">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Sentences ({meta.sentences.length})</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addAfter(meta.sentences.length - 1)}
            disabled={meta.sentences.length === 0}
          >
            <Plus className="w-3 h-3 mr-1" /> Add at end
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-3">
          {meta.sentences.length === 0 && (
            <Button onClick={() => addAfter(-1)} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add first sentence
            </Button>
          )}
          {meta.sentences.map((s, i) => {
            const duration = s.endMs - s.startMs;
            const invalid = duration <= 0;
            const isActive = activeIdx === i;
            return (
              <div
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                key={i}
                className={`rounded-md border p-3 space-y-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : invalid
                      ? "border-destructive/50"
                      : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => seekTo(s.startMs)}
                    title="Seek playhead to this sentence"
                  >
                    #{i + 1} · {formatTime(s.startMs)} → {formatTime(s.endMs)} ·{" "}
                    <span className={invalid ? "text-destructive" : ""}>
                      {invalid ? "invalid" : `${(duration / 1000).toFixed(2)}s`}
                    </span>
                  </button>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="h-7 w-7 p-0"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => move(i, 1)}
                      disabled={i === meta.sentences.length - 1}
                      className="h-7 w-7 p-0"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addAfter(i)}
                      title="Add a new sentence after this one"
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSentence(i)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-1.5 items-center">
                  <Input
                    type="number"
                    value={s.startMs}
                    onChange={(e) => updateSentence(i, { startMs: Number(e.target.value) })}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateSentence(i, { startMs: currentMs })}
                    className="h-7 px-2 text-xs"
                    title="Set start to current playhead"
                  >
                    ↤
                  </Button>
                  <Input
                    type="number"
                    value={s.endMs}
                    onChange={(e) => updateSentence(i, { endMs: Number(e.target.value) })}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateSentence(i, { endMs: currentMs })}
                    className="h-7 px-2 text-xs"
                    title="Set end to current playhead"
                  >
                    ↦
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => playClip(s)}
                      className="h-7 px-2 text-xs"
                      title="Play this clip"
                    >
                      <SkipForward className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playerRef.current?.pauseVideo()}
                      className="h-7 px-2 text-xs"
                      title="Pause"
                    >
                      <Pause className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={s.text}
                  onChange={(e) => updateSentence(i, { text: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
