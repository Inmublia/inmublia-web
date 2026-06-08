export const PLANES_CONFIG = {
  basico: {
    nombre: 'Plan Básico',
    templates_autorizados: ['classic', 'clean'], // 2 liberados
    caracteristicas: { galeria_max_fotos: 5, video_recorrido: false, matterport_3d: false, propiedad_vip: false }
  },
  pro: {
    nombre: 'Plan Profesional',
    templates_autorizados: ['classic', 'clean', 'modern', 'editorial'], // 4 liberados
    caracteristicas: { galeria_max_fotos: 15, video_recorrido: true, matterport_3d: false, propiedad_vip: false }
  },
  elite: {
    nombre: 'Plan Élite',
    templates_autorizados: ['classic', 'clean', 'modern', 'editorial', 'luxury', 'cinematic'], // 6 liberados
    caracteristicas: { galeria_max_fotos: 30, video_recorrido: true, matterport_3d: true, propiedad_vip: true }
  }
};
