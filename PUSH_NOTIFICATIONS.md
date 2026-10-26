# 🔔 Notificaciones Push · Nuestro Diario

Sistema de notificaciones nativas para la PWA: Service Worker con soporte de
`push`, suscripción con VAPID y persistencia en Supabase.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/sw.ts` | Service Worker (Workbox + Web Push). VitePWA lo compila a `/sw.js`. Muestra la notificación y maneja el click. |
| `src/lib/push.ts` | Permisos, `PushManager`, conversión de la clave VAPID y guardado en `push_subscriptions`. |
| `src/components/NotificationToggle.tsx` | Interruptor elegante con los estados del permiso. |
| `src/pages/SettingsPage.tsx` | Pantalla **Ajustes** (perfil + notificaciones). |
| `supabase/migrations/*_push_subscriptions.sql` | Tabla + políticas RLS. |
| `supabase/functions/send-push/` | Edge Function opcional para **enviar** los avisos. |
| `scripts/generate-vapid-keys.mjs` | Genera el par de claves VAPID. |

## Puesta en marcha

### 1. Claves VAPID

```bash
node scripts/generate-vapid-keys.mjs
```

- Escribe la clave **pública** en `.env` → `VITE_VAPID_PUBLIC_KEY`.
- Guarda la **privada** en `supabase/.env.push.local` (ignorado por git).

### 2. Tabla en Supabase

Ejecutá `supabase/migrations/20261026000000_push_subscriptions.sql` en el
SQL Editor del proyecto.

### 3. Probar

```bash
npm run build && npm run preview
```

> El Service Worker solo se genera en `build`. En `npm run dev` no está activo,
> así que las notificaciones no se pueden probar ahí.

Abrí **Ajustes → Avisos del corazón**, activá el interruptor y usá **Probar**
para ver una notificación local.

### 4. Enviar avisos (opcional)

```bash
supabase functions deploy send-push --no-verify-jwt
supabase secrets set --env-file supabase/.env.push.local
```

Luego:

```bash
curl -X POST https://<proyecto>.supabase.co/functions/v1/send-push \
  -H "Content-Type: application/json" \
  -H "x-push-secret: <PUSH_SEND_SECRET>" \
  -d '{"title":"Mira esto 💛","body":"Te dejé una nota nueva","url":"/"}'
```

## Notas

- **iPhone/iPad**: las notificaciones push solo funcionan con la PWA instalada
  (Compartir → Añadir a pantalla de inicio). El componente lo avisa.
- **HTTPS**: obligatorio salvo en `localhost`.
- Si cambiás las claves VAPID, las suscripciones viejas se renuevan solas al
  volver a activar el interruptor.
- El evento `notificationclick` enfoca la app o la abre en `url` (por defecto `/`).

## Formato del payload

```json
{
  "title": "Nuestro Diario",
  "body": "Tienes un nuevo recuerdo esperándote 💛",
  "icon": "/pwa-192.png",
  "image": "https://…",
  "url": "/",
  "tag": "ohana-alert"
}
```
