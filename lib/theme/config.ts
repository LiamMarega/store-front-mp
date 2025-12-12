/**
 * =====================================================
 * 🎨 CONFIGURACIÓN DE TEMA - FLORIDA HOME FURNITURE
 * =====================================================
 * 
 * Este archivo contiene TODA la configuración visual de la aplicación.
 * Modifica estos valores para personalizar colores, bordes, sombras, etc.
 * 
 * 📍 CÓMO USAR:
 * 1. Busca la sección que quieres modificar (colores, radios, etc.)
 * 2. Cambia el valor
 * 3. Guarda el archivo - los cambios se aplican automáticamente
 * 
 * 💡 TIPS:
 * - Para colores, usa formato HEX (#E56A2C) o HSL (20 80% 50%)
 * - Los radios usan rem o px
 * - Las sombras usan formato CSS estándar
 */

// =============================================================================
// 🎨 COLORES DE MARCA
// =============================================================================
// Estos son los colores principales de la marca. Cámbialos para personalizar
// toda la aplicación de una vez.

export const brandColors = {
    /** Color primario - Usado en botones, links, elementos destacados */
    primary: '#E56A2C',

    /** Color secundario - Usado en elementos secundarios, badges */
    secondary: '#7493B2',

    /** Color de acento - Usado en hovers, estados activos */
    accent: '#FDA46C',

    /** Color crema - Usado en fondos sutiles, bordes suaves */
    cream: '#E9E2CF',

    /** Azul oscuro - Usado en textos principales, headers */
    darkBlue: '#234465',

    /** Blanco - Fondo principal */
    white: '#FFFFFF',
} as const;

// =============================================================================
// 📝 COLORES DE TEXTO
// =============================================================================
// Colores semánticos para diferentes tipos de texto.

export const textColors = {
    /** Texto de encabezados (h1, h2, etc.) */
    heading: '#234465',

    /** Texto de cuerpo normal */
    body: '#4A4A4A',

    /** Texto secundario/sutil */
    muted: '#6B7280',

    /** Texto sobre fondos oscuros */
    light: '#FFFFFF',

    /** Texto de enlaces */
    link: '#E56A2C',
} as const;

// =============================================================================
// 🔲 COLORES DE UI
// =============================================================================
// Colores para estados de la interfaz.

export const uiColors = {
    /** Fondo de la página */
    background: '#FFFFFF',

    /** Fondo de tarjetas */
    card: '#FFFFFF',

    /** Bordes de elementos */
    border: '#E9E2CF',

    /** Fondo de inputs */
    input: '#E9E2CF',

    /** Color de éxito */
    success: '#22C55E',

    /** Color de error/destructivo */
    error: '#EF4444',

    /** Color de advertencia */
    warning: '#F59E0B',

    /** Color de información */
    info: '#3B82F6',
} as const;

// =============================================================================
// 📐 BORDER RADIUS
// =============================================================================
// Tamaños de esquinas redondeadas. Modifica estos para un look más o menos
// redondeado en toda la aplicación.

export const borderRadius = {
    /** Sin redondeo */
    none: '0',

    /** Redondeo pequeño - Para badges, chips pequeños */
    sm: '8px',

    /** Redondeo medio - Para tarjetas, inputs */
    md: '12px',

    /** Redondeo grande - Para tarjetas destacadas, modales */
    lg: '16px',

    /** Redondeo extra grande - Para elementos hero */
    xl: '20px',

    /** Redondeo completo (píldora) - Para botones pill, tags */
    pill: '999px',

    /** Redondeo circular - Para avatares */
    full: '9999px',
} as const;

// =============================================================================
// 🌫️ SOMBRAS
// =============================================================================
// Sombras para dar profundidad a los elementos. Modifica la opacidad para
// sombras más o menos sutiles.

export const shadows = {
    /** Sin sombra */
    none: 'none',

    /** Sombra suave - Para tarjetas, contenedores */
    soft: '0 6px 20px rgba(0, 0, 0, 0.06)',

    /** Sombra elevada - Para modales, dropdowns */
    elevated: '0 10px 30px rgba(0, 0, 0, 0.10)',

    /** Sombra de marca - Para botones hover con color de marca */
    brand: '0 8px 25px rgba(229, 106, 44, 0.15)',

    /** Sombra de botón - Para elementos interactivos */
    button: '0 4px 14px rgba(0, 0, 0, 0.08)',
} as const;

// =============================================================================
// ✍️ TIPOGRAFÍA
// =============================================================================
// Configuración de fuentes. Las fuentes se cargan en layout.tsx.

export const typography = {
    /** Fuente para encabezados */
    fontHeading: 'var(--font-tango-sans)',

    /** Fuente para cuerpo de texto */
    fontBody: 'var(--font-creato-display)',

    /** Tamaños de fuente */
    sizes: {
        xs: '0.75rem',     // 12px
        sm: '0.875rem',    // 14px
        base: '1rem',      // 16px
        lg: '1.125rem',    // 18px
        xl: '1.25rem',     // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
        '5xl': '3rem',     // 48px
    },
} as const;

// =============================================================================
// 📏 ESPACIADO PERSONALIZADO
// =============================================================================
// Espaciados adicionales que no están en la escala default de Tailwind.

export const spacing = {
    '18': '4.5rem',  // 72px
    '22': '5.5rem',  // 88px
} as const;

// =============================================================================
// 🖼️ ASSETS Y LOGOS
// =============================================================================
// Rutas a logos e imágenes de marca. Cambia estas rutas para usar tus propios
// logos.

export const assets = {
    /** Logo compacto (header) */
    logoCompact: '/images/logos/logo_compacto.png',

    /** Logo completo */
    logoFull: '/images/logos/logo_full.png',

    /** Favicon */
    favicon: '/images/favicon/favicon.ico',

    /** Placeholder para productos sin imagen */
    productPlaceholder: '/images/placeholder-product.png',
} as const;

// =============================================================================
// ⚙️ CONFIGURACIÓN DE LAYOUT
// =============================================================================
// Configuración general del layout.

export const layout = {
    /** Ancho máximo del contenedor principal */
    maxWidth: '1280px',

    /** Padding horizontal del contenedor en móvil */
    containerPaddingMobile: '1rem',

    /** Padding horizontal del contenedor en desktop */
    containerPaddingDesktop: '2rem',

    /** Altura del header */
    headerHeight: '80px',
} as const;

// =============================================================================
// 🎬 ANIMACIONES
// =============================================================================
// Duraciones y easings para animaciones.

export const animations = {
    /** Duración rápida - Para hovers, feedbacks inmediatos */
    durationFast: '150ms',

    /** Duración normal - Para transiciones de estado */
    durationNormal: '200ms',

    /** Duración lenta - Para modales, overlays */
    durationSlow: '300ms',

    /** Easing para entradas */
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',

    /** Easing para salidas */
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',

    /** Easing para entrada y salida */
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// =============================================================================
// 📱 BREAKPOINTS
// =============================================================================
// Puntos de quiebre para responsive design. Estos deben coincidir con Tailwind.

export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// =============================================================================
// EXPORTACIÓN PRINCIPAL
// =============================================================================
// Objeto principal que agrupa toda la configuración del tema.

export const theme = {
    colors: {
        brand: brandColors,
        text: textColors,
        ui: uiColors,
    },
    borderRadius,
    shadows,
    typography,
    spacing,
    assets,
    layout,
    animations,
    breakpoints,
} as const;

export default theme;
