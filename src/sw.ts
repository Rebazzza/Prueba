/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

interface PushPayload {
  title?: string
  body?: string
  icon?: string
  badge?: string
  image?: string
  url?: string
  tag?: string
}

const DEFAULT_TITLE = 'Nuestro Diario'
const DEFAULT_BODY = 'Tienes un nuevo recuerdo esperándote 💛'
const DEFAULT_ICON = '/pwa-192.png'
const DEFAULT_BADGE = '/icon.png'
const DEFAULT_TAG = 'ohana-alert'

// --- Ciclo de vida (autoUpdate) ---------------------------------------------
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

// Precarga los assets que genera VitePWA en cada build.
precacheAndRoute(self.__WB_MANIFEST)

// Fallback de navegación para la SPA (equivalente a navigateFallback).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// --- Notificaciones push -----------------------------------------------------

function parsePayload(event: PushEvent): PushPayload {
  if (!event.data) return {}
  try {
    return event.data.json() as PushPayload
  } catch {
    // Si el servidor envía texto plano en lugar de JSON.
    return { body: event.data.text() }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePayload(event)

  const title = payload.title?.trim() || DEFAULT_TITLE
  const baseOptions: NotificationOptions = {
    body: payload.body?.trim() || DEFAULT_BODY,
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag || DEFAULT_TAG,
    data: { url: payload.url || '/' },
  }

  // `image` existe en las notificaciones del navegador, aunque el tipo del
  // service worker todavía no lo declare.
  const options = payload.image
    ? { ...baseOptions, image: payload.image }
    : baseOptions

  event.waitUntil(self.registration.showNotification(title, options))
})

// Al tocar la notificación: enfoca la pestaña abierta o abre una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = (event.notification.data ?? {}) as { url?: string }
  const targetUrl = new URL(data.url || '/', self.location.origin).href

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }

      const available = clientList.find(
        (client): client is WindowClient => 'focus' in client && 'navigate' in client
      )
      if (available) {
        await available.navigate(targetUrl)
        return available.focus()
      }

      return self.clients.openWindow(targetUrl)
    })()
  )
})
