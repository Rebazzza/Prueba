import { useEffect, useState } from "react";
import {
  ChevronRight,
  Heart,
  ImageOff,
  Images,
  ListChecks,
  Loader2,
  Mail,
  MessageCircle,
  Music2,
  Sparkles,
} from "lucide-react";
import OhanaCover from "../components/OhanaCover";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import { getDisplayName } from "../auth/ProfileContext";
import type { LoveNote, Memory, Message, View } from "../types";

type LatestEntry =
  | { kind: "message"; data: Message }
  | { kind: "note"; data: LoveNote }
  | { kind: "memory"; data: Memory };

type LatestThing = LatestEntry | null;

const QUICK_ACTIONS = [
  {
    id: "messages" as const,
    label: "Mensajes",
    caption: "Chat en vivo",
    icon: MessageCircle,
    tile: "from-wine-900 to-wine-950",
    iconColor: "text-gold-300",
  },
  {
    id: "notes" as const,
    label: "Buzón",
    caption: "Notas de amor",
    icon: Mail,
    tile: "from-wine-900 to-wine-950",
    iconColor: "text-gold-300",
  },
  {
    id: "gallery" as const,
    label: "Recuerdos",
    caption: "Galería Polaroid",
    icon: Images,
    tile: "from-wine-900 to-wine-950",
    iconColor: "text-gold-300",
  },
  {
    id: "bucket" as const,
    label: "Bucket List",
    caption: "Aventuras en pareja",
    icon: ListChecks,
    tile: "from-wine-900 to-wine-950",
    iconColor: "text-gold-300",
  },
  {
    id: "music" as const,
    label: "Música",
    caption: "Nuestro playlist",
    icon: Music2,
    tile: "from-wine-900 to-wine-950",
    iconColor: "text-gold-300",
  },
];

function formatWhen(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatMemoryDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function LatestCard({
  latest,
  onNavigate,
}: {
  latest: LatestThing;
  onNavigate: (view: View) => void;
}) {
  if (!latest) {
    return (
      <div className="rounded-2xl border border-dashed border-gold-400/25 bg-wine-950/60 p-8 text-center shadow-lg">
        <Heart className="mx-auto mb-3 h-10 w-10 text-gold-400/60" />
        <p className="font-cormorant text-lg text-stone-300 italic">
          Aún no hay mensajes, notas ni recuerdos…
        </p>
        <p className="font-cormorant mb-4 text-sm text-stone-500 italic">
          Envía tu primera nota para que aparezca aquí
        </p>
        <button
          onClick={() => onNavigate("notes")}
          className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-5 py-2 text-sm font-bold text-wine-950 shadow-lg transition-all hover:bg-gold-300 active:scale-95"
        >
          Dejar una nota 💌
        </button>
      </div>
    );
  }

  if (latest.kind === "note") {
    const note = latest.data as LoveNote;
    return (
      <div className="space-y-3">
        <div className="postit rotate-1 rounded-2xl border border-gold-400/40 bg-ivory-100 p-5 shadow-2xl">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 fill-wine-700 text-wine-700" />
              <span className="font-serif text-sm font-bold text-stone-800">
                {getDisplayName(note.author)}
              </span>
            </span>
            <span className="font-cinzel text-[10px] text-stone-500">
              {formatWhen(note.created_at)}
            </span>
          </div>
          <p className="font-cormorant text-lg text-stone-800 italic leading-relaxed">
            {note.message}
          </p>
        </div>
        <p className="font-cinzel text-center text-[10px] tracking-[0.3em] text-gold-400 uppercase">
          última nota
        </p>
      </div>
    );
  }

  if (latest.kind === "message") {
    const msg = latest.data as Message;
    return (
      <div className="space-y-3">
        <div
          className={`${
            msg.image_url
              ? "rounded-2xl border border-gold-400/20 bg-wine-950/80 p-3 pb-4 shadow-2xl"
              : "rounded-2xl border border-gold-400/25 bg-wine-900/70 p-5 shadow-2xl"
          }`}
        >
          {msg.image_url && (
            <img
              src={msg.image_url}
              alt="Última foto"
              className="mb-3 aspect-square w-full rounded-xl object-cover shadow-inner"
            />
          )}
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className="font-cinzel text-xs font-semibold tracking-wider text-gold-300 uppercase">
              {getDisplayName(msg.author)}
            </span>
            <span className="font-cinzel text-[10px] text-stone-500">
              {formatWhen(msg.created_at)}
            </span>
          </div>
          <p className="font-cormorant text-lg text-stone-200 italic leading-relaxed">
            {msg.content}
          </p>
        </div>
        <p className="font-cinzel text-center text-[10px] tracking-[0.3em] text-gold-400 uppercase">
          {msg.image_url ? "última foto 🌸" : "último mensaje"}
        </p>
      </div>
    );
  }

  const mem = latest.data as Memory;
  return (
    <div className="space-y-3">
      <div className="-rotate-1 rounded-2xl border border-gold-400/25 bg-wine-950/80 p-3 pb-4 shadow-2xl">
        <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-stone-900">
          {mem.image_url ? (
            <img
              src={mem.image_url}
              alt={mem.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-600">
              <ImageOff className="h-10 w-10 text-gold-500/50" />
              <span className="font-cormorant text-xs text-stone-500 italic">
                Foto pendiente
              </span>
            </div>
          )}
        </div>
        <h3 className="font-serif mb-0.5 text-lg font-semibold text-gold-100">
          {mem.title}
        </h3>
        <p className="font-cormorant mb-1 text-sm text-stone-400 italic">
          {mem.description}
        </p>
        <p className="font-cinzel text-[11px] tracking-wider text-gold-400 uppercase">
          {formatMemoryDate(mem.date)}
        </p>
      </div>
      <p className="font-cinzel text-center text-[10px] tracking-[0.3em] text-gold-400 uppercase">
        último recuerdo
      </p>
    </div>
  );
}

export default function HomePage({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
  const [latest, setLatest] = useState<LatestThing>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadLatest() {
      try {
        const [{ data: msgs }, { data: mems }, { data: notes }] =
          await Promise.all([
            supabase
              .from("messages")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(1),
            supabase
              .from("memories")
              .select("*")
              .order("date", { ascending: false })
              .limit(1),
            supabase
              .from("love_notes")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(1),
          ]);
        if (!active) return;

        const lastMsg = msgs && msgs.length ? (msgs[0] as Message) : null;
        const lastMem = mems && mems.length ? (mems[0] as Memory) : null;
        const lastNote =
          notes && notes.length ? (notes[0] as LoveNote) : null;

        const candidates: LatestEntry[] = [];
        if (lastMsg) candidates.push({ kind: "message", data: lastMsg });
        if (lastNote) candidates.push({ kind: "note", data: lastNote });
        if (lastMem) candidates.push({ kind: "memory", data: lastMem });

        if (candidates.length === 0) {
          setLatest(null);
          return;
        }

        const mostRecent = candidates.reduce((a, b) => {
          const ta =
            a.kind === "memory"
              ? new Date((a.data as Memory).date + "T00:00:00").getTime()
              : new Date((a.data as Message | LoveNote).created_at).getTime();
          const tb =
            b.kind === "memory"
              ? new Date((b.data as Memory).date + "T00:00:00").getTime()
              : new Date((b.data as Message | LoveNote).created_at).getTime();
          return ta > tb ? a : b;
        });

        setLatest(mostRecent);
      } catch (err) {
        // keep null (empty state appears if DB is offline)
        console.error("No se pudieron cargar los últimos datos:", err);
        setSyncError(getErrorText(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadLatest();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen pb-32">
      <OhanaCover />

      <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 pt-8 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="font-cinzel text-[10px] tracking-[0.3em] text-gold-400 uppercase">
                Archive Privée • En Vivo
              </span>
              <h2 className="font-serif mt-1 text-2xl text-stone-100">
                Lo último
              </h2>
            </div>
            <button
              onClick={() => onNavigate("messages")}
              className="flex items-center gap-1 rounded-full border border-gold-400/30 bg-wine-950/70 px-3 py-1.5 font-cinzel text-[10px] tracking-widest text-gold-300 uppercase transition-all hover:border-gold-300/50 active:scale-95"
            >
              Ver chat
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {syncError && (
            <div className="font-cormorant mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-200 italic">
              ⚠️ No se pudo conectar con Supabase: {syncError}
              <span className="mt-0.5 block text-[10px] text-rose-300/70">
                Ejecuta el script SQL (tablas memories, love_notes y messages
                con RLS desactivado) en el SQL Editor de Supabase.
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-gold-400" />
            </div>
          ) : (
            <LatestCard latest={latest} onNavigate={onNavigate} />
          )}
        </div>
      </section>

      <section className="bg-gradient-to-b from-wine-950 to-noir px-4 pb-14">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <h2 className="font-serif text-2xl text-stone-100">Explora</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className={`group flex items-center gap-3 rounded-2xl border border-gold-400/20 bg-gradient-to-br p-4 text-left shadow-lg transition-all hover:border-gold-300/40 hover:shadow-xl active:scale-95 ${action.tile}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-400/20 bg-wine-950/70 shadow-md ${action.iconColor}`}
                >
                  <action.icon className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="font-serif block truncate text-lg leading-tight font-semibold text-gold-100">
                    {action.label}
                  </span>
                  <span className="font-cormorant block truncate text-[11px] text-stone-400 italic">
                    {action.caption}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}