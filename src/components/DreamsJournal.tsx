import { useEffect, useState } from "react";
import { Check, Loader2, Moon, Plus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import { useProfile, getDisplayName } from "../auth/ProfileContext";
import type { ProfileId } from "../auth/ProfileContext";
import type { Dream } from "../types";

function formatDreamDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
  });
}

export default function DreamsJournal() {
  const { profile } = useProfile();
  const myId: ProfileId = profile ?? "R";
  const addName = getDisplayName(myId);
  const [addAuthor, setAddAuthor] = useState<ProfileId>(myId);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDreams() {
      try {
        const { data, error } = await supabase
          .from("dreams")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        if (data && data.length > 0) setDreams(data as Dream[]);
      } catch (err) {
        console.error("No se pudieron cargar los sueños:", err);
        setSyncError("No se pudieron cargar los sueños: " + getErrorText(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDreams();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("dreams-journal")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dreams" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setDreams((prev) => [payload.new as Dream, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Dream;
            setDreams((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleAdd() {
    const dream = text.trim();
    if (!dream || sending) return;
    setSending(true);
    setText("");
    try {
      const { data, error } = await supabase
        .from("dreams")
        .insert({ author: addAuthor, dream_text: dream })
        .select()
        .single();
      if (error) throw error;
      setSyncError(null);
      setDreams((prev) => [data as Dream, ...prev]);
    } catch (err) {
      console.error("No se pudo guardar el sueño:", err);
      setSyncError("No se pudo guardar el sueño: " + getErrorText(err));
      setDreams((prev) => [
        {
          id: `local-${Date.now()}`,
          author: addAuthor,
          dream_text: dream,
          is_achieved: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  }

  async function toggleDream(target: Dream) {
    if (togglingId) return;
    setTogglingId(target.id);
    const next = !target.is_achieved;
    setDreams((prev) =>
      prev.map((d) => (d.id === target.id ? { ...d, is_achieved: next } : d))
    );
    try {
      const { error } = await supabase
        .from("dreams")
        .update({ is_achieved: next })
        .eq("id", target.id);
      if (error) throw error;
      setSyncError(null);
    } catch (err) {
      console.error("No se pudo actualizar el sueño:", err);
      setDreams((prev) =>
        prev.map((d) =>
          d.id === target.id ? { ...d, is_achieved: !next } : d
        )
      );
      setSyncError("No se pudo actualizar el sueño: " + getErrorText(err));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="font-cinzel text-[10px] tracking-[0.35em] text-gold-400 uppercase">
            Bitácora de medianoche
          </span>
          <h2 className="font-serif mt-2 text-3xl text-stone-100">
            Nuestro Diario de Sueños
          </h2>
          <p className="font-cormorant mt-1 text-sm text-stone-500 italic">
            lo que soñamos despiertos, y lo que ya está por cumplirse
          </p>
        </div>

        <div className="mx-auto mb-10 max-w-xl rounded-2xl border border-gold-400/20 bg-wine-950/70 p-5 shadow-xl backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-cinzel text-[10px] tracking-widest text-gold-300 uppercase">
              Sueño de {addName}
            </span>
            <span className="rounded-full border border-gold-400/25 bg-wine-900/70 px-2.5 py-0.5 font-cinzel text-[9px] tracking-widest text-gold-400/80 uppercase">
              anotación
            </span>
          </div>
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="font-cormorant text-xs text-stone-500 italic">
              quién lo sueña:
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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Un sueño que tenemos y que queremos que pase…"
            rows={2}
            className="font-cormorant w-full resize-none rounded-xl border border-gold-400/25 bg-stone-950/90 px-4 py-3 text-base text-stone-100 italic outline-none transition-colors placeholder:text-stone-600 focus:border-gold-300"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!text.trim() || sending}
              className="font-cinzel inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-300 px-5 py-2 text-[11px] font-semibold tracking-widest text-wine-950 uppercase shadow-lg transition-all hover:shadow-[0_0_15px_rgba(222,184,81,0.35)] active:scale-95 disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Anotar en el diario
            </button>
          </div>
        </div>

        {syncError && (
          <p className="font-cormorant mx-auto mb-4 max-w-xl text-center text-[11px] text-rose-300/80 italic">
            ⚠️ {syncError}
          </p>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-7 w-7 animate-spin text-gold-400" />
          </div>
        )}

        {!loading && dreams.length === 0 && (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-gold-400/25 bg-wine-950/60 p-8 text-center">
            <Moon className="mx-auto mb-3 h-8 w-8 text-gold-400/60" />
            <p className="font-cormorant text-lg text-stone-300 italic">
              Todavía no hay sueños anotados…
            </p>
            <p className="font-cormorant mt-1 text-sm text-stone-500 italic">
              Anoten el primero, y échenle alma 💛
            </p>
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-3">
          {dreams.map((d) => {
            const achieved = d.is_achieved;
            return (
              <article
                key={d.id}
                className={`flex items-start gap-3 rounded-2xl border bg-gradient-to-br from-stone-950 via-wine-950 to-black p-4 shadow-xl transition-all duration-300 ${
                  achieved
                    ? "opacity-70 border-gold-400/30"
                    : "border-gold-400/20"
                }`}
              >
                <button
                  onClick={() => toggleDream(d)}
                  disabled={!!togglingId}
                  title={achieved ? "Marcar como pendiente" : "Marcar como cumplido"}
                  aria-label={achieved ? "Marcar como pendiente" : "Marcar como cumplido"}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 disabled:opacity-40 ${
                    achieved
                      ? "border-gold-400 bg-gold-400 text-wine-950 shadow-[0_0_12px_rgba(222,184,81,0.4)]"
                      : "border-gold-400/40 bg-wine-950/70 text-transparent hover:border-gold-300"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-script text-base text-gold-200">
                      {getDisplayName(d.author)}
                    </span>
                    <span className="font-cinzel text-[9px] tracking-wider text-stone-500 uppercase">
                      {formatDreamDate(d.created_at)}
                    </span>
                  </div>
                  <p
                    className={`font-cormorant mt-1 text-lg text-gold-100 italic leading-relaxed transition-all duration-300 ${
                      achieved
                        ? "opacity-60 line-through decoration-gold-400/70"
                        : ""
                    }`}
                  >
                    {d.dream_text}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`font-cinzel inline-block rounded-full border px-2.5 py-0.5 text-[9px] tracking-widest uppercase ${
                        achieved
                          ? "border-gold-400/40 bg-wine-900/60 text-gold-300/90"
                          : "border-wine-600/40 bg-transparent text-stone-500"
                      }`}
                    >
                      {achieved ? "✔ cumplido" : "✦ pendiente"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}