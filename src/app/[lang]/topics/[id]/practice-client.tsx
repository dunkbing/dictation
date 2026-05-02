"use client";

import { ChevronLeft, ChevronRight, Eye, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { SelectVideo, Sentence } from "@/db/schema/videos";
import { maskSentence, tokenize } from "@/lib/dictation";
import type { Locale } from "@/lib/i18n/config";
import type { YTPlayer } from "@/lib/youtube-player";

type WordState =
  | { kind: "untouched"; text: string }
  | { kind: "partial-correct"; text: string }
  | { kind: "partial-wrong"; text: string }
  | { kind: "correct"; text: string }
  | { kind: "wrong"; text: string }
  | { kind: "revealed"; text: string };

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "");
}

function computeWordStates(truth: string, input: string, revealed: Set<number>): WordState[] {
  const truthWords = tokenize(truth);
  const trimmed = input.replace(/\s+$/, "");
  const userWords = trimmed.length === 0 ? [] : trimmed.split(/\s+/);
  const inProgress = input.length > 0 && !/\s$/.test(input);
  const inProgressIdx = inProgress ? userWords.length - 1 : -1;
  const completedUserCount = inProgress ? userWords.length - 1 : userWords.length;

  return truthWords.map((tw, i) => {
    const truthLen = tw.length;
    if (revealed.has(i)) return { kind: "revealed", text: tw };

    if (i < completedUserCount) {
      const u = userWords[i] ?? "";
      const ok = normalizeWord(u) === normalizeWord(tw);
      return ok ? { kind: "correct", text: tw } : { kind: "wrong", text: u };
    }

    if (i === inProgressIdx) {
      const u = userWords[i] ?? "";
      if (normalizeWord(u) === normalizeWord(tw)) {
        return { kind: "correct", text: tw };
      }
      let mismatch = false;
      for (let c = 0; c < u.length; c++) {
        if ((tw[c] ?? "").toLowerCase() !== (u[c] ?? "").toLowerCase()) {
          mismatch = true;
          break;
        }
      }
      const remaining = "*".repeat(Math.max(0, truthLen - u.length));
      return {
        kind: mismatch ? "partial-wrong" : "partial-correct",
        text: u + remaining,
      };
    }

    return { kind: "untouched", text: "*".repeat(truthLen) };
  });
}

function tileClass(kind: WordState["kind"]): string {
  switch (kind) {
    case "correct":
      return "bg-green-500/20 text-green-300 border-green-500/40";
    case "wrong":
      return "bg-red-500/20 text-red-300 border-red-500/40 line-through";
    case "partial-correct":
      return "bg-green-500/10 text-green-300 border-green-500/30";
    case "partial-wrong":
      return "bg-red-500/10 text-red-300 border-red-500/30";
    case "revealed":
      return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function PracticeClient({
  video,
  lang: _lang,
}: {
  lang: Locale;
  video: SelectVideo;
}) {
  const sentences = video.sentences;
  const [activeIndex, setActiveIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [revealedSentences, setRevealedSentences] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const stopAtMsRef = useRef<number | null>(null);
  const pendingTargetRef = useRef<{ startMs: number; endMs: number; deadlineAt: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  const active = sentences[activeIndex];
  const wordStates = useMemo(
    () => (active ? computeWordStates(active.text, input, revealed) : []),
    [active, input, revealed],
  );

  const allFinalized =
    wordStates.length > 0 && wordStates.every((s) => s.kind === "correct" || s.kind === "revealed");
  const cleanCorrect = allFinalized && revealed.size === 0;

  useEffect(() => {
    if (active && allFinalized && !completed.has(active.index)) {
      setCompleted((prev) => new Set(prev).add(active.index));
    }
  }, [active, allFinalized, completed]);

  useEffect(() => {
    if (!containerRef.current) return;
    const containerId = `yt-player-${video.youtubeId}`;
    containerRef.current.id = containerId;

    const init = () => {
      if (!window.YT) return;
      playerRef.current = new window.YT.Player(containerId, {
        videoId: video.youtubeId,
        playerVars: {
          controls: 0,
          disablekb: 1,
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
  }, [video.youtubeId]);

  // Reset typing state whenever the active sentence changes (manual or auto).
  useEffect(() => {
    setInput("");
    setRevealed(new Set());
  }, [activeIndex]);

  // Continuous tracker: auto-pause at stopAt, auto-select sentence by current time.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime?.();
      if (typeof t !== "number") return;
      const ms = t * 1000;

      const state = player.getPlayerState?.();
      setIsPlaying((prev) => (prev !== (state === 1) ? state === 1 : prev));

      // Skip auto-select while a manual seek is still in flight (the player's
      // currentTime can lag and snap us back to the previous sentence).
      const pending = pendingTargetRef.current;
      if (pending) {
        const arrived = ms >= pending.startMs && ms < pending.endMs;
        if (arrived || Date.now() > pending.deadlineAt) {
          pendingTargetRef.current = null;
        } else {
          return;
        }
      }

      let didAutoPause = false;
      if (stopAtMsRef.current !== null && ms >= stopAtMsRef.current) {
        player.pauseVideo();
        stopAtMsRef.current = null;
        didAutoPause = true;
      }

      // Only auto-advance the active sentence while the video is actually playing,
      // so an auto-pause at endMs doesn't bump us into the next sentence.
      if (state !== 1 || didAutoPause) return;

      const matches: number[] = [];
      sentences.forEach((s, i) => {
        if (ms >= s.startMs && ms < s.endMs) matches.push(i);
      });
      if (matches.length === 0) return;
      setActiveIndex((prev) => (matches.includes(prev) ? prev : (matches[0] ?? prev)));
    }, 250);
    return () => window.clearInterval(interval);
  }, [sentences]);

  const playFromSentence = (s: Sentence) => {
    if (!playerRef.current) return;
    stopAtMsRef.current = s.endMs;
    pendingTargetRef.current = {
      startMs: s.startMs,
      endMs: s.endMs,
      deadlineAt: Date.now() + 2000,
    };
    playerRef.current.seekTo(s.startMs / 1000, true);
    playerRef.current.playVideo();
  };

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

  const replay = () => {
    if (active) playFromSentence(active);
  };

  const goTo = (index: number) => {
    if (index < 0 || index >= sentences.length) return;
    setActiveIndex(index);
    const s = sentences[index];
    if (s) playFromSentence(s);
  };

  const next = () => goTo(activeIndex + 1);
  const prev = () => goTo(activeIndex - 1);

  const revealWord = (i: number) => {
    setRevealed((prev) => new Set(prev).add(i));
    if (active) {
      setRevealedSentences((prev) => new Set(prev).add(active.index));
    }
  };

  const revealAll = () => {
    if (!active) return;
    setRevealed(new Set(wordStates.map((_, i) => i)));
    setRevealedSentences((prev) => new Set(prev).add(active.index));
  };

  const progress = useMemo(() => {
    return sentences.length === 0 ? 0 : Math.round((completed.size / sentences.length) * 100);
  }, [completed.size, sentences.length]);

  return (
    <div
      className="grid grid-cols-[1fr_1.2fr_1fr] gap-4 h-[calc(100vh-8rem)]"
      onMouseDown={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest('textarea, input, [contenteditable="true"]')) return;
        e.preventDefault();
      }}
    >
      {/* LEFT: Video */}
      <Card className="overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Video
          </CardTitle>
          <div className="space-y-1">
            <p className="font-medium line-clamp-2">{video.title}</p>
            <p className="text-xs text-muted-foreground">{video.channel}</p>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
            <div ref={containerRef} className="w-full h-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={togglePlay} className="w-full">
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </>
              )}
            </Button>
            <Button onClick={replay} variant="secondary" className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Replay
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MIDDLE: Practice */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Sentence {activeIndex + 1} / {sentences.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-auto">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={prev}
                disabled={activeIndex === 0}
                className="h-9 w-9 rounded-full"
                title="Previous sentence"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={replay}
                className="h-9 w-9 rounded-full"
                title="Replay this sentence"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                disabled={activeIndex >= sentences.length - 1}
                className="h-9 w-9 rounded-full"
                title="Next sentence"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Type what you hear
            </p>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Listen and type…"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === "Tab") && allFinalized) {
                  e.preventDefault();
                  next();
                  return;
                }
                if (e.key === "Enter") e.preventDefault();
              }}
            />
          </div>

          {wordStates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {wordStates.map((w, i) => {
                const showEye = w.kind !== "correct" && w.kind !== "revealed";
                return (
                  <div key={`${activeIndex}-${i}`} className="flex flex-col items-center gap-1">
                    {showEye ? (
                      <button
                        type="button"
                        onClick={() => revealWord(i)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Reveal word (counts as a mistake)"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="h-3.5" />
                    )}
                    <span
                      className={`px-2 py-1 rounded-md border font-mono text-sm ${tileClass(w.kind)}`}
                    >
                      {w.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {revealed.size > 0 && (
            <p className="text-xs text-muted-foreground">
              Revealed words count as mistakes and won't credit this sentence.
            </p>
          )}

          {cleanCorrect && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-center">
              <p className="font-medium text-green-300">✓ Correct</p>
              <p className="text-xs text-muted-foreground mt-1">Press Enter or Tab to continue</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!cleanCorrect && (
              <Button onClick={revealAll} variant="destructive">
                Show all words
              </Button>
            )}
            <Button onClick={next} variant="default" disabled={activeIndex >= sentences.length - 1}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT: Transcript */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Transcript
            </CardTitle>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-2">
          {sentences.map((s, i) => {
            const isActive = i === activeIndex;
            const isDone = completed.has(s.index);
            const wasRevealed = revealedSentences.has(s.index);
            return (
              <button
                type="button"
                key={s.index}
                onClick={() => goTo(i)}
                className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : isDone
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-border hover:bg-muted/50"
                }`}
              >
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                  <span>#{i + 1}</span>
                  {wasRevealed && <span className="text-amber-400">(revealed)</span>}
                </p>
                <p
                  className={`text-sm ${isDone ? "" : "font-mono tracking-wider text-muted-foreground"}`}
                >
                  {isDone ? s.text : maskSentence(s.text)}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
