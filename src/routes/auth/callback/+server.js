import { redirect } from '@sveltejs/kit';

export const GET = async (event) => {
  const { url, locals: { supabase } } = event;
  
  // 1. Interceptar errores directos de Supabase en la URL primero
  const authError = url.searchParams.get('error');
  const authErrorDesc = url.searchParams.get('error_description');
  
  if (authError) {
    console.error("Auth callback falló desde el origen:", authErrorDesc);
    throw redirect(303, `/login?error=enlace_invalido`);
  }

  const code = url.searchParams.get('code');
  let next = url.searchParams.get('next') ?? '/admin';

  // 2. Prevenir Open Redirect asegurando ruta local
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/admin'; 
  }

  // 3. Flujo PKCE limpio
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      throw redirect(303, next);
    } else {
      console.error("Error al canjear código PKCE:", error);
      throw redirect(303, '/login?error=enlace_invalido');
    }
  }

  throw redirect(303, '/login?error=enlace_expirado');
};
