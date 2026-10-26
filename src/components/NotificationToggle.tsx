import { useCallback, useEffect, useState } from "react";
import {
  BellOff,
  BellRing,
  Check,
  Loader2,
  Send,
  ShieldAlert,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { useProfile } from "../auth/ProfileContext";
import {
  PushError,
  disablePush,
  enablePush,
  getPushSnapshot,
  showLocalNotification,
  syncPushSubscription,
} from "../lib/push";
import type { PushSnapshot } from "../lib/push";
import { getErrorText } from "../lib/getErrorText";

type UiState =
  | "loading"
  | "enabled"
  | "off"
  | "denied"
  | "unsupported"
  | "install-required"
  | "insecure-context"
  | "misconfigured";

function resolveUiState(snapshot: PushSnapshot | null): UiState {
  if (!snapshot) return "loading";
  if (!snapshot.support.supported) {
    if (snapshot.support.code === "install-required") return "install-required";
    if (snapshot.support.code === "insecure-context") return "insecure-context";
    return "unsupported";
  }
  if (!snapshot.vapidConfigured) return "misconfigured";
  if (snapshot.permission === "denied") return "denied";
  if (snapshot.permission === "granted" && snapshot.subscribed) return "enabled";
  return "off";
}

const STATUS_LABEL: Record<UiState, string> = {
  loading: "Comprobando…",
  enabled: "Concedido · Activas",
  off: "Pendiente",
  denied: "Denegado",
  unsupported: "No disponible",
  "install-required": "Requiere instalación",
  "insecure-context": "Requiere HTTPS",
  misconfigured: "Sin configurar",
};

const DESCRIPTIONS: Record<UiState, string> = {
  loading: "Revisando el estado de las notificaciones…",
  enabled:
    "Te avisaremos cuando haya un mensaje, una nota o un recuerdo nuevo.",
  off: "Activá los avisos y enterate de cada momento sin abrir la app.",
  denied:
    "Bloqueaste el permiso. Volvé a habilitarlo desde la configuración del navegador para este sitio.",
  unsupported: "Este navegador no soporta notificaciones push.",
  "install-required":
    "En iPhone o iPad, agregá el diario a la pantalla de inicio (Compartir → Añadir a inicio) y volvé a abrirlo.",
  "insecure-context":
    "Las notificaciones solo funcionan en HTTPS o en localhost.",
  misconfigured:
    "Falta la clave pública VAPID. Agregá VITE_VAPID_PUBLIC_KEY al archivo .env.",
};

function StateIcon({ state, className }: { state: UiState; className?: string }) {
  if (state === "loading") return <Loader2 className={`${className} animate-spin`} />;
  if (state === "enabled") return <BellRing className={className} />;
  if (state === "denied") return <ShieldAlert className={className} />;
  if (state === "install-required") return <Smartphone className={className} />;
  if (state === "insecure-context" || state === "unsupported")
    return <WifiOff className={className} />;
  return <BellOff className={className} />;
}

export default function NotificationToggle() {
  const { profile } = useProfile();
  const [snapshot, setSnapshot] = useState<PushSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await getPushSnapshot();
    setSnapshot(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await getPushSnapshot();
      if (!active) return;
      setSnapshot(next);

      // Mantiene fresca la fila si el permiso ya estaba dado.
      if (next.support.supported && next.permission === "granted" && next.subscribed) {
        syncPushSubscription(profile ?? null).catch((err) =>
          console.warn("No se pudo sincronizar la suscripción push:", err)
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  const state = resolveUiState(snapshot);
  const isEnabled = state === "enabled";
  const canToggle = state === "enabled" || state === "off" || state === "denied";
  const switchOn = isEnabled;

  async function handleToggle() {
    if (busy || !canToggle) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (isEnabled) {
        await disablePush();
        setNotice("Notificaciones desactivadas.");
      } else {
        await enablePush(profile ?? null);
        setNotice("¡Listo! Te avisaremos de cada momento.");
      }
    } catch (err) {
      if (err instanceof PushError && err.code === "permission-denied") {
        setError(err.message);
      } else {
        setError(getErrorText(err));
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  async function handleTest() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await showLocalNotification();
      setNotice("Notificación de prueba enviada 💛");
    } catch (err) {
      setError(getErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-gold-400/25 bg-gradient-to-br from-wine-950/90 via-wine-950/80 to-wine-900/50 shadow-2xl">
      <div className="flex items-start gap-4 p-5">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-md ${
            isEnabled
              ? "border-gold-300/50 bg-gold-400/20 text-gold-200"
              : "border-gold-400/20 bg-wine-950/70 text-gold-400/80"
          }`}
        >
          <StateIcon state={state} className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg leading-tight text-gold-100">
            Avisos del corazón
          </h3>
          <p className="font-cormorant mt-0.5 text-sm leading-snug text-stone-400 italic">
            {DESCRIPTIONS[state]}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={switchOn}
          aria-label={switchOn ? "Desactivar notificaciones" : "Activar notificaciones"}
          disabled={busy || !canToggle}
          onClick={handleToggle}
          className={`relative mt-1 h-8 w-14 shrink-0 rounded-full border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
            switchOn
              ? "border-gold-300/60 bg-gradient-to-r from-gold-500 to-gold-300"
              : "border-gold-400/25 bg-wine-900/80"
          }`}
        >
          <span
            className={`absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-transform duration-300 ${
              switchOn
                ? "translate-x-6 bg-wine-950 text-gold-200"
                : "translate-x-0 bg-gold-200/80 text-wine-950"
            }`}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : switchOn ? (
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            ) : null}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gold-400/15 px-5 py-3">
        <span
          className={`font-cinzel rounded-full border px-3 py-1 text-[10px] tracking-[0.15em] uppercase ${
            state === "enabled"
              ? "border-gold-300/50 bg-gold-400/15 text-gold-200"
              : state === "denied"
                ? "border-rose-400/40 bg-rose-950/40 text-rose-200"
                : state === "off"
                  ? "border-gold-400/25 bg-wine-950/60 text-stone-300"
                  : "border-stone-500/30 bg-wine-950/60 text-stone-400"
          }`}
        >
          {STATUS_LABEL[state]}
        </span>

        {snapshot && snapshot.permission !== "unsupported" && state !== "loading" && (
          <span className="font-cinzel text-[10px] tracking-[0.15em] text-stone-500 uppercase">
            Permiso: {snapshot.permission === "granted" ? "concedido" : snapshot.permission === "denied" ? "denegado" : "pendiente"}
          </span>
        )}

        <span className="flex-1" />

        {isEnabled && (
          <button
            type="button"
            onClick={handleTest}
            disabled={busy}
            className="font-cinzel inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-wine-950/70 px-3 py-1.5 text-[10px] tracking-widest text-gold-300 uppercase transition-all hover:border-gold-300/50 active:scale-95 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            Probar
          </button>
        )}
      </div>

      {(error || notice) && (
        <div className="px-5 pb-4">
          {error && (
            <p className="font-cormorant rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2.5 text-xs text-rose-200 italic">
              ⚠️ {error}
            </p>
          )}
          {!error && notice && (
            <p className="font-cormorant rounded-xl border border-gold-400/25 bg-wine-900/40 px-3 py-2.5 text-xs text-gold-200 italic">
              {notice}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
