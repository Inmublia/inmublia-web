export function GET({ request, url }) {
  return new Response(JSON.stringify({
    diagnostico: "ANALISIS DE INFRAESTRUCTURA EDGE",
    url_que_ve_svelte: url.href,
    origen_real: url.origin,
    dominio_detectado: url.hostname,
    header_host: request.headers.get('host'),
    header_forwarded: request.headers.get('x-forwarded-host')
  }, null, 2), { 
    headers: { 'Content-Type': 'application/json' }
  });
}
