import { redirect } from '@sveltejs/kit';

export const GET = async (event) => {
  const {
    url,
    locals: { supabase }
  } = event;
  
  const code = url.searchParams.get('code');
  // Por defecto, si no se especifica ruta posterior, redirige al panel de administración
  const next = url.searchParams.get('next') ?? '/admin';

  if (code) {
    // Intercambio seguro en el servidor (PKCE Flow)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redirección limpia hacia la ruta protegida (ej: /recuperar-acceso)
      throw redirect(303, `/${next.slice(1)}`);
    } else {
      console.error("Error al canjear código PKCE:", error);
      throw redirect(303, '/login?error=enlace_invalido');
    }
  }

  throw redirect(303, '/login?error=enlace_expirado');
};
