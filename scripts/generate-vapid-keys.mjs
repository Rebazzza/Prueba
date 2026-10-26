#!/usr/bin/env node
/**
 * Genera un par de claves VAPID (Web Push) y las deja listas para usar:
 *
 *   - La clave PÚBLICA se escribe en `.env` como VITE_VAPID_PUBLIC_KEY
 *     (el navegador la necesita para suscribirse).
 *   - La clave PRIVADA se guarda en `supabase/.env.push.local` (ignorado por git)
 *     para configurarla como secreto del remitente (Edge Function / servidor).
 *
 * Uso:  node scripts/generate-vapid-keys.mjs
 */
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const secretPath = resolve(root, "supabase", ".env.push.local");

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const publicKeyB64 = publicKey
  .export({ type: "spki", format: "der" })
  .toString("base64url");
const privateKeyB64 = privateKey
  .export({ type: "pkcs8", format: "der" })
  .toString("base64url");

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

console.log("✅ Claves VAPID generadas.");
console.log(`   Pública  -> .env  (VITE_VAPID_PUBLIC_KEY=${publicKeyB64.slice(0, 16)}…)`);
console.log("   Privada  -> supabase/.env.push.local (ignorado por git)");
