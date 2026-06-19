import { env } from '$env/dynamic/private';

export async function registrarSubdominioEnCloudflare(subdominio) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const projectName = env.CLOUDFLARE_PROJECT_NAME;
  const token = env.CLOUDFLARE_API_TOKEN;
  
  const dominioCompleto = `${subdominio}.inmublia.com`;

  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: dominioCompleto })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('🔥 Error API Cloudflare:', data.errors);
      // Código 8000045 indica que el subdominio ya estaba registrado, lo manejamos como éxito
      if (data.errors[0]?.code === 8000045) return { success: true, dominio: dominioCompleto };
      return { success: false, error: data.errors[0]?.message || 'Error al registrar subdominio.' };
    }

    return { success: true, dominio: dominioCompleto };
  } catch (err) {
    console.error('🔥 Error de red contactando a Cloudflare:', err);
    return { success: false, error: 'Fallo de conexión con la infraestructura perimetral.' };
  }
}
