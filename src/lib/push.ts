import { supabase } from "./supabaseClient";
import { getErrorText } from "./getErrorText";

/**
 * Lógica de Web Push: permisos, PushManager (VAPID) y persistencia de la
 * suscripción en Supabase (tabla `push_subscriptions`).
 */

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "").trim();
const SERVICE_WORKER_URL = "/sw.js";
const SERVICE_WORKER_TIMEOUT_MS = 15000;

export type PushErrorCode =
  | "unsupported"
  | "insecure-context"
  | "install-required"
  | "vapid-missing"
  | "permission-denied"
  | "subscribe-failed"
  | "save-failed";

export class PushError extends Error {
  code: PushErrorCode;

  constructor(code: PushErrorCode, message: string) {
    super(message);
    this.name = "PushError";
    this.code = code;
  }
}

export interface PushSupport {
  supported: boolean;
  code?: PushErrorCode;
  reason?: string;
}

export type PushPermission = NotificationPermission | "unsupported";

export interface PushSnapshot {
  support: PushSupport;
  permission: PushPermission;
  vapidConfigured: boolean;
  subscribed: boolean;
  endpoint: string | null;
}

export function isVapidConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}

function isIosDevice(): boolean {
  const nav = navigator as Navigator & {
    platform?: string;
    maxTouchPoints?: number;
  };
  return (
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1)
  );
}

function isStandaloneDisplay(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** ¿Puede este dispositivo recibir notificaciones push? */
export function getPushSupport(): PushSupport {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return {
      supported: false,
      code: "unsupported",
      reason: "Este navegador no soporta notificaciones.",
    };
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return {
      supported: false,
      code: "unsupported",
      reason: "Este navegador no soporta notificaciones push.",
    };
  }
  if (isIosDevice() && !isStandaloneDisplay()) {
    return {
      supported: false,
      code: "install-required",
      reason:
        "En iPhone o iPad primero agregá el diario a la pantalla de inicio para recibir avisos.",
    };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      code: "insecure-context",
      reason: "Las notificaciones requieren HTTPS (o localhost).",
    };
  }
  return { supported: true };
}

/** Estado actual del permiso del navegador (síncrono). */
export function getPermissionState(): PushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/** Convierte la clave pública VAPID (base64url) al Uint8Array que pide PushManager. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new PushError(
      "unsupported",
      "Este navegador no soporta service workers."
    );
  }

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;

  await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });

  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), SERVICE_WORKER_TIMEOUT_MS)
    ),
  ]);

  if (!ready) {
    throw new PushError(
      "unsupported",
      "El service worker todavía no está listo. Probá de nuevo en unos segundos."
    );
  }
  return ready;
}

function sameApplicationServerKey(
  subscription: PushSubscription,
  expected: Uint8Array
): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  if (bytes.byteLength !== expected.byteLength) return false;
  for (let i = 0; i < bytes.byteLength; i += 1) {
    if (bytes[i] !== expected[i]) return false;
  }
  return true;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  author: string | null;
  user_agent: string | null;
}

function toRecord(
  subscription: PushSubscription,
  author: string | null
): PushSubscriptionRecord {
  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new PushError(
      "subscribe-failed",
      "La suscripción no devolvió las claves necesarias."
    );
  }

  return {
    endpoint,
    p256dh,
    auth,
    author,
    user_agent: navigator.userAgent.slice(0, 500),
  };
}

/** Guarda (o actualiza) la suscripción en Supabase. */
export async function saveSubscription(
  subscription: PushSubscription,
  author: string | null
): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { ...toRecord(subscription, author), updated_at: new Date().toISOString() },
      { onConflict: "endpoint" }
    );

  if (error) {
    throw new PushError("save-failed", getErrorText(error));
  }
}

async function deleteSubscriptionRecord(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw new PushError("save-failed", getErrorText(error));
}

/** Lee el estado completo sin pedir permisos ni crear suscripciones. */
export async function getPushSnapshot(): Promise<PushSnapshot> {
  const support = getPushSupport();
  const permission = getPermissionState();
  const vapidConfigured = isVapidConfigured();

  if (!support.supported) {
    return { support, permission, vapidConfigured, subscribed: false, endpoint: null };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : null;
    return {
      support,
      permission,
      vapidConfigured,
      subscribed: Boolean(subscription),
      endpoint: subscription?.endpoint ?? null,
    };
  } catch (err) {
    console.warn("No se pudo leer la suscripción push:", err);
    return { support, permission, vapidConfigured, subscribed: false, endpoint: null };
  }
}

/**
 * Pide permiso (si hace falta), registra la suscripción con PushManager usando
 * la clave VAPID y la guarda en Supabase. Debe llamarse desde un gesto del usuario.
 */
export async function enablePush(
  author: string | null
): Promise<PushSubscription> {
  const support = getPushSupport();
  if (!support.supported) {
    throw new PushError(support.code ?? "unsupported", support.reason ?? "Push no disponible.");
  }
  if (!isVapidConfigured()) {
    throw new PushError(
      "vapid-missing",
      "Falta configurar la clave pública VAPID (VITE_VAPID_PUBLIC_KEY)."
    );
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new PushError(
      "permission-denied",
      permission === "denied"
        ? "El permiso quedó bloqueado. Habilitalo desde los ajustes del navegador."
        : "Necesitamos tu permiso para enviarte avisos."
    );
  }

  const registration = await getRegistration();
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

  let subscription = await registration.pushManager.getSubscription();

  // Si la suscripción fue creada con otra clave VAPID, la renovamos.
  if (subscription && !sameApplicationServerKey(subscription, applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (err) {
      throw new PushError("subscribe-failed", getErrorText(err));
    }
  }

  await saveSubscription(subscription, author);
  return subscription;
}

/** Desactiva las notificaciones y limpia la fila en Supabase. */
export async function disablePush(): Promise<void> {
  const registration = await navigator.serviceWorker?.getRegistration();
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;

  if (!subscription) return;

  const endpoint = subscription.endpoint;

  if (!subscription.unsubscribe()) {
    throw new PushError(
      "subscribe-failed",
      "No se pudo cancelar la suscripción en este dispositivo."
    );
  }

  try {
    await deleteSubscriptionRecord(endpoint);
  } catch (err) {
    // La suscripción local ya se canceló; el registro se limpia luego con un 410.
    console.warn("No se pudo borrar la suscripción en Supabase:", err);
  }
}

/** Vuelve a guardar la suscripción existente (mantiene fresco el endpoint). */
export async function syncPushSubscription(author: string | null): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;
  if (!subscription) return;
  await saveSubscription(subscription, author);
}

/** Muestra una notificación local de prueba (no necesita servidor). */
export async function showLocalNotification(
  overrides?: { title?: string; body?: string; url?: string }
): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    throw new PushError("permission-denied", "Todavía no hay permiso para notificar.");
  }

  const registration = await getRegistration();
  await registration.showNotification(
    overrides?.title ?? "Nuestro Diario",
    {
      body: overrides?.body ?? "Así se verán nuestros avisos 💛",
      icon: "/pwa-192.png",
      badge: "/icon.png",
      tag: "ohana-test",
      data: { url: overrides?.url ?? "/" },
    }
  );
}
