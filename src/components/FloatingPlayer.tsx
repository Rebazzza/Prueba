import { useMemo } from "react";
import { Music2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useMusic } from "../music/MusicContext";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FloatingPlayer({ hidden = false }: { hidden?: boolean }) {
  const { currentSong, isPlaying, progress, duration, togglePlay, next, prev } =
    useMusic();

  const pct = useMemo(
    () => (duration > 0 ? Math.min(100, (progress / duration) * 100) : 0),
    [progress, duration]
  );

  if (hidden || !currentSong) return null;

  return (
    <div
      className="fixed left-1/2 z-40 w-[calc(100%-1.25rem)] max-w-xl -translate-x-1/2"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="overflow-hidden rounded-2xl border border-gold-400/25 bg-wine-950/90 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div
          className="h-0.5 bg-gradient-to-r from-gold-500 to-gold-300"
          style={{ width: `${pct}%` }}
        />
        <div className="flex items-center gap-3 px-3 py-2.5">
          {currentSong.cover_url ? (
            <img
              src={currentSong.cover_url}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg border border-gold-400/20 object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-wine-900 text-gold-400">
              <Music2 className="h-4 w-4" />
            </span>
          )}

          <button
            onClick={togglePlay}
            title={isPlaying ? "Pausar" : "Reproducir"}
            className="min-w-0 flex-1 text-left"
          >
            <span className="font-script block truncate text-[15px] leading-tight text-gold-100">
              {currentSong.title}
            </span>
            <span className="font-cinzel block truncate text-[8px] tracking-[0.2em] text-gold-400/70 uppercase">
              {currentSong.artist} · {formatTime(progress)} / {formatTime(duration)}
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={prev}
              title="Anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/20 text-gold-300 transition-colors hover:bg-wine-900 active:scale-90"
            >
              <SkipBack className="h-3.5 w-3.5" fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              title={isPlaying ? "Pausar" : "Reproducir"}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-300 text-wine-950 shadow-lg transition-transform hover:from-gold-400 to-gold-200 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
              )}
            </button>
            <button
              onClick={next}
              title="Siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/20 text-gold-300 transition-colors hover:bg-wine-900 active:scale-90"
            >
              <SkipForward className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}