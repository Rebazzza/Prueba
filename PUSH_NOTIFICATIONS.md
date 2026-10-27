# 🔔 Notificaciones Push · Nuestro Diario

Sistema de notificaciones nativas para la PWA: Service Worker con soporte de
`push`, suscripción con VAPID, persistencia en Supabase y **envío automático**
cuando se inserta un mensaje o una nota.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/sw.ts` | Service Worker (Workbox + Web Push). VitePWA lo compila a `/sw.js`. Muestra la notificación y maneja el click. |
| `src/lib/push.ts` | Permisos, `PushManager`, clave VAPID y guardado en `push_subscriptions`. |
| `src/components/NotificationToggle.tsx` | Interruptor elegante con los estados del permiso. |
| `src/pages/SettingsPage.tsx` | Pantalla **Ajustes** (perfil + notificaciones). |
| `supabase/migrations/*_push_subscriptions.sql` | Tabla + políticas RLS. |
| `supabase/migrations/*_push_triggers.sql` | Triggers que avisan al insertar en `messages` y `love_notes`. |
| `supabase/functions/send-push/` | Edge Function que envía los avisos. |
| `scripts/generate-vapid-keys.mjs` | Genera el par de claves VAPID. |

## Puesta en marcha

### 1. Claves VAPID

```bash
node scripts/generate-vapid-keys.mjs
```

- Escribe la clave **pública** en `.env` → `VITE_VAPID_PUBLIC_KEY`.
- Guarda la **privada** en `supabase/.env.push.local` (ignorado por git).
- Formato: pública = 65 bytes (`0x04…`), privada = 32 bytes (base64url).

### 2. Tabla en Supabase

Ejecutá `supabase/migrations/20261026000000_push_subscriptions.sql` en el
SQL Editor.

### 3. Probar la suscripción

```bash
npm run build && npm run preview
```

> El Service Worker solo se genera en `build`. En `npm run dev` no está activo.

Abrí **Ajustes → Avisos del corazón**, activá el interruptor y usá **Probar**.

### 4. Edge Function

```bash
supabase functions deploy send-push --no-verify-jwt
supabase secrets set --env-file supabase/.env.push.local
```

Antes, editá `supabase/.env.push.local`: correo real en `VAPID_SUBJECT` y un
`PUSH_SEND_SECRET` largo y aleatorio.

### 5. Notificaciones automáticas (mensajes y notas)

1. Guardá el mismo secreto en Vault (una vez, en el SQL Editor):

```sql
select vault.create_secret(
  '<TU_PUSH_SEND_SECRET>',
  'push_send_secret',
  'Secreto compartido con la Edge Function send-push'
);
```

2. Ejecutá `supabase/migrations/20261026000001_push_triggers.sql`.

Listo: cada `insert` en `messages` o `love_notes` dispara la Edge Function.
Quien escribe **no** recibe su propia notificación (se filtra por `author`).

| Tabla | Título | Cuerpo |
| --- | --- | --- |
| `messages` | `{Autor} te escribió 💬` | el texto, o `📷 Te envió una foto` |
| `love_notes` | `{Autor} te dejó una nota 💌` | el contenido de la nota |

### 6. (Alternativa) Webhooks desde el dashboard

En vez del paso 5 se pueden crear dos **Database Webhooks** (Database →
Webhooks) sobre `messages` y `love_notes` (evento `INSERT`) apuntando a la URL
de `send-push` con header `x-push-secret`. El formato del payload es idéntico.

## Notas

- **iPhone/iPad**: las push solo funcionan con la PWA instalada (Compartir →
  Añadir a pantalla de inicio). El componente lo avisa.
- **HTTPS**: obligatorio salvo en `localhost`.
- El `author` de la suscripción se actualiza solo al cambiar de perfil en
  cualquier pantalla (Ajustes, Buzón, Chat), para no notificar a quien escribe.
- Si cambiás las claves VAPID, las suscripciones se renuevan al volver a
  activar el interruptor.
- Las suscripciones vencidas (404/410) se borran solas en cada envío.

## Formato del payload

Webhook (automático):

```json
{ "type": "INSERT", "table": "messages", "record": { "author": "M", "content": "Hola 💛" } }
```

Petición directa:

```bash
curl -X POST https://<proyecto>.supabase.co/functions/v1/send-push \
  -H "Content-Type: application/json" \
  -H "x-push-secret: <PUSH_SEND_SECRET>" \
  -d '{"title":"Mira esto 💛","body":"Te dejé una nota nueva","url":"/"}'
```
