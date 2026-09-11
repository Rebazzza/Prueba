import {
  Disc3,
  Loader2,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useMusic } from "../music/MusicContext";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Reel({ playing }: { playing: boolean }) {
  return (
    <div
      className={`relative h-14 w-14 rounded-full border border-stone-700 bg-stone-900 shadow-inner ${
        playing ? "animate-spin" : ""
      }`}
      style={playing ? { animationDuration: "3.5s" } : undefined}
    >
      <div className="absolute inset-2 rounded-full border border-stone-700/80" />
      <div className="absolute inset-[18px] rounded-full bg-stone-800" />
      <div className="absolute top-0 left-1/2 h-2 w-1 -translate-x-1/2 rounded-full bg-gold-400/80" />
    </div>
  );
}

export default function MusicPlayer() {
  const {
    songs,
    currentSong,
    isPlaying,
    loaded,
    isConnected,
    syncError,
    progress,
    duration,
    playSongById,
    togglePlay,
    next,
    prev,
  } = useMusic();

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="relative rounded-2xl border border-gold-400/25 bg-gradient-to-br from-stone-950 via-wine-950 to-black p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-wine-700" />
          <div className="h-2 w-2 rounded-full bg-gold-500" />
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="ml-1 font-cinzel text-[10px] tracking-widest text-stone-500 uppercase">
            R&R FM
          </span>
        </div>
        <span className="font-cinzel flex items-center gap-1 text-[9px] font-semibold tracking-widest text-gold-400 uppercase">
          <Disc3 className={`h-3 w-3 ${isPlaying ? "animate-spin" : ""}`} />
          {isConnected ? (isPlaying ? "PLAYING" : "PAUSED") : "MODO LOCAL"}
        </span>
      </div>

      <div className="relative mb-4 overflow-hidden rounded-xl border border-stone-800 bg-stone-950/80 p-4 shadow-inner">
        {currentSong?.cover_url ? (
          <img
            src={currentSong.cover_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
        ) : null}
        <div className="relative flex items-center justify-between px-1">
          <Reel playing={isPlaying} />
          <div className="mx-3 min-w-0 flex-1 text-center">
            {currentSong ? (
              <>
                <p className="font-script truncate text-xl text-gold-200 drop-shadow-[0_2px_12px_rgba(246,228,168,0.25)]">
                  {currentSong.title}
                </p>
                <p className="font-cinzel mt-0.5 truncate text-[10px] tracking-[0.3em] text-gold-400/80 uppercase">
                  {currentSong.artist}
                </p>
              </>
            ) : (
              <p className="font-cormorant text-sm text-stone-500 italic">
                Elige una canción…
              </p>
            )}
          </div>
          <Reel playing={isPlaying} />
        </div>

        <div className="relative mt-4">
          <div className="h-1 overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-cinzel text-[9px] tracking-widest text-stone-500">
              {formatTime(progress)}
            </span>
            <span className="font-cinzel text-[9px] tracking-widest text-stone-500">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-center gap-5">
        <button
          onClick={prev}
          disabled={!currentSong}
          title="Anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/25 text-gold-300 transition-all hover:bg-wine-900 active:scale-90 disabled:opacity-35"
        >
          <SkipBack className="h-4 w-4" fill="currentColor" />
        </button>
        <button
          onClick={togglePlay}
          disabled={!currentSong}
          title={isPlaying ? "Pausar" : "Reproducir"}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-300 text-wine-950 shadow-[0_0_24px_rgba(222,184,81,0.35)] transition-all hover:from-gold-400 to-gold-200 active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
          )}
        </button>
        <button
          onClick={next}
          disabled={!currentSong}
          title="Siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/25 text-gold-300 transition-all hover:bg-wine-900 active:scale-90 disabled:opacity-35"
        >
          <SkipForward className="h-4 w-4" fill="currentColor" />
        </button>
      </div>

      {syncError && (
        <p className="font-cormorant mb-3 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200 italic">
          ⚠️ {syncError}
          <span className="mt-0.5 block text-[10px] text-rose-300/70">
            Revisa el SQL de Supabase: la tabla playlist_songs debe existir.
          </span>
        </p>
      )}

      <div className="mt-2">
        {!loaded ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gold-300" />
          </div>
        ) : songs.length === 0 ? (
          <p className="font-cormorant text-center text-sm text-stone-500 italic">
            Todavía no hay canciones en la playlist…
          </p>
        ) : (
          <ul className="space-y-1.5">
            {songs.map((song) => {
              const active = song.id === currentSong?.id;
              return (
                <li key={song.id}>
                  <button
                    onClick={() =>
                      active ? togglePlay() : playSongById(song.id)
                    }
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all active:scale-[0.99] ${
                      active
                        ? "border-gold-400/40 bg-wine-900/60"
                        : "border-transparent bg-stone-950/40 hover:border-gold-400/20"
                    }`}
                  >
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-wine-900 text-gold-400">
                        {active && isPlaying ? (
                          <Disc3 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Music2 className="h-4 w-4" />
                        )}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`font-cormorant block truncate text-[15px] italic ${
                          active ? "text-gold-100" : "text-stone-300"
                        }`}
                      >
                        {song.title}
                      </span>
                      <span className="font-cinzel block truncate text-[9px] tracking-[0.2em] text-stone-500 uppercase">
                        {song.artist}
                      </span>
                    </span>
                    {active && isPlaying && (
                      <span className="flex items-end gap-0.5" aria-hidden>
                        <span className="eq-bar h-3 w-0.5 bg-gold-400" />
                        <span
                          className="eq-bar h-4 w-0.5 bg-gold-400"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <span
                          className="eq-bar h-2.5 w-0.5 bg-gold-400"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}