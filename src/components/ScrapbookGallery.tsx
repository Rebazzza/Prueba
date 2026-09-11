import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import MemoriesGrid from "./MemoriesGrid";

export default function ScrapbookGallery() {
  const [uploading, setUploading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newDesc, setNewDesc] = useState("");
  const [gridKey, setGridKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFilePick(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPickedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setNewDesc("");
    ev.target.value = "";
  }

  function cancelPick() {
    setPickedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setNewDesc("");
  }

  async function handleSave() {
    if (!pickedFile) return;
    setUploading(true);
    setSyncError(null);

    try {
      const ext = pickedFile.name.split(".").pop() || "jpg";
      const fileName = `memory_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("ohana_images")
        .upload(fileName, pickedFile, {
          contentType: pickedFile.type || "image/jpeg",
        });

      if (storageErr) throw storageErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("ohana_images").getPublicUrl(fileName);

      const today = new Date().toISOString().slice(0, 10);

      const { error: dbErr } = await supabase.from("memories").insert({
        date: today,
        title: "",
        description: newDesc.trim() || null,
        image_url: publicUrl,
      });

      if (dbErr) throw dbErr;

      cancelPick();
      setGridKey((v) => v + 1);
    } catch (err) {
      console.error("No se pudo guardar el recuerdo:", err);
      setSyncError("No se pudo guardar el recuerdo: " + getErrorText(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 pt-2 pb-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-6 max-w-xl">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="font-cinzel mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-300 px-5 py-3.5 text-sm font-semibold tracking-widest text-wine-950 uppercase shadow-lg transition-all hover:shadow-[0_0_20px_rgba(222,184,81,0.35)] active:scale-95 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Subiendo foto...
              </>
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                Cargar una foto de la galería
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />

          {previewUrl && pickedFile && (
            <div className="-rotate-1 rounded-2xl border border-gold-400/30 bg-wine-950/90 p-4 shadow-2xl">
              <img
                src={previewUrl}
                alt="Vista previa"
                className="mb-3 aspect-square w-full rounded-xl object-cover shadow-inner"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descripción (ej. Nuestro picnic)"
                className="font-cormorant mb-3 w-full rounded-xl border border-gold-400/30 bg-stone-950/90 px-3 py-2.5 text-base text-stone-100 italic outline-none transition-colors placeholder:text-stone-600 focus:border-gold-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={cancelPick}
                  disabled={uploading}
                  className="font-cinzel flex flex-1 items-center justify-center gap-2 rounded-xl border border-gold-400/30 bg-wine-900 py-2.5 text-[11px] font-semibold tracking-widest text-gold-200 uppercase transition-all active:scale-95 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="font-cinzel flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-400 py-2.5 text-[11px] font-semibold tracking-widest text-wine-950 uppercase shadow-lg transition-all hover:bg-gold-300 active:scale-95 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar recuerdo
                </button>
              </div>
            </div>
          )}
        </div>

        {syncError && (
          <div className="font-cormorant mx-auto mb-4 max-w-xl rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-200 italic">
            ⚠️ {syncError}
            <span className="mt-0.5 block text-[10px] text-rose-300/70">
              Revisa el SQL de Supabase: la tabla memories y el bucket
              ohana_images deben existir.
            </span>
          </div>
        )}

        <MemoriesGrid heading="💛 Recuerdos del diario" refreshKey={gridKey} />
      </div>
    </section>
  );
}