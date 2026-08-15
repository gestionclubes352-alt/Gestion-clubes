/**
 * EJEMPLOS DE COMPONENTES RESPONSIVE
 * Para portátiles 13", 15", 17" y monitores 24", 28", 32"
 *
 * Usar estos como referencia al actualizar otros componentes
 */

// ============================================================================
// EJEMPLO 1: CARD BÁSICA
// ============================================================================

export const ResponsiveCard = () => {
  return (
    <div className="
      /* Padding escalado */
      p-3 sm:p-4 md:p-5 lg:p-6 2xl:p-8 3xl:p-10 4xl:p-12
      /* Esquinas redondeadas */
      rounded-lg sm:rounded-xl 2xl:rounded-2xl 3xl:rounded-3xl
      /* Bordes */
      border border-slate-200 dark:border-slate-700
      /* Fondo */
      bg-white dark:bg-slate-800
      /* Sombra */
      shadow-sm hover:shadow-lg transition-shadow duration-300
    ">
      <h3 className="
        /* Tamaño de fuente escalado */
        text-sm sm:text-base md:text-lg 2xl:text-xl 3xl:text-2xl 4xl:text-3xl
        /* Peso */
        font-bold
        /* Margen inferior */
        mb-2 sm:mb-3 md:mb-4 2xl:mb-6 3xl:mb-8
      ">
        Título Responsivo
      </h3>

      <p className="
        text-xs sm:text-sm md:text-base lg:text-sm 2xl:text-base 3xl:text-lg 4xl:text-xl
        text-slate-600 dark:text-slate-300
        leading-relaxed
      ">
        Contenido que escala automáticamente
      </p>
    </div>
  );
};

// ============================================================================
// EJEMPLO 2: GRID LAYOUT (Como HomeSectionsView)
// ============================================================================

export const ResponsiveGrid = ({ items }: { items: any[] }) => {
  return (
    <div className="
      /* Grid responsivo */
      grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6
      /* Gap escalado */
      gap-3 sm:gap-4 md:gap-5 lg:gap-6 2xl:gap-8 3xl:gap-10 4xl:gap-12
      /* Padding del contenedor */
      px-3 sm:px-4 md:px-6 lg:px-8 2xl:px-12 3xl:px-16 4xl:px-20
      py-3 sm:py-4 md:py-6 lg:py-8 2xl:py-10 3xl:py-12
    ">
      {items.map(item => (
        <div
          key={item.id}
          className="
            /* Espaciado interno */
            p-4 sm:p-5 2xl:p-8 3xl:p-10 4xl:p-12
            /* Forma */
            rounded-2xl sm:rounded-3xl
            /* Estilo */
            bg-gradient-to-br from-slate-700 to-slate-800
            /* Sombra */
            shadow-md hover:shadow-2xl
            /* Transición */
            transition-all duration-300
            /* Flexbox para contenido */
            flex flex-col gap-3 sm:gap-4 2xl:gap-6
          "
        >
          <h4 className="
            text-sm sm:text-base 2xl:text-lg 3xl:text-xl 4xl:text-2xl
            font-bold text-white
          ">
            {item.title}
          </h4>

          <div className="text-xs sm:text-sm 2xl:text-base 3xl:text-lg text-slate-300">
            {item.description}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// EJEMPLO 3: TABLA RESPONSIVA CON SCROLL
// ============================================================================

export const ResponsiveTable = ({ data }: { data: any[] }) => {
  return (
    <div className="
      /* Contenedor con scroll en pequeñas pantallas */
      overflow-x-auto
      -webkit-overflow-scrolling:touch
      /* Visible en desktop grande */
      3xl:overflow-x-visible
      /* Padding responsivo */
      p-3 sm:p-4 md:p-6 lg:p-8 2xl:p-10 3xl:p-12
      /* Fondo */
      bg-white dark:bg-slate-800
      rounded-lg sm:rounded-xl 2xl:rounded-2xl
    ">
      <table className="
        /* Ancho completo */
        w-full
        /* Tamaño de fuente responsivo */
        text-xs sm:text-sm md:text-base lg:text-sm 2xl:text-base 3xl:text-lg 4xl:text-xl
        /* Border collapse */
        border-collapse
      ">
        <thead className="
          /* Fondo de encabezado */
          bg-slate-50 dark:bg-slate-700
          /* Borde */
          border-b border-slate-200 dark:border-slate-600
        ">
          <tr>
            <th className="
              /* Alineación */
              text-left
              /* Padding responsivo */
              px-3 sm:px-4 md:px-5 lg:px-6 2xl:px-8 3xl:px-10 4xl:px-12
              py-2 sm:py-3 md:py-4 2xl:py-5 3xl:py-6 4xl:py-8
              /* Tipografía */
              font-bold text-slate-600 dark:text-slate-300
              /* Mayúsculas */
              uppercase tracking-wider text-xs
            ">
              Nombre
            </th>
            <th className="
              text-left
              px-3 sm:px-4 md:px-5 lg:px-6 2xl:px-8 3xl:px-10 4xl:px-12
              py-2 sm:py-3 md:py-4 2xl:py-5 3xl:py-6 4xl:py-8
              font-bold text-slate-600 dark:text-slate-300
              uppercase tracking-wider text-xs
            ">
              Correo
            </th>
            <th className="
              text-left
              px-3 sm:px-4 md:px-5 lg:px-6 2xl:px-8 3xl:px-10 4xl:px-12
              py-2 sm:py-3 md:py-4 2xl:py-5 3xl:py-6 4xl:py-8
              font-bold text-slate-600 dark:text-slate-300
              uppercase tracking-wider text-xs
            ">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="
                /* Borde entre filas */
                border-b border-slate-100 dark:border-slate-700
                /* Hover */
                hover:bg-slate-50 dark:hover:bg-slate-700/50
                /* Transición */
                transition-colors duration-200
              "
            >
              <td className="
                px-3 sm:px-4 md:px-5 lg:px-6 2xl:px-8 3xl:px-10 4xl:px-12
                py-2 sm:py-2.5 md:py-3 lg:py-3 2xl:py-4 3xl:py-5 4xl:py-6
                text-slate-700 dark:text-slate-200
              ">
                {row.name}
              </td>
              <td className="
                px-3 sm:px-4 md:px-5 lg:px-6 2xl:px-8 3xl:px-10 4xl:px-12
                py-2 sm:py-2.5 md:py-3 lg:py-3 2xl:py-4 3xl:py-5 4xl:py-6
                text-slate-600 dark:text-slate-300
                /* No romper en móvil */
                break-all sm:break-normal
              ">
                {row.email}
              </td>
              <td className="
                px-3 sm:px-4 md:px-5 lg:px-6 2xl:px-8 3xl:px-10 4xl:px-12
                py-2 sm:py-2.5 md:py-3 lg:py-3 2xl:py-4 3xl:py-5 4xl:py-6
              ">
                <span className="
                  /* Padding del badge */
                  px-2 sm:px-3 2xl:px-4 3xl:px-5
                  py-1 sm:py-1.5 2xl:py-2 3xl:py-3
                  /* Forma */
                  rounded-full
                  /* Tamaño de fuente */
                  text-xs sm:text-sm 2xl:text-base 3xl:text-lg
                  /* Color */
                  bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400
                  /* Font */
                  font-semibold
                ">
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// EJEMPLO 4: MODAL RESPONSIVO
// ============================================================================

export const ResponsiveModal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;

  return (
    <div className="
      /* Overlay */
      fixed inset-0 bg-black/50 z-40
      /* Flexbox para centrar */
      flex items-center justify-center
      /* Padding responsivo en móvil */
      p-3 sm:p-4 md:p-6
    ">
      <div className="
        /* Ancho responsivo */
        w-full
        max-w-xs sm:max-w-sm md:max-w-md 2xl:max-w-lg 3xl:max-w-2xl 4xl:max-w-3xl
        /* Altura máxima para no desbordarse */
        max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-4rem)]
        /* Overflow */
        overflow-y-auto
        /* Forma */
        rounded-2xl sm:rounded-3xl
        /* Fondo */
        bg-white dark:bg-slate-800
        /* Sombra */
        shadow-2xl
        /* Z-index */
        z-50
        /* Animación */
        animate-fade-in
      ">
        {/* Header */}
        <div className="
          /* Sticky para móvil */
          sticky top-0
          /* Padding responsivo */
          px-4 sm:px-6 2xl:px-8 3xl:px-10
          py-3 sm:py-4 2xl:py-6 3xl:py-8
          /* Fondo */
          bg-slate-50 dark:bg-slate-700
          /* Borde */
          border-b border-slate-200 dark:border-slate-600
          /* Flexbox */
          flex items-center justify-between gap-3 sm:gap-4
        ">
          <h2 className="
            /* Tamaño */
            text-lg sm:text-xl 2xl:text-2xl 3xl:text-3xl
            /* Font */
            font-bold
            /* Color */
            text-slate-900 dark:text-white
          ">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="
              /* Tamaño */
              w-8 h-8 sm:w-9 sm:h-9 2xl:w-10 2xl:h-10
              /* Flexbox */
              flex items-center justify-center
              /* Forma */
              rounded-lg
              /* Color */
              text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
              /* Transición */
              transition-colors
            "
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="
          /* Padding responsivo */
          px-4 sm:px-6 2xl:px-8 3xl:px-10
          py-4 sm:py-6 2xl:py-8 3xl:py-10
          /* Gap para elementos internos */
          space-y-3 sm:space-y-4 2xl:space-y-6 3xl:space-y-8
        ">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EJEMPLO 5: BOTÓN ESCALABLE
// ============================================================================

export const ResponsiveButton = ({ children, ...props }: any) => {
  return (
    <button
      {...props}
      className="
        /* Padding responsivo - crucial para touch targets */
        px-3 sm:px-4 md:px-5 lg:px-6 2xl:px-8 3xl:px-10 4xl:px-12
        py-2 sm:py-2.5 md:py-3 lg:py-3 2xl:py-4 3xl:py-5 4xl:py-6
        /* Mínimo 44px en móvil para touch */
        min-h-10 sm:min-h-11 2xl:min-h-12 3xl:min-h-14
        /* Tamaño de fuente */
        text-sm sm:text-base 2xl:text-lg 3xl:text-xl 4xl:text-2xl
        /* Forma */
        rounded-lg sm:rounded-xl 2xl:rounded-2xl
        /* Fuente */
        font-semibold
        /* Transición */
        transition-all duration-200
        /* Foco */
        focus:outline-none focus:ring-2 focus:ring-offset-2
      "
    >
      {children}
    </button>
  );
};

// ============================================================================
// EJEMPLO 6: HEADER RESPONSIVE (Patrón completo)
// ============================================================================

export const ResponsiveHeader = ({ title, subtitle }: any) => {
  return (
    <header className="
      /* Padding responsivo */
      px-3 sm:px-4 md:px-6 lg:px-8 2xl:px-12 3xl:px-16 4xl:px-20
      py-3 sm:py-4 md:py-5 lg:py-6 2xl:py-8 3xl:py-10
      /* Fondo */
      bg-white dark:bg-slate-800
      /* Borde */
      border-b border-slate-200 dark:border-slate-700
      /* Shadow */
      shadow-sm
    ">
      <div className="flex flex-col gap-2 sm:gap-3 2xl:gap-4">
        <h1 className="
          /* Tamaño escalado */
          text-xl sm:text-2xl md:text-3xl 2xl:text-4xl 3xl:text-5xl 4xl:text-6xl
          /* Font */
          font-black
          /* Color */
          text-slate-900 dark:text-white
          /* Tracking */
          tracking-tight
        ">
          {title}
        </h1>

        {subtitle && (
          <p className="
            text-sm sm:text-base md:text-lg 2xl:text-xl 3xl:text-2xl
            text-slate-600 dark:text-slate-300
          ">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
};

// ============================================================================
// EJEMPLO 7: LAYOUT CON SIDEBAR (Estructura completa)
// ============================================================================

export const ResponsiveLayout = ({ sidebar, main }: any) => {
  return (
    <div className="flex h-dvh">
      {/* Sidebar */}
      <aside className="
        /* Ancho fijo (no responsive) */
        w-[280px] 3xl:w-[300px] 4xl:w-[320px] 5xl:w-[360px]
        /* Fondo */
        bg-slate-900
        /* Border */
        border-r border-slate-800
        /* Hidden en móvil (usar modal/drawer) */
        hidden lg:block
        /* Overflow */
        overflow-y-auto
      ">
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="
        /* Flex para crecer */
        flex-1
        /* Overflow */
        overflow-y-auto
        /* Padding responsivo */
        px-3 sm:px-4 md:px-6 lg:px-8 2xl:px-12 3xl:px-16 4xl:px-20
        py-3 sm:py-4 md:py-6 lg:py-8 2xl:py-10 3xl:py-12
      ">
        {main}
      </main>
    </div>
  );
};

// ============================================================================
// PATRÓN DE USO
// ============================================================================

/*
PASOS PARA APLICAR A OTROS COMPONENTES:

1. Identificar todos los className que usan Tailwind
2. Para cada uno, agregar escalas: sm → md → lg → 2xl → 3xl → 4xl

ORDEN GENERAL:
- Primero padding/margin (px, py, p)
- Luego gap/spacing (gap)
- Luego tamaño de fuente (text-*)
- Luego bordes/radio (rounded-*)
- Luego height/width específico

EJEMPLO DE TRANSFORMACIÓN:
De:
  className="p-4 text-base gap-3 rounded-lg"

A:
  className="
    p-3 sm:p-4 md:p-5 lg:p-6 2xl:p-8 3xl:p-10 4xl:p-12
    text-sm sm:text-base md:text-lg 2xl:text-xl 3xl:text-2xl 4xl:text-3xl
    gap-3 sm:gap-4 md:gap-5 lg:gap-6 2xl:gap-8 3xl:gap-10 4xl:gap-12
    rounded-lg sm:rounded-xl 2xl:rounded-2xl
  "

MÓVIL FIRST APPROACH:
1. Escribir clases SIN breakpoint para móvil (xs, sm)
2. Agregar sm: para tablets
3. Agregar md: para tablets landscape
4. Agregar lg: para laptops
5. Agregar 2xl: para laptops grandes/monitores
6. Agregar 3xl: para monitores 27"
7. Agregar 4xl: para monitores 32"
*/

export default {
  ResponsiveCard,
  ResponsiveGrid,
  ResponsiveTable,
  ResponsiveModal,
  ResponsiveButton,
  ResponsiveHeader,
  ResponsiveLayout,
};
