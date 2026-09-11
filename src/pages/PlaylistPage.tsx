import { Disc3, Music2, ExternalLink } from "lucide-react";
import PageHeader from "../components/PageHeader";

const SPOTIFY_PLAYLIST_ID = "016pUtcmfnoYJEv40R7O7T";
const SPOTIFY_PLAYLIST_URL = `https://open.spotify.com/playlist/${SPOTIFY_PLAYLIST_ID}`;

export default function PlaylistPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-noir via-wine-950 to-noir pb-32">
      <PageHeader
        onBack={onBack}
        title="Música"
        subtitle="R&R FM · nuestro playlist"
        icon={Music2}
        headerClass="bg-gradient-to-r from-wine-900/90 to-wine-950/90 border-b border-gold-400/15"
        iconClass="text-gold-300"
      />

      <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 pt-2 pb-16">
        <div className="mx-auto max-w-2xl">
          <div className="relative mx-auto max-w-xl">
            <div className="rounded-2xl border border-gold-400/25 bg-gradient-to-br from-stone-950 via-wine-950 to-black p-4 shadow-2xl">
              <div className="absolute top-3 right-4 flex items-center gap-1">
                <Disc3 className="h-3 w-3 animate-spin text-gold-400" />
                <span className="font-cinzel text-[9px] font-semibold tracking-widest text-gold-400 uppercase">
                  PLAYING
                </span>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-wine-700" />
                <div className="h-2 w-2 rounded-full bg-gold-500" />
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="ml-2 font-cinzel text-[10px] tracking-widest text-stone-500 uppercase">
                  R&R FM
                </span>
              </div>

              <div className="overflow-hidden rounded-xl">
                <iframe
                  src={`https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                  title="Nuestra Playlist"
                />
              </div>

              <div className="mt-3 text-center">
                <p className="font-cormorant text-xs text-stone-500 italic">
                  ♪ Las canciones que nos gustan ♪
                </p>
                <a
                  href={SPOTIFY_PLAYLIST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-cinzel mt-3 inline-flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gradient-to-br from-stone-950 via-wine-950 to-black px-4 py-2 text-[11px] font-semibold tracking-widest text-gold-300 uppercase shadow-lg transition-all hover:border-gold-300 hover:shadow-[0_0_18px_rgba(222,184,81,0.35)] active:scale-95"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir en Spotify
                </a>
              </div>
            </div>

            <div className="absolute -bottom-3 -left-3 -rotate-6 rounded-lg border border-gold-400/40 bg-gold-100 px-3 py-1.5 shadow-md">
              <span className="font-script text-lg text-wine-800">
                Nuestra playlist
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}