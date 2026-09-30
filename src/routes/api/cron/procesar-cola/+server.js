// src/routes/api/cron/procesar-cola/+server.js
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';
import { procesarDifusion } from '$lib/server/portales-sync';

export async function GET() {
  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: jobs, error } = await supabaseAdmin.rpc('tomar_jobs_cola', { p_limite: 10 });

  if (error || !jobs?.length) return json({ procesados: 0 });

  const resultados = await Promise.allSettled(
    jobs.map(job => procesarDifusion(supabaseAdmin, job))
  );

  return json({ procesados: resultados.length });
}
