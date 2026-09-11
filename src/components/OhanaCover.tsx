import { useRef, useState, useEffect } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { Heart, X, ZoomIn, ZoomOut } from "lucide-react";
import { bucketUrl } from "../lib/supabase";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.5;

function ControlButton({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 text-gold-200 shadow-lg transition-all hover:bg-wine-900 active:scale-90 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export default function OhanaCover() {
  const [letterOpen, setLetterOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

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

  function clampOffset(o: { x: number; y: number }) {
    const box = boxRef.current;
    const img = imgRef.current;
    if (!box || !img) return o;
    const w = img.clientWidth * zoom;
    const h = img.clientHeight * zoom;
    const maxX = Math.max(0, (w - box.clientWidth) / 2);
    const maxY = Math.max(0, (h - box.clientHeight) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, o.x)),
      y: Math.min(maxY, Math.max(-maxY, o.y)),
    };
  }

  function zoomTo(next: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom(clamped);
    setOffset({ x: 0, y: 0 });
  }

  function onPointerDown(e: ReactPointerEvent<HTMLImageElement>) {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    setDragging(true);
    (e.currentTarget as HTMLImageElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLImageElement>) {
    if (!dragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(
      clampOffset({
        x: dragRef.current.offsetX + dx,
        y: dragRef.current.offsetY + dy,
      })
    );
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLImageElement>) {
    setDragging(false);
    dragRef.current = null;
    (e.currentTarget as HTMLImageElement).releasePointerCapture?.(e.pointerId);
  }

  function onWheel(e: ReactWheelEvent<HTMLImageElement>) {
    if (zoom <= 1) return;
    setOffset((o) => clampOffset({ x: o.x, y: o.y - e.deltaY }));
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-noir via-wine-950 to-noir px-4 pt-12 pb-16 text-center">
      <div className="pointer-events-none absolute top-6 left-6 text-4xl opacity-10 select-none">
        🌺
      </div>
      <div className="pointer-events-none absolute top-10 right-6 text-3xl opacity-10 select-none">
        ⭐
      </div>

      <div className="relative z-10 mx-auto max-w-xl md:max-w-2xl">
        <h1 className="font-script mb-2 text-6xl font-bold text-gold-200 drop-shadow-[0_4px_24px_rgba(246,228,168,0.3)] sm:text-7xl">
          Nuestro Diario de Amor
        </h1>

        <div className="mx-auto mb-8 flex items-center justify-center gap-2">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400/60" />
          <Heart className="h-4 w-4 fill-gold-400 text-gold-400" />
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400/60" />
        </div>

        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            setLetterOpen(true);
          }}
          title="Abrir la carta"
          className="group mx-auto mb-4 block w-full cursor-pointer transition-transform duration-300 hover:scale-[1.02] active:scale-95"
        >
          <img
            src={bucketUrl("CartaAbierta.png")}
            alt="Carta abierta"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/CartaAbierta.png";
            }}
            className="w-full"
          />
        </button>

        <p className="font-cinzel mb-10 text-[10px] tracking-[0.3em] text-gold-300/80 uppercase">
          Presiona la carta para leer la nota
        </p>
      </div>

      {letterOpen && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-noir/95 p-3 backdrop-blur-sm"
          onClick={() => setLetterOpen(false)}
        >
          <div className="flex items-center justify-between px-1">
            <p className="font-cinzel text-[10px] tracking-[0.3em] text-gold-300/80 uppercase">
              Nuestra carta
            </p>
            <button
              onClick={() => setLetterOpen(false)}
              title="Cerrar (Esc)"
              className="font-cinzel flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 text-gold-200 transition-all hover:bg-wine-900 active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={boxRef}
            onClick={(e) => e.stopPropagation()}
            className="relative mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg"
          >
            <img
              ref={imgRef}
              src={bucketUrl("Letra.png")}
              alt="Letra"
              draggable={false}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/Letra.png";
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onWheel={onWheel}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: dragging ? "none" : "transform 220ms ease",
                touchAction: "none",
              }}
              className={`h-auto max-h-[92%] w-auto max-w-[96vw] rounded-lg border border-gold-400/20 object-contain shadow-2xl select-none ${
                dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            />
          </div>

          <div className="flex items-center justify-center gap-4 px-1 pt-3 pb-1">
            <ControlButton
              onClick={() => zoomTo(zoom / ZOOM_STEP)}
              title="Alejar"
              disabled={zoom <= 1}
            >
              <ZoomOut className="h-5 w-5" />
            </ControlButton>
            <ControlButton
              onClick={() => zoomTo(1)}
              title="Ajustar tamaño"
              disabled={zoom === 1}
            >
              <span className="font-cinzel text-[11px] tracking-wider">
                {Math.round(zoom * 100)}%
              </span>
            </ControlButton>
            <ControlButton
              onClick={() => zoomTo(zoom * ZOOM_STEP)}
              title="Acercar"
              disabled={zoom >= 4}
            >
              <ZoomIn className="h-5 w-5" />
            </ControlButton>
          </div>

          <p className="font-cinzel pb-1 pt-1 text-center text-[9px] tracking-[0.25em] text-gold-300/60 uppercase">
            {zoom > 1
              ? "Arrastrá la carta para moverla"
              : "Usá + para acercarla"}
          </p>
        </div>
      )}
    </section>
  );
}