import type { Config } from 'tailwindcss';
import {
  brandColors,
  textColors,
  uiColors,
  borderRadius,
  shadows,
  spacing
} from './lib/theme/config';

/**
 * =====================================================
 * ⚙️ CONFIGURACIÓN DE TAILWIND CSS
 * =====================================================
 * 
 * Este archivo conecta Tailwind con la configuración del tema.
 * 
 * 📍 PARA PERSONALIZAR LA APLICACIÓN:
 * - Colores, radios, sombras → Edita lib/theme/config.ts
 * - Fuentes → Edita app/layout.tsx
 * - Variables CSS → Edita app/globals.css
 * 
 * 💡 Este archivo normalmente NO necesita modificaciones.
 *    Solo edítalo si necesitas agregar plugins o cambiar la estructura.
 */

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ===========================================
      // FUENTES
      // ===========================================
      fontFamily: {
        'tango-sans': ['var(--font-tango-sans)', 'system-ui', 'sans-serif'],
        'creato-display': ['var(--font-creato-display)', 'system-ui', 'sans-serif'],
      },

      // ===========================================
      // COLORES
      // Los valores vienen de lib/theme/config.ts
      // ===========================================
      colors: {
        // Colores de sistema (para compatibilidad con shadcn/ui)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // =========================================
        // 🎨 COLORES DE MARCA
        // Edita estos en lib/theme/config.ts
        // =========================================
        'brand-primary': brandColors.primary,
        'brand-secondary': brandColors.secondary,
        'brand-accent': brandColors.accent,
        'brand-cream': brandColors.cream,
        'brand-dark-blue': brandColors.darkBlue,
        'brand-white': brandColors.white,

        // =========================================
        // 📝 COLORES DE TEXTO SEMÁNTICOS
        // Usa: text-heading, text-body, text-muted-custom
        // =========================================
        'heading': textColors.heading,
        'body': textColors.body,
        'muted-custom': textColors.muted,
        'text-light': textColors.light,

        // =========================================
        // 🔲 COLORES DE UI
        // =========================================
        'ui-success': uiColors.success,
        'ui-error': uiColors.error,
        'ui-warning': uiColors.warning,
        'ui-info': uiColors.info,
      },

      // ===========================================
      // BORDER RADIUS
      // Los valores vienen de lib/theme/config.ts
      // ===========================================
      borderRadius: {
        'none': borderRadius.none,
        'sm': borderRadius.sm,
        'md': borderRadius.md,
        'lg': borderRadius.lg,
        'xl': borderRadius.xl,
        'pill': borderRadius.pill,
        'full': borderRadius.full,
      },

      // ===========================================
      // SOMBRAS
      // Los valores vienen de lib/theme/config.ts
      // ===========================================
      boxShadow: {
        'none': shadows.none,
        'soft': shadows.soft,
        'elevated': shadows.elevated,
        'brand': shadows.brand,
        'button': shadows.button,
      },

      // ===========================================
      // ESPACIADO PERSONALIZADO
      // ===========================================
      spacing: {
        '18': spacing['18'],
        '22': spacing['22'],
      },

      // ===========================================
      // IMÁGENES DE FONDO
      // ===========================================
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },

      // ===========================================
      // ANIMACIONES
      // ===========================================
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
