#!/usr/bin/env node
/**
 * Genera un par de claves VAPID (Web Push) en el formato correcto:
 *
 *   - Pública: punto EC sin comprimir (65 bytes, empieza por 0x04) en base64url.
 *   - Privada: escalar crudo (32 bytes) en base64url.
 *
 * ⚠️  IMPORTANTE: `PushManager.subscribe()` y `web-push` NO aceptan el formato
 * SPKI/PKCS8; necesitan este formato crudo.
 *
 *   - La clave PÚBLICA se escribe en `.env` como VITE_VAPID_PUBLIC_KEY
 *     (el navegador la necesita para suscribirse).
 *   - La clave PRIVADA se guarda en `supabase/.env.push.local` (ignorado por git)
 *     para configurarla como secreto del remitente (Edge Function / servidor).
 *
 * Uso:  node scripts/generate-vapid-keys.mjs
 */
import { createECDH } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const secretPath = resolve(root, "supabase", ".env.push.local");

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();

const publicKeyB64 = ecdh.getPublicKey().toString("base64url");
const privateKeyB64 = ecdh.getPrivateKey().toString("base64url");

// Comprobación: la pública debe derivarse de la privada y tener 65 bytes.
const verify = createECDH("prime256v1");
verify.setPrivateKey(Buffer.from(privateKeyB64, "base64url"));
const derived = verify.getPublicKey().toString("base64url");
if (derived !== publicKeyB64) {
  throw new Error("La clave pública no se pudo verificar contra la privada.");
}
if (Buffer.from(publicKeyB64, "base64url").length !== 65) {
  throw new Error("La clave pública VAPID no tiene el formato esperado (65 bytes).");
}

// 1) Clave pública -> .env
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
if (/^VITE_VAPID_PUBLIC_KEY=/m.test(env)) {
  env = env.replace(
    /^VITE_VAPID_PUBLIC_KEY=.*$/m,
    `VITE_VAPID_PUBLIC_KEY=${publicKeyB64}`
  );
} else {
  env = `${env.trimEnd()}\nVITE_VAPID_PUBLIC_KEY=${publicKeyB64}\n`;
}
writeFileSync(envPath, env, "utf8");

// 2) Clave privada -> archivo local ignorado por git
mkdirSync(dirname(secretPath), { recursive: true });
writeFileSync(
  secretPath,
  [
    "# Secretos para enviar notificaciones push (NO subir a git).",
    "# Configuralos como secretos de Supabase:",
    "#   supabase secrets set --env-file supabase/.env.push.local",
    "",
    `VAPID_PUBLIC_KEY=${publicKeyB64}`,
    `VAPID_PRIVATE_KEY=${privateKeyB64}`,
    "VAPID_SUBJECT=mailto:tu-correo@ejemplo.com",
    "PUSH_SEND_SECRET=cambiame-por-un-secreto-largo",
    "",
  ].join("\n"),
  "utf8"
);

console.log("✅ Claves VAPID generadas (formato Web Push correcto).");
console.log(`   Pública  -> .env  (VITE_VAPID_PUBLIC_KEY=${publicKeyB64.slice(0, 16)}…)`);
console.log("   Privada  -> supabase/.env.push.local (ignorado por git)");
