import { useEffect, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";

const LOCAL_KEY = "ohana_bucket_v1";

const DEFAULT_ITEMS = [
  "Enamorarnos",
  "Pasear a los niños (Comprar pastilla para la niña)",
  "Coloring Date",
  "Clay Date",
  "Cocinar juntos",
  "Cazar colores",
  "Juegos de mesa",
  "Recolectar flores",
  "Recrear fotos de Pinterest",
  "Picnic en el campo",
  "Dibujarse mutuamente",
  "Tarde de pelis",
  "Ir al gym cualquier día juntos",
  "Encontrar un peluche que se parezca al otro",
  "Preguntas de quién conoce más al otro",
  "Ir a los trampolines",
  "Ir a la piscina",
  "Pintar camisas",
  "Ir a un pueblito cercano",
  "Ponernos mascarillas y hacernos el skincare",
  "Hacernos pulseras",
  "Hacernos cartitas mientras tomamos café y chocolatito",
  "Ir a bailar bajo la lluvia",
  "Hacer velitas para el otro",
  "Ir a las maquinitas de juegos para que Rubí sea humillada por Mauricio",
  "Ir a visitar iglesias tomados de la mano y visitar al santísimo, orando porque nos permita llevar esta relación, porque nos ayude a hacer las cosas bien, y sobre todo porque cuide de nosotros.",
];

interface BucketItem {
  id: string;
  title: string;
  is_completed: boolean;
}

export default function CoupleBucketList() {
  const [items, setItems] = useState<BucketItem[]>([]);
  const [dbMode, setDbMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("bucket_list")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) throw new Error(getErrorText(error));

        const rows = (data ?? []) as BucketItem[];

        if (rows.length === 0) {
          const { error: insErr } = await supabase
            .from("bucket_list")
            .insert(DEFAULT_ITEMS.map((title) => ({ title })));
          if (insErr) throw new Error(getErrorText(insErr));

          const { data: data2, error: err2 } = await supabase
            .from("bucket_list")
            .select("*")
            .order("created_at", { ascending: true });
          if (err2) throw new Error(getErrorText(err2));

          if (!cancelled) {
            setItems((data2 ?? []) as BucketItem[]);
            setDbMode(true);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setItems(rows);
          setDbMode(true);
          setLoading(false);
        }
      } catch {
        if (cancelled) return;
        setDbMode(false);
        setLoading(false);
        try {
          const raw = localStorage.getItem(LOCAL_KEY);
          const saved = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
          setItems(
            DEFAULT_ITEMS.map((title, i) => ({
              id: `local-${i}`,
              title,
              is_completed: !!saved[title],
            }))
          );
        } catch {
          setItems(
            DEFAULT_ITEMS.map((title, i) => ({
              id: `local-${i}`,
              title,
              is_completed: false,
            }))
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string, is_completed: boolean) {
    if (!dbMode) {
      const next = items.map((item) =>
        item.id === id ? { ...item, is_completed } : item
      );
      setItems(next);
      try {
        localStorage.setItem(
          LOCAL_KEY,
          JSON.stringify(
            Object.fromEntries(next.map((item) => [item.title, item.is_completed]))
          )
        );
      } catch {
        // localStorage no disponible: seguimos en memoria
      }
      return;
    }

    const prev = items;
    setItems((list) =>
      list.map((item) =>
        item.id === id ? { ...item, is_completed } : item
      )
    );
    setSyncError(null);
    supabase
      .from("bucket_list")
      .update({ is_completed })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          setItems(prev);
          setSyncError("No se pudo guardar: " + getErrorText(error));
        }
      });
  }

  async function addItem() {
    const title = newTitle.trim();
    if (!title || adding) return;

    if (!dbMode) {
      const item: BucketItem = {
        id: `local-${Date.now()}`,
        title,
        is_completed: false,
      };
      const next = [...items, item];
      setItems(next);
      try {
        localStorage.setItem(
          LOCAL_KEY,
          JSON.stringify(
            Object.fromEntries(next.map((it) => [it.title, it.is_completed]))
          )
        );
      } catch {
        // localStorage no disponible: seguimos en memoria
      }
      setNewTitle("");
      return;
    }

    setAdding(true);
    setAddError(null);
    try {
      const { data, error } = await supabase
        .from("bucket_list")
        .insert({ title })
        .select()
        .single();
      if (error) throw new Error(getErrorText(error));
      setItems((list) => [...list, data as BucketItem]);
      setNewTitle("");
    } catch (err) {
      setAddError(getErrorText(err));
    } finally {
      setAdding(false);
    }
  }

  const doneCount = items.filter((item) => item.is_completed).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <section className="mx-auto max-w-2xl px-5 py-8">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gold-300" />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-cinzel text-[10px] tracking-[0.25em] text-gold-400 uppercase">
                Aventuras por vivir
              </p>
              <p className="font-serif text-sm font-semibold text-gold-100">
                {doneCount} de {items.length} 💛
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-gold-400/15 bg-wine-950 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
            className="mb-6 flex items-center gap-2"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={adding}
              placeholder="Sumar una idea nueva por hacer…"
              className="font-cormorant min-w-0 flex-1 rounded-xl border border-gold-400/25 bg-wine-950/80 px-3.5 py-2.5 text-[15px] text-stone-100 italic shadow-md outline-none transition-colors placeholder:text-stone-600 focus:border-gold-300 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={adding || !newTitle.trim()}
              className="font-cinzel flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 text-wine-950 shadow-lg transition-all hover:shadow-[0_0_18px_rgba(222,184,81,0.35)] active:scale-90 disabled:opacity-40"
              title="Agregar actividad"
              aria-label="Agregar actividad"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </button>
          </form>
          {addError && (
            <p className="font-cormorant -mt-4 mb-4 text-center text-[11px] text-rose-300 italic">
              ⚠️ No se pudo agregar: {addError}
            </p>
          )}

          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => toggle(item.id, !item.is_completed)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left shadow-md transition-all active:scale-[0.99] ${
                    item.is_completed
                      ? "border-gold-400/25 bg-wine-900/40"
                      : "border-gold-400/15 bg-wine-950/70 hover:border-gold-300/40"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      item.is_completed
                        ? "border-gold-300 bg-gold-400 text-wine-950"
                        : "border-gold-400/40 bg-stone-950 text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span
                    className={`font-cormorant text-[15px] leading-snug italic ${
                      item.is_completed
                        ? "text-stone-500 line-through decoration-gold-400/60"
                        : "text-stone-100"
                    }`}
                  >
                    {item.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="font-cormorant mt-6 text-center text-xs text-stone-500 italic">
            Algunas son para reírnos, otras para soñar… todas son para hacerlas
            juntos. ✨
          </p>

          {!dbMode && (
            <p className="font-cormorant mt-2 text-center text-[11px] text-gold-400/60 italic">
              Guardado en este dispositivo. Crea la tabla bucket_list en
              Supabase para sincronizarlo en la nube.
            </p>
          )}

          {syncError && (
            <p className="font-cormorant mt-2 text-center text-[11px] text-rose-300 italic">
              ⚠️ {syncError}
            </p>
          )}
        </>
      )}
    </section>
  );
}