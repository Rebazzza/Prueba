import { Music2, ExternalLink } from "lucide-react";
import PageHeader from "../components/PageHeader";
import MusicPlayer from "../components/MusicPlayer";

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
            <MusicPlayer />

            <div className="absolute -bottom-3 -left-3 -rotate-6 rounded-lg border border-gold-400/40 bg-gold-100 px-3 py-1.5 shadow-md">
              <span className="font-script text-lg text-wine-800">
                Nuestra playlist
              </span>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="font-cormorant mb-2 text-xs text-stone-500 italic">
              ♪ Las canciones que nos gustan ♪
            </p>
            <a
              href={SPOTIFY_PLAYLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-cinzel inline-flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gradient-to-br from-stone-950 via-wine-950 to-black px-4 py-2 text-[11px] font-semibold tracking-widest text-gold-300 uppercase shadow-lg transition-all hover:border-gold-300 hover:shadow-[0_0_18px_rgba(222,184,81,0.35)] active:scale-95"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir en Spotify
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}