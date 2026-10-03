import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase'; 

export async function GET({ url }: RequestEvent) {
    // 1. Validación de Seguridad (Zero Trust)
    const feedToken = url.searchParams.get('token');
    
    if (!feedToken) {
        throw error(401, 'Token de sindicación requerido. Ejemplo: ?token=xyz');
    }

    const { data: brokerData, error: brokerError } = await supabaseAdmin
        .from('broker_syndication_tokens')
        .select('broker_id')
        .eq('token', feedToken)
        .single();

    if (brokerError || !brokerData) {
        throw error(403, 'Token inválido o revocado');
    }

    const brokerId = brokerData.broker_id;

    // 2. Extraer propiedades autorizadas
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
        throw error(500, 'Error interno al consultar el Ledger de propiedades');
    }

    // 3. Construcción Eficiente del XML
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
