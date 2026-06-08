export const PLANES_CONFIG = {
  basico: {
    nombre: 'Plan Básico',
    templates_autorizados: ['classic'],
    caracteristicas: {
      galeria_max_fotos: 15,
      video_recorrido: false,
      matterport_3d: false,
      propiedad_vip: false
    }
  },
  pro: {
    nombre: 'Plan Profesional',
    templates_autorizados: ['classic', 'modern'],
    caracteristicas: {
      galeria_max_fotos: 25,
      video_recorrido: true,
      matterport_3d: false,
      propiedad_vip: false
    }
  },
  elite: {
    nombre: 'Plan Élite / Luxury',
    templates_autorizados: ['classic', 'modern', 'luxury'],
    caracteristicas: {
      galeria_max_fotos: 35,
      video_recorrido: true,
      matterport_3d: true,
      propiedad_vip: true
    }
  }
};
