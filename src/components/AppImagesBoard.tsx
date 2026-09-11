import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { fetchImages } from "../lib/supabase";
import type { AppImage } from "../lib/supabase";

const SECTION_LABELS: Record<string, string> = {
  asset: "Estructura",
  gallery: "Galería",
  chat: "Chat",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AppImagesBoard() {
  const [images, setImages] = useState<AppImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchImages();
      setImages(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchImages();
        if (!cancelled) setImages(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = images.reduce<Record<string, AppImage[]>>((acc, img) => {
    (acc[img.section] ??= []).push(img);
    return acc;
  }, {});

  const sections = ["gallery", "chat", "asset"].filter((s) => grouped[s]?.length);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-cinzel text-[11px] tracking-[0.25em] text-gold-400 uppercase">
          Imágenes registradas{" "}
          {!loading && <span className="text-gold-400/60">({images.length})</span>}
        </p>
        <button
          onClick={() => load()}
          title="Recargar"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gold-400/25 text-gold-400 transition-all hover:bg-wine-900 active:scale-90"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gold-300" />
        </div>
      )}

      {!loading && error && (
        <p className="font-cormorant text-center text-xs text-rose-300 italic">
          {error} — necesitás crear la tabla app_images en Supabase.
        </p>
      )}

      {!loading && !error && images.length === 0 && (
        <p className="font-cormorant text-center text-sm text-stone-500 italic">
          No hay imágenes registradas en app_images todavía.
        </p>
      )}

      {!loading && !error && sections.map((section) => (
        <div key={section} className="mb-8">
          <p className="font-cinzel mb-3 text-[9px] tracking-[0.3em] text-gold-300 uppercase">
            {SECTION_LABELS[section] ?? section}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {grouped[section].map((img) => (
              <figure
                key={img.id}
                className="group overflow-hidden rounded-sm border border-gold-400/15 bg-wine-950/60"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={img.image_url}
                    alt={img.caption ?? ""}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <figcaption className="px-2.5 py-2">
                  {img.caption && (
                    <p className="font-cormorant truncate text-xs text-stone-300 italic">
                      {img.caption}
                    </p>
                  )}
                  <p className="font-cinzel mt-0.5 text-[8px] tracking-wider text-gold-400/50 uppercase">
                    {formatDate(img.created_at)}
                    {img.author ? ` · ${img.author}` : ""}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}