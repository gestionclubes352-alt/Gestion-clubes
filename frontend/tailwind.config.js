/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      // Breakpoints personalizados para diferentes dispositivos
      // Portátiles: 13" (1280x800), 15" (1920x1080), 17" (1920x1200)
      // Monitores: 24" (1920x1080), 27-28" (2560x1440), 32" (3840x2160)
      screens: {
        // Móvil
        'xs': '320px',   // Móviles pequeños
        'sm': '640px',   // Móviles medianos (portrait)
        'md': '768px',   // Tablets
        'lg': '1024px',  // Tablets landscape / Portátiles 13"
        'xl': '1280px',  // Portátiles 13-15" (1280x800+)
        '2xl': '1536px', // Portátiles 15-17" (1920x1080+)
        '3xl': '1920px', // Monitores 24" (1920x1080)
        '4xl': '2560px', // Monitores 27-28" (2560x1440)
        '5xl': '3840px', // Monitores 32" (3840x2160)

        // Breakpoints por altura (muy útil para portátiles con pantalla corta)
        'h-sm': { raw: '(max-height: 600px)' },
        'h-md': { raw: '(min-height: 600px)' },
        'h-lg': { raw: '(min-height: 800px)' },
        'h-xl': { raw: '(min-height: 1000px)' },

        // Breakpoints por relación de aspecto
        'landscape': { raw: '(orientation: landscape)' },
        'portrait': { raw: '(orientation: portrait)' },

        // Densidad de píxeles (pantallas retina)
        'retina': { raw: '(min-device-pixel-ratio: 2)' },
      },

      spacing: {
        // Espacios responsive para diferentes tamaños
        'sidebar-expanded': '280px',
        'sidebar-collapsed': '72px',
        'header-height': '64px',
        'header-height-lg': '80px',
        'bottom-nav-height': '72px',
      },

      fontSize: {
        // Tamaños de texto escalables (reducidos sutilmente -5%)
        'xs': ['0.71rem', { lineHeight: '1rem' }],        // 11.36px
        'sm': ['0.83rem', { lineHeight: '1.25rem' }],     // 13.28px
        'base': ['0.95rem', { lineHeight: '1.5rem' }],    // 15.2px
        'lg': ['1.07rem', { lineHeight: '1.75rem' }],     // 17.12px
        'xl': ['1.19rem', { lineHeight: '1.75rem' }],     // 19.04px
        '2xl': ['1.43rem', { lineHeight: '2rem' }],       // 22.88px
        '3xl': ['1.78rem', { lineHeight: '2.25rem' }],    // 28.48px

        // Escalas específicas para monitores grandes
        'title-sm': 'clamp(1.25rem, 3vw, 1.5rem)',
        'title-md': 'clamp(1.5rem, 4vw, 2rem)',
        'title-lg': 'clamp(1.875rem, 5vw, 2.5rem)',
        'title-xl': 'clamp(2.25rem, 6vw, 3rem)',
      },

      width: {
        // Ancho máximo de contenido para monitores grandes
        'content': 'clamp(320px, 100%, 1920px)',
        'content-lg': 'clamp(320px, 100%, 2560px)',
      },

      maxWidth: {
        'container': '1920px',
        'container-lg': '2560px',
      },

      // Transiciones suaves de tamaño
      transitionProperty: {
        'sizing': 'width, height, max-width, max-height',
      },
    },
  },

  plugins: [
    // Plugin para media queries por altura
    function({ addVariant, e }) {
      addVariant('h-min-600', '@media (min-height: 600px)');
      addVariant('h-min-700', '@media (min-height: 700px)');
      addVariant('h-min-800', '@media (min-height: 800px)');
      addVariant('h-min-1000', '@media (min-height: 1000px)');

      addVariant('h-max-600', '@media (max-height: 600px)');
      addVariant('h-max-800', '@media (max-height: 800px)');

      // Container queries (para componentes responsive internos)
      addVariant('@md', '@container (min-width: 28rem)');
      addVariant('@lg', '@container (min-width: 32rem)');
      addVariant('@xl', '@container (min-width: 42rem)');
      addVariant('@2xl', '@container (min-width: 56rem)');
    },
  ],
};
