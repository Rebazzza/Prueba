import { useState } from "react";
import { bucketUrl } from "../lib/supabase";
import { useMusic } from "../music/MusicContext";

const LILIES = Array.from({ length: 7 }, (_, i) => bucketUrl(`Lirio${i + 1}.png`));

const LILY_STAGGER_MS = 250;
const LILY_DURATION_MS = 700;

export default function LoveIntro({ onFinish }: { onFinish: () => void }) {
  const [opened, setOpened] = useState(false);
  const { playByTitle } = useMusic();

  if (!opened) {
    return (
      <button
        type="button"
        onClick={() => {
          playByTitle("Superpowers");
          setOpened(true);
        }}
        className="fixed inset-0 z-[60] flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-noir via-wine-950 to-noir px-6"
      >
        <p className="font-script mb-12 text-center text-6xl leading-tight font-bold text-gold-200 drop-shadow-[0_4px_20px_rgba(246,228,168,0.25)] sm:text-7xl">
          Un mes más mi vida
        </p>
        <img
          src={bucketUrl("Carta.png")}
          alt="Carta para ti"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/Carta.png";
          }}
          className="w-72 animate-pulse sm:w-80"
        />
        <p className="font-cinzel mt-12 text-xs tracking-[0.25em] text-gold-300/80 uppercase">
          Tocá la carta para abrir 
        </p>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-b from-noir via-wine-950 to-noir">
      {LILIES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt="Lirio"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = `/Lirio${i + 1}.png`;
          }}
          className="lily-frame absolute inset-0 m-auto h-72 w-72 object-contain sm:h-80 sm:w-80"
          style={{
            animationDelay: `${i * LILY_STAGGER_MS}ms`,
            animationDuration: `${LILY_DURATION_MS}ms`,
          }}
          onAnimationEnd={i === LILIES.length - 1 ? onFinish : undefined}
        />
      ))}
      <p className="font-script absolute bottom-10 text-4xl text-gold-300 drop-shadow-sm">
        Un mes más mi vida 
      </p>
    </div>
  );
}