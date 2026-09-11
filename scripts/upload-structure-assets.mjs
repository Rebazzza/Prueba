import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PUB = join(ROOT, "public");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...process.env, ...loadEnv(join(ROOT, ".env")) };
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "ohana_images";

const EXCLUDE = /^(pwa-|IconOriginal|icon\.|favicon\.|icons\.)/;
const EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const files = readdirSync(PUB).filter((f) => {
  const ext = f.slice(f.lastIndexOf(".")).toLowerCase();
  return EXTENSIONS.has(ext) && !EXCLUDE.test(f);
});

console.log(`Subiendo ${files.length} imágenes a ${BUCKET}...\n`);

let ok = 0;
let failed = 0;

for (const file of files) {
  const buffer = readFileSync(join(PUB, file));
  const { error } = await supabase.storage.from(BUCKET).upload(file, buffer, {
    contentType: `image/${extOf(file)}`,
    upsert: true,
  });

  if (error) {
    failed++;
    console.log(`  ✗ ${file}: ${error.message}`);
    continue;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(file);

  const { error: dbErr } = await supabase.from("app_images").insert({
    id: randomUUID(),
    created_at: new Date().toISOString(),
    author: "Diario",
    section: "asset",
    image_url: publicUrl,
    caption: file,
  });

  if (dbErr) {
    console.log(`  ✓ ${file} subida (no registrada en app_images: ${dbErr.code || dbErr.message})`);
  } else {
    console.log(`  ✓ ${file} subida y registrada`);
  }
  ok++;
}

console.log(`\nListo: ${ok} subidas, ${failed} fallidas.`);

function extOf(name) {
  const e = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return e === "jpeg" ? "jpeg" : e;
}