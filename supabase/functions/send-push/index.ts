import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/**
 * Edge Function opcional para ENVIAR notificaciones push.
 *
 * Deploy:
 *   supabase functions deploy send-push --no-verify-jwt
 *
 * Secretos:
 *   supabase secrets set --env-file supabase/.env.push.local
 *
 * Uso:
 *   curl -X POST https://<proyecto>.supabase.co/functions/v1/send-push \
 *     -H "Content-Type: application/json" \
 *     -H "x-push-secret: <PUSH_SEND_SECRET>" \
 *     -d '{"title":"Mira esto 💛","body":"Te dejé una nota nueva","url":"/"}'
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  image?: string;
  tag?: string;
  /** Filtra por autor ("M" o "R"). Sin valor, envía a todos. */
  author?: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  const payload = (await req.json().catch(() => ({}))) as PushPayload;
  const notification = {
    title: payload.title ?? "Nuestro Diario",
    body: payload.body ?? "Hay algo nuevo esperándote 💛",
    url: payload.url ?? "/",
    icon: payload.icon ?? "/pwa-192.png",
    image: payload.image,
    tag: payload.tag,
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let query = supabase.from("push_subscriptions").select("*");
  if (payload.author) query = query.eq("author", payload.author);

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
