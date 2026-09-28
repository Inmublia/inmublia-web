/** @type {import('tailwindcss').Config} */
export default {
  // 🚀 LA LÍNEA CRÍTICA: Obliga a Tailwind a usar clases manuales en lugar del Sistema Operativo
  darkMode: 'class', 
  
  content: ['./src/**/*.{html,js,svelte,ts}'],
  
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      // Configuración de sombras y animaciones B2B que hemos estado usando
      boxShadow: {
        'b2b': '0 4px 20px -2px rgba(15, 23, 42, 0.03)',
        'b2b-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: [
    // Si usas plugins como typography o forms, se declaran aquí
  ]
};
