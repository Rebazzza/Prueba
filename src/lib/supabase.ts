import { supabase } from "./supabaseClient";
import { getErrorText } from "./getErrorText";

export interface AppImage {
  id: string;
  created_at: string;
  author: string | null;
  section: string;
  image_url: string;
  caption: string | null;
}

const BUCKET = "ohana_images";

export function bucketUrl(name: string): string {
  const clean = name.replace(/^\/+/, "");
  return supabase.storage.from(BUCKET).getPublicUrl(clean).data.publicUrl;
}

export interface UploadImageOptions {
  file: Blob | File;
  name?: string;
  author?: string;
  section: string;
  caption?: string;
}

export async function uploadImage(
  options: UploadImageOptions
): Promise<{ url: string; record: AppImage | null }> {
  const ext =
    ("name" in options.file ? options.file.name : "")?.split(".").pop() || "jpg";
  const fileName =
    options.name ??
    `${options.section}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, options.file, {
      contentType: options.file.type || "image/jpeg",
      upsert: true,
    });
  if (storageError) throw new Error(getErrorText(storageError));

  const url = bucketUrl(fileName);

  let record: AppImage | null = null;
  try {
    const { data, error: dbError } = await supabase
      .from("app_images")
      .insert({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        author: options.author ?? "Diario",
        section: options.section,
        image_url: url,
        caption: options.caption ?? null,
      })
      .select()
      .single();
    if (dbError) throw dbError;
    record = data as AppImage;
  } catch (err) {
    console.warn("No se pudo registrar en app_images:", err);
  }

  return { url, record };
}

export async function fetchImages(section?: string): Promise<AppImage[]> {
  let query = supabase
    .from("app_images")
    .select("*")
    .order("created_at", { ascending: false });
  if (section) query = query.eq("section", section);

  const { data, error } = await query;
  if (error) throw new Error(getErrorText(error));
  return (data ?? []) as AppImage[];
}