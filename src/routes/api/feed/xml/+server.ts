import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// 1. Inicialización nativa al estilo Inmublia Web
// Usamos la Service Role Key para saltar el RLS en esta operación de servidor a servidor (Zero Trust)
const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables de entorno de Supabase faltantes en el servidor.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function GET({ url }: RequestEvent) {
    const feedToken = url.searchParams.get('token');
    
    if (!feedToken) {
        throw error(401, 'Token de sindicación requerido. Ejemplo: ?token=xyz');
    }

    // 2. Validación Zero Trust con Políticas de Expiración y Portal Destino
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

    // 3. Rastro de Auditoría (Fuego y Olvido, no bloquea el hilo)
    supabaseAdmin
        .from('broker_syndication_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', tokenData.id)
        .then();

    // 4. Extraer propiedades autorizadas
    const { data: properties, error: dbError } = await supabaseAdmin
        .from('propiedades')
        .select(`
            id,
            titulo,
            descripcion,
            precio,
            moneda,
            tipo_operacion,
            tipo_propiedad,
            habitaciones,
            banos,
            metros_construccion,
            metros_terreno,
            imagenes ( url )
        `)
        .eq('broker_id', brokerId)
        .eq('estado', 'activa')
        .eq('difusion_activa', true); 

    if (dbError) {
        throw error(500, 'Error interno al consultar el Ledger de propiedades.');
    }

    // 5. Construcción Eficiente del XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<adverts>\n`;

    if (properties) {
        for (const prop of properties) {
            const title = escapeXML(prop.titulo);
            const description = escapeXML(prop.descripcion);
            
            xml += `  <advert>\n`;
            xml += `    <id><![CDATA[${prop.id}]]></id>\n`;
            xml += `    <type><![CDATA[${prop.tipo_propiedad}]]></type>\n`;
            xml += `    <operation><![CDATA[${prop.tipo_operacion}]]></operation>\n`;
            xml += `    <title><![CDATA[${title}]]></title>\n`;
            xml += `    <description><![CDATA[${description}]]></description>\n`;
            xml += `    <price currency="${prop.moneda}">${prop.precio}</price>\n`;
            xml += `    <rooms>${prop.habitaciones || 0}</rooms>\n`;
            xml += `    <bathrooms>${prop.banos || 0}</bathrooms>\n`;
            xml += `    <floor_area unit="meters">${prop.metros_construccion || 0}</floor_area>\n`;
            xml += `    <plot_area unit="meters">${prop.metros_terreno || 0}</plot_area>\n`;
            
            if (prop.imagenes && prop.imagenes.length > 0) {
                xml += `    <pictures>\n`;
                prop.imagenes.forEach((img: any) => {
                    xml += `      <picture>\n`;
                    xml += `        <picture_url><![CDATA[${img.url}]]></picture_url>\n`;
                    xml += `      </picture>\n`;
                });
                xml += `    </pictures>\n`;
            }
            
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
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}
