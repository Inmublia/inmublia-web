import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables de entorno de Supabase faltantes en el servidor.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET({ url }: RequestEvent) {
    const feedToken = url.searchParams.get('token');
    
    if (!feedToken) {
        throw error(401, 'Token de sindicación requerido. Ejemplo: ?token=xyz');
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('broker_syndication_tokens')
        .select('id, broker_id, is_active, expires_at')
        .eq('token', feedToken)
        .single();

    if (tokenError || !tokenData) {
        throw error(403, 'Token inválido.');
    }

    if (!tokenData.is_active) {
        throw error(403, 'Token revocado por el administrador.');
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        throw error(403, 'Token expirado. Contacta a soporte.');
    }

    const brokerId = tokenData.broker_id;

    // Rastro de auditoría sin bloquear
    supabaseAdmin
        .from('broker_syndication_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', tokenData.id)
        .then();

    // EXTRACCIÓN CON TUS NOMBRES DE COLUMNA REALES
    const { data: properties, error: dbError } = await supabaseAdmin
        .from('propiedades')
        .select(`
            id,
            titulo,
            descripcion,
            precio,
            operacion,
            tipo,
            recamaras,
            banos,
            m2_construccion,
            m2_terreno,
            imagen_url,
            galeria_urls
        `)
        .eq('broker_id', brokerId)
        .eq('estatus', 'Activa'); // <-- Verifica si en tu BD es 'Activa', 'Activo' o 'activa'

    if (dbError) {
        console.error("Error de Supabase:", dbError);
        throw error(500, 'Error interno al consultar el Ledger de propiedades.');
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<adverts>\n`;

    if (properties) {
        for (const prop of properties) {
            const title = escapeXML(prop.titulo);
            const description = escapeXML(prop.descripcion);
            
            xml += `  <advert>\n`;
            xml += `    <id><![CDATA[${prop.id}]]></id>\n`;
            xml += `    <type><![CDATA[${prop.tipo}]]></type>\n`;
            xml += `    <operation><![CDATA[${prop.operacion}]]></operation>\n`;
            xml += `    <title><![CDATA[${title}]]></title>\n`;
            xml += `    <description><![CDATA[${description}]]></description>\n`;
            xml += `    <price currency="MXN">${prop.precio || 0}</price>\n`;
            xml += `    <rooms>${prop.recamaras || 0}</rooms>\n`;
            xml += `    <bathrooms>${prop.banos || 0}</bathrooms>\n`;
            xml += `    <floor_area unit="meters">${prop.m2_construccion || 0}</floor_area>\n`;
            xml += `    <plot_area unit="meters">${prop.m2_terreno || 0}</plot_area>\n`;
            
            xml += `    <pictures>\n`;
            // Procesar foto principal
            if (prop.imagen_url) {
                xml += `      <picture>\n`;
                xml += `        <picture_url><![CDATA[${prop.imagen_url}]]></picture_url>\n`;
                xml += `      </picture>\n`;
            }
            // Procesar galería (Arreglo de URLs)
            if (prop.galeria_urls && Array.isArray(prop.galeria_urls)) {
                prop.galeria_urls.forEach((imgUrl: string) => {
                    if (imgUrl) {
                        xml += `      <picture>\n`;
                        xml += `        <picture_url><![CDATA[${imgUrl}]]></picture_url>\n`;
                        xml += `      </picture>\n`;
                    }
                });
            }
            xml += `    </pictures>\n`;
            xml += `  </advert>\n`;
        }
    }

    xml += `</adverts>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

function escapeXML(unsafe: string | null) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;'; case '>': return '&gt;';
            case '&': return '&amp;'; case '\'': return '&apos;';
            case '"': return '&quot;'; default: return c;
        }
    });
}
