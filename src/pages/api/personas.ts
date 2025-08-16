// src/pages/api/personas.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// ... (la función calcularEdad no cambia) ...
function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;
// ¡Importante! Creamos el cliente fuera para reutilizarlo.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  console.log("\n--- [API /api/personas] Petición POST recibida ---");

  try {
    const formData = await request.formData();
    const numeroId = formData.get('numero_id')?.toString();
    console.log(`[API] Datos recibidos. Verificando ID: ${numeroId}`);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      cookies.get('sb-access-token')?.value // Le pasamos el token desde la cookie
    );

    if (userError || !user) {
      console.error("[API] Error de autenticación o usuario no encontrado.");
      throw new Error('No estás autenticado o tu sesión ha expirado.');
    }
    console.log(`[API] Petición realizada por el usuario: ${user.email} (ID: ${user.id})`);
    let fotoUrl: string | null = null;
    const fotoFile = formData.get('foto_upload') as File | null;

    if (fotoFile && fotoFile.size > 0) {
      console.log(`[API] Recibida foto: ${fotoFile.name}, tamaño: ${fotoFile.size}`);
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`; // Nombre de archivo único

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('fotos_personas') // Asegúrate de que el bucket se llama así
        .upload(fileName, fotoFile);

      if (uploadError) {
        console.error("[API] Error al subir la foto:", uploadError);
        throw new Error('No se pudo subir la imagen.');
      }

      // Obtenemos la URL pública
      const { data: urlData } = supabaseAdmin.storage
        .from('fotos_personas')
        .getPublicUrl(fileName);

      fotoUrl = urlData.publicUrl;
      console.log(`[API] Foto subida con éxito. URL: ${fotoUrl}`);
    }
    // --- 1. VALIDACIÓN DE ID ÚNICO ---
    if (!numeroId) {
      throw new Error("El número de identificación es obligatorio.");
    }

    const { data: existingPerson, error: idError } = await supabaseAdmin
      .from('persona')
      .select('id', { count: 'exact' }) // Usamos count para ser más eficientes
      .eq('numero_id', numeroId);

    if (idError) {
      console.error("[API] Error al verificar ID:", idError);
      throw new Error(`Error de base de datos al verificar ID: ${idError.message}`);
    }

    if (existingPerson && existingPerson.length > 0) {
      console.log(`[API] El ID ${numeroId} ya existe. Rechazando.`);
      throw new Error('Ya existe una persona con este número de identificación.');
    }

    console.log(`[API] El ID ${numeroId} es único. Procediendo a insertar.`);

    // --- 2. CONSTRUCCIÓN DEL OBJETO ---
    const personaData = {
      tipo_id: formData.get('tipo_id')?.toString(),
      numero_id: numeroId,
      nombres: formData.get('nombres')?.toString(),
      primer_apellido: formData.get('primer_apellido')?.toString(),
      segundo_apellido: formData.get('segundo_apellido')?.toString() || null,
      genero: formData.get('genero')?.toString(),
      fecha_nacimiento: formData.get('fecha_nacimiento')?.toString(),
      edad: calcularEdad(formData.get('fecha_nacimiento')?.toString() || null),
      email: formData.get('email')?.toString(),
      direccion: formData.get('direccion')?.toString(),
      telefono: formData.get('telefono')?.toString(),
      id_escala: Number(formData.get('id_escala')),
      // La foto la manejaremos después.
      url_foto: fotoUrl, // ¡Usamos la variable con la URL!
      user_id: user.id,
    };
    console.log("[API] Objeto persona construido:", personaData);

    // --- 3. INSERCIÓN EN LA BASE DE DATOS ---
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('persona')
      .insert(personaData)
      .select() // Pedimos que nos devuelva el registro insertado
      .single();

    if (insertError) {
      console.error("[API] Error al insertar en Supabase:", insertError);
      throw new Error(`Error de base de datos al insertar: ${insertError.message}`);
    }

    console.log("[API] ¡Éxito! Persona insertada:", insertedData);
    console.log("[API] Redirigiendo a /personas con mensaje de éxito.");

    // --- 4. REDIRECCIÓN DE ÉXITO ---
    return redirect('/personas?success=Persona+creada+con+éxito');

  } catch (e: any) {
    console.error("[API] Error en el bloque catch:", e.message);
    console.log("[API] Redirigiendo a /personas con mensaje de error.");
    return redirect(`/personas?error=${encodeURIComponent(e.message)}`);
  }


};


