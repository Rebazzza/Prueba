import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import type { PlaylistSong } from "../types";

interface MusicContextValue {
  songs: PlaylistSong[];
  currentSong: PlaylistSong | null;
  isPlaying: boolean;
  loaded: boolean;
  isConnected: boolean;
  syncError: string | null;
  progress: number;
  duration: number;
  playSongById: (id: string) => void;
  playByTitle: (title: string) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const songsRef = useRef<PlaylistSong[]>([]);
  const pendingTitle = useRef<string | null>(null);

  const currentSong =
    songs.find((s) => s.id === currentId) ?? null;

  async function loadSongs() {
    try {
      const { data, error } = await supabase
        .from("playlist_songs")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(getErrorText(error));
      const list = (data ?? []) as PlaylistSong[];

      const prev = songsRef.current;
      const changed =
        list.length !== prev.length ||
        list.some((s, i) => {
          const p = prev[i];
          return (
            !p ||
            p.id !== s.id ||
            p.title !== s.title ||
            p.artist !== s.artist ||
            p.audio_url !== s.audio_url ||
            p.cover_url !== s.cover_url
          );
        });
      if (!changed) return;

      songsRef.current = list;
      const keepId = currentIdRef.current;
      const keepIdx =
        keepId && list.length > 0 ? list.findIndex((s) => s.id === keepId) : -1;
      setCurrentId(keepIdx >= 0 ? list[keepIdx].id : list[0]?.id ?? null);
      setSongs(list);
      setSyncError(null);
    } catch (err) {
      setSyncError("No se pudieron cargar las canciones: " + getErrorText(err));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void loadSongs();
    const channel = supabase
      .channel("music-global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playlist_songs" },
        () => loadSongs()
      )
      .subscribe((status) => {
        if (!cancelled) setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const playByTitle = useCallback((title: string) => {
    const found = songsRef.current.find(
      (s) => s.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (found) {
      setCurrentId(found.id);
      setIsPlaying(true);
      const audio = audioRef.current;
      if (audio) {
        audio.setAttribute("src", found.audio_url);
        audio.load();
        audio.play().catch(() => setIsPlaying(false));
      }
    } else {
      pendingTitle.current = title;
    }
  }, []);

  useEffect(() => {
    if (!pendingTitle.current) return;
    const t = pendingTitle.current;
    const found = songsRef.current.find(
      (s) => s.title.trim().toLowerCase() === t.trim().toLowerCase()
    );
    if (!found) return;
    pendingTitle.current = null;
    setCurrentId(found.id);
    setIsPlaying(true);
  }, [songs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const song = songsRef.current.find((s) => s.id === currentId) ?? null;
    currentIdRef.current = currentId;
    setProgress(0);
    if (!song) return;
    if (audio.getAttribute("src") === song.audio_url) return;
    audio.setAttribute("src", song.audio_url);
    audio.load();
  }, [currentId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else if (!audio.paused) {
      audio.pause();
    }
  }, [currentId, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      const list = songsRef.current;
      if (list.length === 0) return setIsPlaying(false);
      const idx = list.findIndex((s) => s.id === currentIdRef.current);
      const nx = (idx + 1 + list.length) % list.length;
      setCurrentId(list[nx].id);
      setIsPlaying(true);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  }, [currentSong, isPlaying]);

  const step = useCallback((dir: 1 | -1) => {
    const list = songsRef.current;
    if (list.length === 0) return;
    const idx = list.findIndex((s) => s.id === currentIdRef.current);
    const base = idx < 0 ? 0 : idx;
    const nx = (base + dir + list.length) % list.length;
    setCurrentId(list[nx].id);
    setIsPlaying(true);
  }, []);

  const value: MusicContextValue = {
    songs,
    currentSong,
    isPlaying,
    loaded,
    isConnected,
    syncError,
    progress,
    duration,
    playSongById: (id: string) => {
      setCurrentId(id);
      setIsPlaying(true);
      const audio = audioRef.current;
      const song = songsRef.current.find((s) => s.id === id);
      if (audio && song) {
        audio.setAttribute("src", song.audio_url);
        audio.load();
        audio.play().catch(() => setIsPlaying(false));
      }
    },
    playByTitle,
    togglePlay,
    next: () => step(1),
    prev: () => step(-1),
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio ref={audioRef} className="hidden" preload="metadata" />
    </MusicContext.Provider>
  );
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic debe usarse dentro de MusicProvider");
  return ctx;
}