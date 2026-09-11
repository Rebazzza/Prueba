import { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowLeftRight,
  Image as ImageIcon,
  Loader2,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getErrorText } from "../lib/getErrorText";
import { uploadImage } from "../lib/supabase";
import type { Message } from "../types";
import { useProfile, getDisplayName } from "../auth/ProfileContext";

const AUTHOR_COLORS: Record<string, string> = {
  M: "bg-wine-800 border border-gold-400/25 text-gold-100",
  R: "bg-gold-400 border border-gold-500 text-wine-950",
  Mauricio: "bg-wine-800 border border-gold-400/25 text-gold-100",
  Rubí: "bg-gold-400 border border-gold-500 text-wine-950",
};
const AUTHOR_SELF_COLORS: Record<string, string> = {
  M: "bg-wine-700 text-ivory-100",
  R: "bg-gold-500 text-wine-950",
  Mauricio: "bg-wine-700 text-ivory-100",
  Rubí: "bg-gold-500 text-wine-950",
};

export default function LiveComms() {
  const { profile, saveProfile } = useProfile();
  const myId = profile ?? "R";
  const myName = getDisplayName(myId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
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
    ev.target.value = "";
  }

  function cancelPick() {
    setPickedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function sendPhoto() {
    if (!pickedFile) return;
    setUploading(true);
    try {
      const { url } = await uploadImage({
        file: pickedFile,
        author: myId,
        section: "chat",
        caption: newMsg.trim() || "Foto del chat",
      });

      const msg: Omit<Message, "id"> = {
        created_at: new Date().toISOString(),
        author: myId,
        content: newMsg.trim(),
        image_url: url,
      };

      const { error } = await supabase.from("messages").insert(msg);
      if (error) throw error;

      setNewMsg("");
      cancelPick();
      setSyncError(null);
    } catch (err) {
      console.error("No se pudo enviar la foto:", err);
      setSyncError("No se pudo enviar la foto: " + getErrorText(err));
    } finally {
      setUploading(false);
    }
  }

  function switchProfile() {
    saveProfile(myId === "M" ? "R" : "M");
  }

  async function clearChat() {
    if (!window.confirm("¿Vaciar todo el chat? Esta acción no se puede deshacer.")) {
      return;
    }
    try {
      const { error } = await supabase.from("messages").delete().neq("id", "");
      if (error) throw error;
      setMessages([]);
      setSyncError(null);
    } catch (err) {
      setSyncError("No se pudo vaciar el chat: " + getErrorText(err));
    }
  }

  useEffect(() => {
    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) throw error;
        setSyncError(null);
        if (data && data.length > 0) setMessages(data as Message[]);
      } catch (err) {
        // Keep local state
        console.error("No se pudieron cargar los mensajes:", err);
        setSyncError("No se pudieron cargar los mensajes: " + getErrorText(err));
      } finally {
        setLoaded(true);
      }
    }
    loadMessages();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("live-comms")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (pickedFile) {
      await sendPhoto();
      return;
    }
    if (!newMsg.trim()) return;
    const msg: Omit<Message, "id"> = {
      created_at: new Date().toISOString(),
      author: myId,
      content: newMsg.trim(),
    };

    setNewMsg("");

    try {
      const { error } = await supabase.from("messages").insert(msg);
      if (error) throw error;
      setSyncError(null);
    } catch (err) {
      console.error("No se pudo guardar el mensaje:", err);
      setSyncError(
        "No se pudo guardar tu mensaje en la nube: " + getErrorText(err)
      );
      setMessages((prev) => [
        ...prev,
        { ...msg, id: `local-${Date.now()}` },
      ]);
    }
  }

  function formatTime(isoStr: string) {
    return new Date(isoStr).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="bg-gradient-to-b from-noir via-wine-950 to-noir px-4 pt-2 pb-16">
      <div className="mx-auto max-w-2xl lg:max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-gold-400"
              }`}
            />
            <span className="font-cinzel text-[10px] tracking-widest text-gold-300 uppercase">
              {isConnected ? "En tiempo real" : "Modo local"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-xs font-semibold text-gold-200">
              Eres {myName}
            </span>
            <button
              onClick={clearChat}
              title="Vaciar chat"
              aria-label="Vaciar chat"
              className="flex items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 p-1.5 text-gold-300 shadow-sm transition-transform active:scale-90 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={switchProfile}
              aria-label="Cambiar de perfil"
              title="Cambiar de perfil (M = Mauricio / R = Rubí)"
              className="flex items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 p-1.5 text-gold-300 shadow-sm transition-transform active:scale-90"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {syncError && (
          <div className="font-cormorant mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-200 italic">
            ⚠️ {syncError}
            <span className="mt-0.5 block text-[10px] text-rose-300/70">
              Revisa el SQL de Supabase: la tabla messages debe existir y tener
              RLS desactivado.
            </span>
          </div>
        )}

        <div className="mb-4 max-h-[400px] space-y-3 overflow-y-auto rounded-2xl border border-gold-400/15 bg-wine-950/60 p-4 shadow-inner backdrop-blur-sm">
          {loaded && messages.length === 0 && (
            <div className="py-6 text-center">
              <p className="font-cormorant text-sm text-stone-500 italic">
                El chat está vacío… enviá el primer mensaje 💛
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.author === myId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md ${
                    isMe
                      ? AUTHOR_SELF_COLORS[msg.author] ??
                        "bg-stone-700 text-white"
                      : AUTHOR_COLORS[msg.author] ??
                        "border border-gold-400/20 bg-wine-900 text-gold-200"
                  }`}
                >
                  {!isMe && (
                    <p className="font-cinzel mb-0.5 text-[9px] font-semibold tracking-widest opacity-70 uppercase">
                      {getDisplayName(msg.author)}
                    </p>
                  )}
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="Foto compartida"
                      className="mb-2 max-h-48 rounded-lg object-cover"
                    />
                  )}
                  <p className="font-cormorant text-base leading-relaxed italic">
                    {msg.content}
                  </p>
                  <p className="font-cinzel mt-1 text-right text-[9px] opacity-50">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {previewUrl && pickedFile && (
          <div className="mb-3 rounded-2xl border border-gold-400/30 bg-wine-950/90 p-3 shadow-lg">
            <div className="flex items-start gap-3">
              <img
                src={previewUrl}
                alt="Foto a enviar"
                className="h-20 w-20 shrink-0 rounded-lg border border-gold-400/20 object-cover shadow-inner"
              />
              <div className="min-w-0 flex-1 pt-1">
                {uploading ? (
                  <p className="font-cormorant flex items-center gap-2 text-xs text-gold-200 italic">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Subiendo foto…
                  </p>
                ) : (
                  <p className="font-cormorant text-xs text-stone-400 italic">
                    Lista para enviar. Podés dejarla sola o escribirle un texto
                    abajo.
                  </p>
                )}
              </div>
              <button
                onClick={cancelPick}
                disabled={uploading}
                title="Quitar foto"
                aria-label="Quitar foto"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 text-gold-300 transition-transform active:scale-90 disabled:opacity-40 hover:text-rose-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !!pickedFile}
            title="Adjuntar foto"
            aria-label="Adjuntar foto"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-wine-950/80 text-gold-300 shadow-sm transition-all active:scale-90 hover:text-gold-200 disabled:opacity-40"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={pickedFile ? "Agregar un texto a la foto…" : "Escribe un mensaje..."}
            className="font-cormorant w-full rounded-full border border-gold-400/30 bg-stone-950/90 px-4 py-3 text-base text-stone-100 italic outline-none transition-colors placeholder:text-stone-600 focus:border-gold-300"
          />
          <button
            onClick={handleSend}
            disabled={(!newMsg.trim() && !pickedFile) || uploading}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-400 text-wine-950 shadow-lg transition-all hover:bg-gold-300 hover:shadow-[0_0_15px_rgba(222,184,81,0.35)] active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}