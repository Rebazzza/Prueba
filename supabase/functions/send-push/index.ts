import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/**
 * Edge Function para ENVIAR notificaciones push.
 *
 * Acepta dos formatos de entrada:
 *
 * 1) Webhook de base de datos (lo que envían los triggers de Postgres):
 *    { "type": "INSERT", "table": "messages", "record": { author, content, ... } }
 *
 * 2) Petición directa:
 *    { "title", "body", "url", "author"? }
 *
 * Deploy:
 *   supabase functions deploy send-push --no-verify-jwt
 * Secretos:
 *   supabase secrets set --env-file supabase/.env.push.local
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROFILE_NAMES: Record<string, string> = { M: "Mauricio", R: "Rubí" };

interface NotificationPayload {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  image?: string;
  tag?: string;
  /** Envío directo: limita a las suscripciones de este autor. */
  author?: string | null;
}

interface WebhookPayload {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
}

interface PushMessage {
  title: string;
  body: string;
  url: string;
  icon?: string;
  image?: string;
  tag?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function truncate(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function displayName(author: unknown): string {
  const id = String(author ?? "").trim();
  return PROFILE_NAMES[id] ?? (id || "Tu amor");
}

/** Construye la notificación a partir de una fila insertada. */
function buildFromRecord(
  table: string,
  record: Record<string, unknown>
): PushMessage | null {
  const who = displayName(record.author);

  if (table === "messages") {
    const content = String(record.content ?? "").trim();
    const hasImage = Boolean(record.image_url);
    const body =
      content || (hasImage ? "📷 Te envió una foto" : "Te escribió algo");
    return {
      title: `${who} te escribió 💬`,
      body: truncate(body),
      url: "/",
      tag: "ohana-message",
    };
  }

  if (table === "love_notes") {
    const message = String(record.message ?? "").trim();
    return {
      title: `${who} te dejó una nota 💌`,
      body: truncate(message || "Abrí el buzón para leerla"),
      url: "/",
      tag: "ohana-note",
    };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const secret = Deno.env.get("PUSH_SEND_SECRET");
  if (secret && req.headers.get("x-push-secret") !== secret) {
    return json({ error: "No autorizado" }, 401);
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hola@example.com";
  if (!publicKey || !privateKey) {
    return json({ error: "Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY" }, 500);
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const input = (await req.json().catch(() => ({}))) as NotificationPayload &
    WebhookPayload;

  let notification: PushMessage;
  let excludeAuthor: string | null = null;

  if (input.record && input.table) {
    // Viene de un trigger de base de datos.
    const built = buildFromRecord(input.table, input.record);
    if (!built) {
      return json({ ok: true, skipped: `tabla no soportada: ${input.table}` });
    }
    notification = built;
    const author = String(input.record.author ?? "").trim();
    excludeAuthor = author || null;
  } else {
    // Petición directa.
    notification = {
      title: input.title ?? "Nuestro Diario",
      body: input.body ?? "Hay algo nuevo esperándote 💛",
      url: input.url ?? "/",
      icon: input.icon,
      image: input.image,
      tag: input.tag,
    };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let query = supabase.from("push_subscriptions").select("*");

  if (excludeAuthor && /^[A-Za-z0-9_-]+$/.test(excludeAuthor)) {
    // No notificar a quien escribió.
    query = query.or(`author.is.null,author.neq.${excludeAuthor}`);
  } else if (input.author) {
    query = query.eq("author", input.author);
  }

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const rows = data ?? [];
  let sent = 0;
  let removed = 0;

  await Promise.allSettled(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint as string,
            keys: { p256dh: row.p256dh as string, auth: row.auth as string },
          },
          JSON.stringify(notification)
        );
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // Suscripciones vencidas: se eliminan para no reintentar.
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", row.endpoint as string);
          removed += 1;
        }
      }
    })
  );

  return json({ ok: true, subscribers: rows.length, sent, removed });
});
