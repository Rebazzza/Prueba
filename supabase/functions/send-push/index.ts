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

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const secret = Deno.env.get("PUSH_SEND_SECRET");
  const receivedSecret = req.headers.get("x-push-secret");
  if (secret && receivedSecret !== secret) {
    console.error("[send-push] 401: secreto inválido o ausente");
    return json({ error: "No autorizado" }, 401);
  }
  if (!secret) {
    console.warn(
      "[send-push] PUSH_SEND_SECRET no está configurado: la función acepta cualquier llamada."
    );
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hola@example.com";
  if (!publicKey || !privateKey) {
    console.error(
      "[send-push] 500: faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en los secretos"
    );
    return json({ error: "Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY" }, 500);
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    console.error("[send-push] 500: claves VAPID inválidas:", err);
    return json({ error: `Claves VAPID inválidas: ${String(err)}` }, 500);
  }

  const input = (await req.json().catch(() => ({}))) as NotificationPayload &
    WebhookPayload;

  let notification: PushMessage;
  let excludeAuthor: string | null = null;

  if (input.record && input.table) {
    const built = buildFromRecord(input.table, input.record);
    if (!built) {
      console.log(`[send-push] tabla no soportada: ${input.table}`);
      return json({ ok: true, skipped: `tabla no soportada: ${input.table}` });
    }
    notification = built;
    const author = String(input.record.author ?? "").trim();
    excludeAuthor = author || null;
    console.log(
      `[send-push] webhook ${input.table} de "${excludeAuthor ?? "?"}"`
    );
  } else {
    notification = {
      title: input.title ?? "Nuestro Diario",
      body: input.body ?? "Hay algo nuevo esperándote 💛",
      url: input.url ?? "/",
      icon: input.icon,
      image: input.image,
      tag: input.tag,
    };
    console.log("[send-push] petición directa");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let query = supabase.from("push_subscriptions").select("*");

  if (excludeAuthor && /^[A-Za-z0-9_-]+$/.test(excludeAuthor)) {
    query = query.or(`author.is.null,author.neq.${excludeAuthor}`);
  } else if (input.author) {
    query = query.eq("author", input.author);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[send-push] error consultando suscripciones:", error.message);
    return json({ error: error.message }, 500);
  }

  const rows = data ?? [];
  console.log(`[send-push] suscripciones objetivo: ${rows.length}`);

  let sent = 0;
  let removed = 0;
  const failures: Array<{ statusCode?: number; message: string }> = [];

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
        const message =
          (err as { body?: string }).body ??
          (err instanceof Error ? err.message : String(err));
        failures.push({ statusCode, message: truncate(message, 300) });

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

  if (failures.length > 0) {
    console.error("[send-push] fallos:", JSON.stringify(failures));
  }

  const summary = { ok: true, subscribers: rows.length, sent, removed };
  console.log("[send-push] resultado:", JSON.stringify(summary));
  return json(summary);
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (err) {
    console.error("[send-push] error inesperado:", err);
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
