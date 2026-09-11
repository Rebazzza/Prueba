import { useEffect, useState } from "react";
import { Heart, Loader2, Plus, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import { useProfile, getDisplayName } from "../auth/ProfileContext";
import type { ProfileId } from "../auth/ProfileContext";

type Reason = { reason_text: string; author: string };

const DEFAULT_REASONS: Reason[] = [
  {
    author: "M",
    reason_text:
      "Porque tu risa le puso banda sonora a mi vida entera.",
  },
  {
    author: "R",
    reason_text: "Porque contigo hasta el silencio sabe a hogar.",
  },
  {
    author: "M",
    reason_text:
      "Porque amaste mis lados rotos sin pedirme que los arregle.",
  },
  {
    author: "R",
    reason_text:
      "Porque cada día descubro una razón más y ninguna se repite.",
  },
  {
    author: "M",
    reason_text:
      "Porque en tu abrazo el mundo se vuelve calladito y perfecto.",
  },
  {
    author: "R",
    reason_text: "Porque me elegís incluso en mis días grises.",
  },
  {
    author: "M",
    reason_text:
      "Porque tu nombre suena mejor en voz baja, rozando tu oído.",
  },
  {
    author: "R",
    reason_text: "Porque hacés que lo cotidiano se sienta a ceremonia.",
  },
];

export default function LoveReasons() {
  const { profile } = useProfile();
  const myId: ProfileId = profile ?? "R";
  const [reasons, setReasons] = useState<Reason[]>(DEFAULT_REASONS);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [addAuthor, setAddAuthor] = useState<ProfileId>(myId);

  useEffect(() => {
    let active = true;
    async function loadReasons() {
      try {
        const { data, error } = await supabase
          .from("love_reasons")
          .select("reason_text, author")
          .order("created_at", { ascending: true })
          .limit(100);
        if (error) throw error;
        if (data && data.length > 0) setReasons(data as Reason[]);
      } catch (err) {
        console.error("No se pudieron cargar las razones:", err);
        setSyncError("No se pudieron cargar las razones: " + getErrorText(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReasons();
    return () => {
      active = false;
    };
  }, []);

  function nextReason() {
    if (fading || reasons.length <= 1) return;
    setFading(true);
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % reasons.length);
      setFading(false);
    }, 300);
  }

  async function handleAdd() {
    const text = newReason.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from("love_reasons")
        .insert({ author: addAuthor, reason_text: text })
        .select("reason_text, author")
        .single();
      if (error) throw error;
      setReasons((prev) => [...prev, data as Reason]);
      setIndex(reasons.length);
      setNewReason("");
      setShowAdd(false);
      setSyncError(null);
    } catch (err) {
      console.error("No se pudo guardar la razón:", err);
      setSyncError("No se pudo guardar la razón: " + getErrorText(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="font-cinzel text-[10px] tracking-[0.35em] text-gold-400 uppercase">
            El tarjetero de mi corazón
          </span>
          <h2 className="font-serif mt-2 text-3xl text-stone-100">
            Razones por las que te amo
          </h2>
          <p className="font-cormorant mt-1 text-sm text-stone-500 italic">
            cada una inagotable, cada una cierta
          </p>
        </div>

        <div className="relative mx-auto max-w-2xl rounded-2xl border border-gold-400/20 bg-gradient-to-br from-stone-950 via-wine-950 to-black p-8 text-center shadow-2xl sm:p-12">
          <span className="font-script absolute -top-3 left-6 -rotate-6 rounded-lg border border-gold-400/40 bg-gold-100 px-3 py-1 text-base text-wine-800 shadow-md">
            mi razón Nº {index + 1}
          </span>

          <div className="font-serif text-5xl leading-none text-gold-400/40">
            “
          </div>

          {loading || !reasons[index] ? (
            <div className="flex min-h-[7rem] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
            </div>
          ) : (
            <>
              <blockquote
                className={`font-cormorant min-h-[7rem] text-2xl text-gold-100 italic leading-relaxed transition-opacity duration-300 sm:text-[1.7rem] ${
                  fading ? "opacity-0" : "opacity-100"
                }`}
              >
                {reasons[index].reason_text}
              </blockquote>
              <p
                className={`mt-4 flex items-center justify-center gap-2 transition-opacity duration-300 ${
                  fading ? "opacity-0" : "opacity-100"
                }`}
              >
                <span className="font-cormorant text-xs text-stone-500 italic">
                  dicha por
                </span>
                <span
                  className={`font-cinzel rounded-full border px-3 py-0.5 text-[10px] font-semibold tracking-widest uppercase shadow-md ${
                    reasons[index].author === "R"
                      ? "bg-gold-400 border-gold-500 text-wine-950"
                      : "bg-wine-900/80 border-wine-600/50 text-gold-200"
                  }`}
                >
                  {getDisplayName(reasons[index].author)}
                </span>
              </p>
            </>
          )}

          <div className="mt-4 flex items-center justify-center gap-3 text-gold-400/50">
            <span className="h-px w-10 bg-gold-400/30" />
            <Heart className="h-3.5 w-3.5" />
            <span className="h-px w-10 bg-gold-400/30" />
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={nextReason}
              disabled={loading || reasons.length <= 1}
              className="font-cinzel group inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-wine-950/70 px-6 py-2.5 text-[11px] font-semibold tracking-widest text-gold-300 uppercase transition-all hover:border-gold-300/60 hover:shadow-[0_0_18px_rgba(222,184,81,0.3)] active:scale-95 disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
              Descubrir otra
            </button>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="font-cormorant text-xs text-stone-500 italic underline-offset-4 transition-colors hover:text-gold-300 hover:underline"
            >
              {showAdd ? "cerrar ✎" : "sumarle una razón ✎"}
            </button>
          </div>

          {showAdd && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd();
              }}
              className="mt-5 space-y-3 border-t border-gold-400/10 pt-5"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="font-cormorant text-xs text-stone-500 italic">
                  quién lo dijo:
                </span>
                {(["M", "R"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAddAuthor(id)}
                    className={`font-cinzel rounded-full border px-3 py-0.5 text-[10px] font-semibold tracking-widest uppercase shadow-sm transition-all active:scale-95 ${
                      addAuthor === id
                        ? id === "R"
                          ? "border-gold-500 bg-gold-400 text-wine-950"
                          : "border-wine-600 bg-wine-900/80 text-gold-200"
                        : "border-gold-400/30 bg-transparent text-stone-400 hover:border-gold-300/60 hover:text-gold-300"
                    }`}
                  >
                    {id === "M" ? "Mauricio" : "Rubí"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                disabled={adding}
                placeholder="Una razón más, en tus palabras…"
                className="font-cormorant min-w-0 flex-1 rounded-xl border border-gold-400/25 bg-stone-950/90 px-3.5 py-2.5 text-sm text-stone-100 italic outline-none transition-colors placeholder:text-stone-600 focus:border-gold-300 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={adding || !newReason.trim()}
                title="Guardar razón"
                aria-label="Guardar razón"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400 text-wine-950 shadow-lg transition-all hover:bg-gold-300 active:scale-90 disabled:opacity-40"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>
              </div>
            </form>
          )}

          {syncError && (
            <p className="font-cormorant mt-4 text-[11px] text-rose-300/80 italic">
              ⚠️ {syncError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}