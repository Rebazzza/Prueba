import { useState, useEffect } from "react";
import { Heart, X } from "lucide-react";

export default function OhanaCover() {
  const [letterOpen, setLetterOpen] = useState(false);

  useEffect(() => {
    if (!letterOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLetterOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [letterOpen]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-noir via-wine-950 to-noir px-4 pt-12 pb-16 text-center">
      <div className="pointer-events-none absolute top-6 left-6 text-4xl opacity-10 select-none">
        🌺
      </div>
      <div className="pointer-events-none absolute top-10 right-6 text-3xl opacity-10 select-none">
        ⭐
      </div>

      <div className="relative z-10 mx-auto max-w-md md:max-w-lg">
        <h1 className="font-script mb-2 text-5xl font-bold text-gold-200 drop-shadow-[0_4px_24px_rgba(246,228,168,0.3)] sm:text-6xl">
          Nuestro Diario de Amor
        </h1>

        <div className="mx-auto mb-8 flex items-center justify-center gap-2">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400/60" />
          <Heart className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400/60" />
        </div>

        <button
          type="button"
          onClick={() => setLetterOpen(true)}
          title="Abrir la carta"
          className="group mx-auto mb-4 block w-full cursor-pointer transition-transform duration-300 hover:scale-[1.02] active:scale-95"
        >
          <img
            src="/CartaAbierta.png"
            alt="Carta abierta"
            className="w-full"
          />
        </button>

        <p className="font-cinzel mb-10 text-[10px] tracking-[0.3em] text-gold-300/80 uppercase">
          Presiona la carta para leer la nota 
        </p>

        
      </div>

      {letterOpen && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-noir/95 p-4 backdrop-blur-sm"
          onClick={() => setLetterOpen(false)}
        >
          <button
            onClick={() => setLetterOpen(false)}
            title="Cerrar (Esc)"
            className="font-cinzel absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 text-gold-200 transition-all hover:bg-wine-900 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] overflow-y-auto"
          >
            <img
              src="/Letra.png"
              alt="Letra"
              className="mx-auto w-auto max-w-[94vw] rounded-lg border border-gold-400/20 object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}