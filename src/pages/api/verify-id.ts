// src/pages/api/verify-id.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Para esta consulta pública y segura, no necesitamos la llave de servicio.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const POST: APIRoute = async ({ request }) => {
  try {
    // Leemos el cuerpo de la petición, que esperamos que sea un JSON como { "numeroId": "123" }
    const { numeroId } = await request.json();

    // Si no nos envían un numeroId, no podemos hacer nada.
    if (!numeroId) {
      return new Response(JSON.stringify({ message: "numeroId es requerido" }), { status: 400 });
    }

    // Hacemos la consulta a la base de datos
    const { data, error } = await supabase
      .from('persona')
      .select('id')
      .eq('numero_id', numeroId)
      .single();

    // Si hay un error que no sea "no se encontró la fila", es un problema del servidor.
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Devolvemos una respuesta JSON indicando si el ID existe o no.
    // !!data convierte el objeto (si existe) o null (si no existe) en un booleano.
    return new Response(JSON.stringify({ exists: !!data }), { status: 200 });

  } catch (e) {
    console.error("Error en /api/verify-id:", e);
    // Si algo falla (ej: el JSON está mal formado), devolvemos un error de servidor.
    return new Response(JSON.stringify({ message: "Error interno del servidor" }), { status: 500 });
  }
};
