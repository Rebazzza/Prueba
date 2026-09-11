import { useState, useEffect } from "react";
import { ArrowLeftRight, Heart, Loader2, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import { useProfile, getDisplayName } from "../auth/ProfileContext";
import type { LoveNote } from "../types";

const MOCK_NOTES: LoveNote[] = [
  {
    id: "mock-note-1",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    author: "M",
    message: "Eres lo mejor que me pasó en la vida 💛",
  },
  {
    id: "mock-note-2",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    author: "R",
    message: "Gracias por cada sonrisa, te amo 🌸",
  },
];

const ROTATIONS = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2"];
const NOTE_COLORS = ["bg-ivory-50", "bg-ivory-100", "bg-gold-100", "bg-ivory-200"];

function formatNoteDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-ES", { day: "numeric", month: "long" }) +
    " · " +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function OhanaNotes() {
  const { profile, saveProfile } = useProfile();
  const myId = profile ?? "R";
  const myName = getDisplayName(myId);
  const otherName = getDisplayName(myId === "M" ? "R" : "M");
  const [notes, setNotes] = useState<LoveNote[]>(MOCK_NOTES);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [sending, setSending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  function switchProfile() {
    saveProfile(myId === "M" ? "R" : "M");
  }

  useEffect(() => {
    async function loadNotes() {
      try {
        const { data, error } = await supabase
          .from("love_notes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30);

        if (error) throw error;
        setSyncError(null);
        if (data && data.length > 0) setNotes(data as LoveNote[]);
      } catch (err) {
        // Keep mock data on error
        console.error("No se pudieron cargar las notas:", err);
        setSyncError("No se pudieron cargar las notas: " + getErrorText(err));
      } finally {
        setLoading(false);
      }
    }
    loadNotes();
  }, []);

  async function handleSend() {
    if (!newNote.trim()) return;
    setSending(true);
    const content = newNote.trim();
    setNewNote("");

    const note: Omit<LoveNote, "id"> = {
      created_at: new Date().toISOString(),
      author: myId,
      message: content,
    };

    try {
      const { data, error } = await supabase
        .from("love_notes")
        .insert(note)
        .select()
        .single();

      if (error) throw error;
      setSyncError(null);
      setNotes((prev) => [data as LoveNote, ...prev]);
    } catch (err) {
      console.error("No se pudo guardar la nota:", err);
      setSyncError("No se pudo guardar tu nota en la nube: " + getErrorText(err));
      setNotes((prev) => [{ ...note, id: `local-${Date.now()}` }, ...prev]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 pt-2 pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-gold-400/25 bg-wine-950/80 p-4 shadow-lg backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 fill-gold-300 text-gold-300" />
              <span className="font-serif text-sm font-semibold text-gold-200">
                Deja una nota para {otherName}
              </span>
            </div>
            <button
              onClick={switchProfile}
              aria-label="Cambiar de perfil"
              title="Cambiar de perfil (M = Mauricio / R = Rubí)"
              className="flex items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 p-1.5 text-gold-300 shadow-sm transition-transform active:scale-90"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Escribe un pensamiento bonito..."
            rows={3}
            className="font-cormorant w-full resize-none rounded-xl border border-gold-400/30 bg-stone-950/90 px-4 py-3 text-base text-stone-100 italic outline-none transition-colors placeholder:text-stone-600 focus:border-gold-300"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-cinzel text-[10px] tracking-widest text-stone-500 uppercase">
              De {myName} 💛
            </span>
            <button
              onClick={handleSend}
              disabled={!newNote.trim() || sending}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-300 px-5 py-2 font-cinzel text-[11px] font-semibold tracking-widest text-wine-950 uppercase shadow-lg transition-all hover:shadow-[0_0_15px_rgba(222,184,81,0.35)] active:scale-95 disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Enviar nota
            </button>
          </div>
        </div>

        {syncError && (
          <div className="font-cormorant mx-auto mb-4 max-w-xl rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-200 italic">
            ⚠️ {syncError}
            <span className="mt-0.5 block text-[10px] text-rose-300/70">
              Revisa el SQL de Supabase: la tabla love_notes debe existir y
              tener RLS desactivado.
            </span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-7 w-7 animate-spin text-gold-400" />
          </div>
        )}

        {notes.length === 0 && !loading && (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-gold-400/25 bg-wine-950/60 p-8 text-center">
            <p className="font-cormorant text-lg text-stone-300 italic">
              El buzón está vacío…
            </p>
            <p className="font-cormorant text-sm text-stone-500 italic">
              Deja la primera nota de amor 💌
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note, i) => {
            const isMine = note.author === myId;
            return (
              <div
                key={note.id}
                className={`${ROTATIONS[i % ROTATIONS.length]} ${
                  NOTE_COLORS[i % NOTE_COLORS.length]
                } postit rounded-lg p-4 shadow-2xl transition-transform hover:rotate-0`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1">
                    <Heart
                      className={`h-3.5 w-3.5 ${
                        isMine
                          ? "fill-wine-700 text-wine-700"
                          : "fill-gold-600 text-gold-600"
                      }`}
                    />
                    <span className="font-serif text-sm font-bold text-stone-800">
                      {getDisplayName(note.author)}
                    </span>
                  </span>
                  <span className="font-cinzel text-[9px] text-stone-500">
                    {formatNoteDate(note.created_at)}
                  </span>
                </div>
                <p className="font-cormorant text-base text-stone-800 italic leading-relaxed">
                  {note.message}
                </p>
                {isMine && (
                  <p className="font-cinzel mt-1 text-right text-[9px] tracking-widest text-stone-500 uppercase">
                    Tú
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}