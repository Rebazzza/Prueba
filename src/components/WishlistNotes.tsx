import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, ShoppingBag } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import type { WishlistItem } from "../types";

const CATEGORIES = ["Detalle", "Ropa", "Tecnología", "Viaje", "Casa", "Otro"];

export default function WishlistNotes() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [sending, setSending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadItems() {
      try {
        const { data, error } = await supabase
          .from("wishlist")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (data && data.length > 0) setItems(data as WishlistItem[]);
      } catch (err) {
        console.error("No se pudieron cargar los detalles:", err);
        setSyncError("No se pudieron cargar los detalles: " + getErrorText(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadItems();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("wishlist-notes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as WishlistItem, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as WishlistItem;
            setItems((prev) =>
              prev.map((it) => (it.id === updated.id ? updated : it))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, WishlistItem[]>();
    for (const item of items) {
      const cat = item.category || "Otro";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "es")
    );
  }, [items]);

  const acquiredCount = items.filter((i) => i.is_acquired).length;

  async function handleAdd() {
    const name = text.trim();
    if (!name || sending) return;
    setSending(true);
    setText("");
    try {
      const { data, error } = await supabase
        .from("wishlist")
        .insert({ item_name: name, category })
        .select()
        .single();
      if (error) throw error;
      setSyncError(null);
      setItems((prev) => [data as WishlistItem, ...prev]);
    } catch (err) {
      console.error("No se pudo guardar el detalle:", err);
      setSyncError("No se pudo guardar el detalle: " + getErrorText(err));
      setItems((prev) => [
        {
          id: `local-${Date.now()}`,
          item_name: name,
          category,
          is_acquired: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  }

  async function toggleItem(target: WishlistItem) {
    if (togglingId) return;
    setTogglingId(target.id);
    const next = !target.is_acquired;
    setItems((prev) =>
      prev.map((it) => (it.id === target.id ? { ...it, is_acquired: next } : it))
    );
    try {
      const { error } = await supabase
        .from("wishlist")
        .update({ is_acquired: next })
        .eq("id", target.id);
      if (error) throw error;
      setSyncError(null);
    } catch (err) {
      console.error("No se pudo actualizar el detalle:", err);
      setItems((prev) =>
        prev.map((it) =>
          it.id === target.id ? { ...it, is_acquired: !next } : it
        )
      );
      setSyncError("No se pudo actualizar el detalle: " + getErrorText(err));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="font-cinzel text-[10px] tracking-[0.35em] text-gold-400 uppercase">
            Para vos, en detalle
          </span>
          <h2 className="font-serif mt-2 text-3xl text-stone-100">
            Cosas que Necesitas
          </h2>
          <p className="font-cormorant mt-1 text-sm text-stone-500 italic">
            un apartado atento, para no olvidar nada de lo que te hace falta
          </p>
        </div>

        <div className="mx-auto mb-6 flex max-w-xl items-stretch gap-2 rounded-2xl border border-gold-400/20 bg-wine-950/70 p-5 shadow-xl backdrop-blur-sm">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={sending}
              placeholder="Algo que necesitás… (ej. un libro de poemas)"
              className="font-cormorant w-full rounded-xl border border-gold-400/25 bg-stone-950/90 px-4 py-3 text-base text-stone-100 italic outline-none transition-colors placeholder:text-stone-600 focus:border-gold-300 disabled:opacity-50"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={sending}
              className="font-cinzel mt-2 w-full rounded-xl border border-gold-400/25 bg-stone-950/90 px-3 py-2 text-[11px] tracking-widest text-gold-300 uppercase outline-none transition-colors focus:border-gold-300 disabled:opacity-50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={!text.trim() || sending}
            title="Sumar detalle"
            aria-label="Sumar detalle"
            className="flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-xl bg-gold-400 text-wine-950 shadow-lg transition-all hover:bg-gold-300 active:scale-90 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </button>
        </div>

        {!loading && items.length > 0 && (
          <p className="font-cormorant mb-6 text-center text-xs text-stone-500 italic">
            {items.length === acquiredCount
              ? "todo encontrado — qué maravilla 💛"
              : `${acquiredCount} de ${items.length} detalles ya están contigo`}
          </p>
        )}

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

        {!loading && items.length === 0 && (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-gold-400/25 bg-wine-950/60 p-8 text-center">
            <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-gold-400/60" />
            <p className="font-cormorant text-lg text-stone-300 italic">
              La lista está vacía por ahora…
            </p>
            <p className="font-cormorant mt-1 text-sm text-stone-500 italic">
              Suma un detalle, y deja que alguien lo consiga...
            </p>
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-8">
          {groups.map(([cat, arr]) => {
            const done = arr.filter((i) => i.is_acquired).length;
            return (
              <div key={cat}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-cinzel text-[11px] tracking-[0.3em] text-gold-300 uppercase">
                    {cat}
                  </h3>
                  <span className="font-cormorant text-xs text-stone-500 italic">
                    {done} de {arr.length}
                  </span>
                </div>
                <ul className="divide-y divide-gold-400/10 overflow-hidden rounded-2xl border border-gold-400/15 bg-wine-950/50 shadow-xl backdrop-blur-sm">
                  {arr.map((item) => {
                    const acq = item.is_acquired;
                    return (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => toggleItem(item)}
                          disabled={!!togglingId}
                          title={acq ? "Marcar como pendiente" : "Marcar como conseguido"}
                          aria-label={acq ? "Marcar como pendiente" : "Marcar como conseguido"}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 disabled:opacity-40 ${
                            acq
                              ? "border-gold-400 bg-gold-400 text-wine-950 shadow-[0_0_10px_rgba(222,184,81,0.35)]"
                              : "border-gold-400/40 bg-wine-950/70 text-transparent hover:border-gold-300"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <span
                          className={`font-cormorant flex-1 text-lg text-gold-100 italic transition-all duration-300 ${
                            acq
                              ? "opacity-50 line-through decoration-gold-400/60"
                              : ""
                          }`}
                        >
                          {item.item_name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}