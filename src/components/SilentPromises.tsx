import { useEffect, useState } from "react";
import { Feather, Loader2, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import { useProfile, getDisplayName } from "../auth/ProfileContext";
import type { ProfileId } from "../auth/ProfileContext";
import type { SilentPromise } from "../types";

function formatPromiseDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
  });
}

export default function SilentPromises() {
  const { profile } = useProfile();
  const myId = profile ?? "R";
  const [promises, setPromises] = useState<SilentPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [addAuthor, setAddAuthor] = useState<ProfileId>(myId);
  const addName = getDisplayName(addAuthor);

  useEffect(() => {
    let active = true;
    async function loadPromises() {
      try {
        const { data, error } = await supabase
          .from("silent_promises")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) throw error;
        if (data && data.length > 0) setPromises(data as SilentPromise[]);
      } catch (err) {
        console.error("No se pudieron cargar las promesas:", err);
        setSyncError("No se pudieron cargar las promesas: " + getErrorText(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPromises();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("silent-promises")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "silent_promises",
        },
        (payload) => {
          setPromises((prev) => [payload.new as SilentPromise, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSend() {
    const promise = text.trim();
    if (!promise || sending) return;
    setSending(true);
    setText("");
    try {
      const { data, error } = await supabase
        .from("silent_promises")
        .insert({ author: addAuthor, promise_text: promise })
        .select()
        .single();
      if (error) throw error;
      setSyncError(null);
      setPromises((prev) => [data as SilentPromise, ...prev]);
    } catch (err) {
      console.error("No se pudo guardar la promesa:", err);
      setSyncError("No se pudo guardar tu promesa: " + getErrorText(err));
      setPromises((prev) => [
        {
          id: `local-${Date.now()}`,
          author: addAuthor,
          promise_text: promise,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="font-cinzel text-[10px] tracking-[0.35em] text-gold-400 uppercase">
            Una promesa, una semana
          </span>
          <h2 className="font-serif mt-2 text-3xl text-stone-100">
            El Rincón de las Promesas Silenciosas
          </h2>
          <p className="font-cormorant mt-1 text-sm text-stone-500 italic">
            lo que nos decimos poco, pero lo prometemos siempre
          </p>
        </div>

        <div className="mx-auto mb-10 max-w-xl rounded-2xl border border-gold-400/20 bg-wine-950/70 p-5 shadow-xl backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-cinzel text-[10px] tracking-widest text-gold-300 uppercase">
              Promesa de {addName}
            </span>
            <span className="rounded-full border border-gold-400/25 bg-wine-900/70 px-2.5 py-0.5 font-cinzel text-[9px] tracking-widest text-gold-400/80 uppercase">
              semanal
            </span>
          </div>
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="font-cormorant text-xs text-stone-500 italic">
              quién la promete:
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
            placeholder="Te prometo que esta semana…"
            rows={2}
            className="font-cormorant w-full resize-none rounded-xl border border-gold-400/25 bg-stone-950/90 px-4 py-3 text-base text-stone-100 italic outline-none transition-colors placeholder:text-stone-600 focus:border-gold-300"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="font-cinzel inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-300 px-5 py-2 text-[11px] font-semibold tracking-widest text-wine-950 uppercase shadow-lg transition-all hover:shadow-[0_0_15px_rgba(222,184,81,0.35)] active:scale-95 disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Prometer
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

        {!loading && promises.length === 0 && (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-gold-400/25 bg-wine-950/60 p-8 text-center">
            <Feather className="mx-auto mb-3 h-8 w-8 text-gold-400/60" />
            <p className="font-cormorant text-lg text-stone-300 italic">
              Aún no hay promesas guardadas…
            </p>
            <p className="font-cormorant mt-1 text-sm text-stone-500 italic">
              Deja la primera, en silencio y para siempre 💛
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promises.map((p, i) => (
            <article
              key={p.id}
              className="flex flex-col rounded-2xl border border-gold-400/20 bg-gradient-to-br from-stone-950 via-wine-950 to-black p-5 shadow-xl transition-shadow hover:border-gold-300/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-script text-lg text-gold-200">
                  {getDisplayName(p.author)}
                </span>
                <span className="font-cinzel text-[9px] tracking-wider text-stone-500 uppercase">
                  {formatPromiseDate(p.created_at)}
                </span>
              </div>
              <p className="font-cormorant flex-1 text-lg text-gold-100 italic leading-relaxed">
                “{p.promise_text}”
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-gold-400/10 pt-3">
                <Feather className="h-3.5 w-3.5 text-gold-400/60" />
                <span className="font-cinzel text-[9px] tracking-[0.3em] text-gold-400/70 uppercase">
                  Nº {promises.length - i} · en silencio
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}