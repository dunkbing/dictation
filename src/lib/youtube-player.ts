export type YTPlayer = {
  loadVideoById?: (opts: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
  cueVideoById?: (opts: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getPlayerState?: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: { Player: new (id: string, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
