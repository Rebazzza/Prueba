import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Asegúrate de tener dotenv instalado (`npm install dotenv`) si usas un archivo .env localmente
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan las credenciales de Supabase en las variables de entorno.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const photosDir = path.join(process.cwd(), 'public', 'fotos');

async function uploadLocalPhotos() {
  try {
    if (!fs.existsSync(photosDir)) {
      console.error(`La carpeta ${photosDir} no existe.`);
      return;
    }

    const files = fs.readdirSync(photosDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    const imageFiles = files.filter(file => 
      imageExtensions.includes(path.extname(file).toLowerCase())
    );

    if (imageFiles.length === 0) {
      console.log('No se encontraron imágenes en public/fotos.');
      return;
    }

    console.log(`Encontradas ${imageFiles.length} imágenes. Subiendo a Supabase...`);

    for (const file of imageFiles) {
      const filePath = path.join(photosDir, file);
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = `${Date.now()}-${file}`; // Evita nombres duplicados
      const storagePath = `memories/${fileName}`;

      // 1. Subir al Bucket de Storage
      const { error: uploadError } = await supabase.storage
        .from('ohana_images')
        .upload(storagePath, fileBuffer, {
          contentType: `image/${path.extname(file).replace('.', '')}`,
          upsert: true
        });

      if (uploadError) {
        console.error(`Error al subir ${file}:`, uploadError.message);
        continue;
      }

      // 2. Obtener la URL pública
      const { data: publicUrlData } = supabase.storage
        .from('ohana_images')
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Registrar en la tabla `memories`
      const titleClean = path.basename(file, path.extname(file)).replace(/[-_]/g, ' ');
      const { error: dbError } = await supabase
        .from('memories')
        .insert([
          {
            title: titleClean.charAt(0).toUpperCase() + titleClean.slice(1),
            date: new Date().toISOString().split('T')[0], // Fecha actual por defecto
            description: 'Un recuerdo especial guardado en nuestro diario.',
            image_url: publicUrl
          }
        ]);

      if (dbError) {
        console.error(`Error al registrar en BD ${file}:`, dbError.message);
      } else {
        console.log(`¡Éxito! Subido y registrado: ${file}`);
      }
    }

    console.log('Proceso de migración de fotos completado.');
  } catch (err) {
    console.error('Error inesperado durante la ejecución:', err);
  }
}

uploadLocalPhotos();