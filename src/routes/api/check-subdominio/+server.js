// src/routes/api/check-subdominio/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ url, locals }) {
  const sub = url.searchParams.get('sub');
  
  if (!sub || sub.length < 3) {
    return json({ disponible: false }, { status: 400 });
  }

  try {
    // 🚀 Usamos maybeSingle() porque si no encuentra nada, es una buena noticia (está disponible)
    const { data, error } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('subdominio', sub)
      .maybeSingle();

    if (error) throw error;

    // Si 'data' tiene algo, significa que alguien ya lo tiene
    return json({ disponible: !data });
    
  } catch (err) {
    console.error("Error verificando subdominio:", err);
    return json({ error: 'Error interno' }, { status: 500 });
  }
}
