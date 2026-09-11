import { useState } from "react";

const LILIES = Array.from({ length: 7 }, (_, i) => `/Lirio${i + 1}.png`);

const LILY_STAGGER_MS = 250;
const LILY_DURATION_MS = 700;

export default function LoveIntro({ onFinish }: { onFinish: () => void }) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        className="fixed inset-0 z-[60] flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-noir via-wine-950 to-noir px-6"
      >
        <p className="font-script mb-12 text-center text-5xl leading-tight font-bold text-gold-200 drop-shadow-[0_4px_20px_rgba(246,228,168,0.25)] sm:text-6xl">
          Un mes más mi vida
        </p>
        <img
          src="/Carta.png"
          alt="Carta para ti"
          className="w-56 animate-pulse sm:w-64"
        />
        <p className="font-cinzel mt-12 text-[11px] tracking-[0.25em] text-gold-300/80 uppercase">
          Tocá la carta para abrir 🎁
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
          className="lily-frame absolute inset-0 m-auto h-72 w-72 object-contain sm:h-80 sm:w-80"
          style={{
            animationDelay: `${i * LILY_STAGGER_MS}ms`,
            animationDuration: `${LILY_DURATION_MS}ms`,
          }}
          onAnimationEnd={i === LILIES.length - 1 ? onFinish : undefined}
        />
      ))}
      <p className="font-script absolute bottom-10 text-2xl text-gold-300 drop-shadow-sm">
        Un mes más mi vida 
      </p>
    </div>
  );
}