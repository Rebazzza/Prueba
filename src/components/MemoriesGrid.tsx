import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import type { Memory } from "../types";

const ROTATIONS = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2", "-rotate-1"];

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SkeletonCard() {
  return (
    <div className="rounded-sm border border-gold-400/15 bg-wine-950/60 p-3 shadow-xl">
      <div className="mb-3 aspect-square animate-pulse rounded-sm bg-stone-900" />
      <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-stone-800" />
      <div className="h-2 w-full animate-pulse rounded bg-stone-800/80" />
      <div className="mt-3 h-2 w-1/3 animate-pulse rounded bg-stone-800/60" />
    </div>
  );
}

function ErrorCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-wine-600/40 bg-wine-950/50 px-6 py-8 text-center shadow-xl">
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-gold-400/70" />
      <p className="font-cormorant mb-2 text-lg text-stone-300 italic">
        No se pudieron cargar los recuerdos.
      </p>
      <p className="font-cormorant mb-5 text-sm text-stone-500 italic">
        {error}
      </p>
      <button
        onClick={onRetry}
        className="font-cinzel inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-wine-900 px-5 py-2 text-[11px] font-semibold tracking-widest text-gold-200 uppercase transition-all hover:border-gold-300/60 active:scale-95"
      >
        Reintentar
      </button>
    </div>
  );
}

export interface MemoriesGridProps {
  heading?: string;
  /** Cambiá este valor para provocar una nueva lectura desde Supabase. */
  refreshKey?: number;
}

export default function MemoriesGrid({ heading, refreshKey = 0 }: MemoriesGridProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from("memories")
          .select("*")
          .order("date", { ascending: false })
          .limit(100);

        if (cancelled) return;
        if (fetchErr) throw new Error(getErrorText(fetchErr));
        setMemories((data ?? []) as Memory[]);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(getErrorText(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, refreshKey]);

  function startEdit(memory: Memory) {
    setEditingId(memory.id);
    setEditDesc(memory.description ?? "");
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (savingEdit) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const description = editDesc.trim() || null;
      const { error: updateErr } = await supabase
        .from("memories")
        .update({ description })
        .eq("id", id);
      if (updateErr) throw new Error(getErrorText(updateErr));
      setMemories((list) =>
        list.map((m) => (m.id === id ? { ...m, description } : m))
      );
      setEditingId(null);
    } catch (err) {
      setEditError(getErrorText(err));
    } finally {
      setSavingEdit(false);
    }
  }

  useEffect(() => {
    if (lightboxIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i === null ? i : (i + 1) % memories.length));
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) =>
          i === null ? i : (i - 1 + memories.length) % memories.length
        );
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex, memories.length]);

  return (
    <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {heading && (
          <p className="font-cinzel mb-3 text-[11px] tracking-[0.25em] text-gold-400 uppercase">
            {heading} {!loading && !error && (
              <span className="text-gold-400/60">({memories.length})</span>
            )}
          </p>
        )}

        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorCard
            error={error}
            onRetry={() => {
              setLoading(true);
              setReloadToken((t) => t + 1);
            }}
          />
        )}

        {!loading && !error && memories.length === 0 && (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-gold-400/25 bg-wine-950/50 p-10 text-center shadow-xl">
            <p className="font-cormorant text-lg text-stone-400 italic">
              El diario todavía no tiene recuerdos…
            </p>
            <p className="font-cormorant text-sm text-stone-600 italic">
              Cargá la primera foto desde el botón de la galería.
            </p>
          </div>
        )}

        {!loading && !error && memories.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {memories.map((memory, i) => (
              <div
                key={memory.id}
                className={`${ROTATIONS[i % ROTATIONS.length]} group transition-transform duration-300 hover:rotate-0`}
              >
                <article className="relative rounded-sm border border-gold-400/25 bg-wine-950/80 p-3 shadow-2xl">
                  {editingId !== memory.id && (
                    <button
                      onClick={() => startEdit(memory)}
                      title="Editar texto"
                      className="font-cinzel absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gold-400 text-wine-950 shadow-lg opacity-0 transition-all hover:bg-gold-300 active:scale-90 group-hover:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setLightboxIndex(i)}
                    title="Ver más grande"
                    className="relative mb-3 block aspect-square w-full cursor-zoom-in overflow-hidden rounded-sm bg-stone-900 transition-transform duration-300 group-hover:scale-[1.02]"
                  >
                    {memory.image_url ? (
                      <img
                        src={memory.image_url}
                        alt={memory.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-cormorant text-xs text-stone-600 italic">
                          Sin foto
                        </span>
                      </div>
                    )}
                  </button>

                  {editingId === memory.id ? (
                    <div>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Descripción (opcional)"
                        className="font-cormorant mb-2 w-full rounded-lg border border-gold-400/30 bg-stone-950/90 px-2.5 py-1.5 text-sm text-stone-100 italic outline-none placeholder:text-stone-600 focus:border-gold-300"
                      />
                      {editError && (
                        <p className="font-cormorant mb-2 text-[11px] text-rose-300 italic">
                          No se pudo guardar: {editError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={savingEdit}
                          className="font-cinzel flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-400/30 bg-wine-900 py-2 text-[10px] font-semibold tracking-widest text-gold-200 uppercase transition-all active:scale-95 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveEdit(memory.id)}
                          disabled={savingEdit}
                          className="font-cinzel flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold-400 py-2 text-[10px] font-semibold tracking-widest text-wine-950 uppercase shadow-lg transition-all hover:bg-gold-300 active:scale-95 disabled:opacity-50"
                        >
                          {savingEdit ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="font-cinzel block text-[9px] tracking-[0.2em] text-gold-400 uppercase">
                        {formatDate(memory.date)}
                      </span>
                      {memory.description && (
                        <p className="font-cormorant mt-1 text-lg leading-snug text-ivory-100 italic">
                          {memory.description}
                        </p>
                      )}
                    </>
                  )}
                </article>
              </div>
            ))}
          </div>
        )}

        {lightboxIndex !== null && memories[lightboxIndex] && (
          <div
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-noir/95 p-4 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              title="Cerrar (Esc)"
              className="font-cinzel absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 text-gold-200 transition-all hover:bg-wine-900 active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>

            {memories.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) =>
                    i === null ? i : (i - 1 + memories.length) % memories.length
                  );
                }}
                title="Anterior (←)"
                className="font-cinzel absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-gold-400/30 bg-wine-950/80 p-2.5 text-gold-200 transition-all hover:bg-wine-900 active:scale-90 sm:left-5"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {memories.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) =>
                    i === null ? i : (i + 1) % memories.length
                  );
                }}
                title="Siguiente (→)"
                className="font-cinzel absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-gold-400/30 bg-wine-950/80 p-2.5 text-gold-200 transition-all hover:bg-wine-900 active:scale-90 sm:right-5"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            <figure
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-full max-w-full flex-col items-center"
            >
              <img
                key={memories[lightboxIndex].image_url}
                src={memories[lightboxIndex].image_url}
                alt={memories[lightboxIndex].title}
                className="max-h-[82vh] w-auto max-w-[92vw] rounded-lg border border-gold-400/20 object-contain shadow-2xl"
              />
              <figcaption className="mt-4 text-center">
                {memories[lightboxIndex].description && (
                  <p className="font-cormorant mx-auto mb-1 max-w-prose text-xl leading-snug text-ivory-100 italic">
                    {memories[lightboxIndex].description}
                  </p>
                )}
                <p className="font-cinzel text-[10px] tracking-wider text-gold-400 uppercase">
                  {formatDate(memories[lightboxIndex].date)} ·{" "}
                  {lightboxIndex + 1}/{memories.length}
                </p>
              </figcaption>
            </figure>
          </div>
        )}
      </div>
    </section>
  );
}