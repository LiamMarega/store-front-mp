# 🎨 Guía de Personalización del Tema

Esta guía explica cómo personalizar la apariencia de la aplicación Florida Home Furniture.

---

## 📁 Archivos Importantes

| Archivo | ¿Qué modificar? |
|---------|-----------------|
| `lib/theme/config.ts` | **Colores, radios, sombras, logos** - Archivo principal |
| `app/globals.css` | Variables CSS (alternativa) |
| `app/layout.tsx` | Fuentes y metadatos |

---

## 🎨 Cambiar Colores

### Opción 1: Editar `lib/theme/config.ts` (Recomendado)

```typescript
// lib/theme/config.ts
export const brandColors = {
  primary: '#E56A2C',      // ← Cambia este valor
  secondary: '#7493B2',
  accent: '#FDA46C',
  cream: '#E9E2CF',
  darkBlue: '#234465',
  white: '#FFFFFF',
};
```

### Opción 2: Editar `globals.css`

```css
:root {
  --brand-primary: #E56A2C;  /* ← Cambia este valor */
}
```

---

## 📐 Cambiar Border Radius

```typescript
// lib/theme/config.ts
export const borderRadius = {
  sm: '8px',   // Esquinas pequeñas
  md: '12px',  // Esquinas medianas
  lg: '16px',  // Esquinas grandes
  xl: '20px',  // Esquinas muy grandes
  pill: '999px', // Forma de píldora
};
```

**Uso en componentes:**
```jsx
<div className="rounded-md">...</div>
<button className="rounded-pill">...</button>
```

---

## 🌫️ Cambiar Sombras

```typescript
// lib/theme/config.ts
export const shadows = {
  soft: '0 6px 20px rgba(0, 0, 0, 0.06)',
  elevated: '0 10px 30px rgba(0, 0, 0, 0.10)',
  brand: '0 8px 25px rgba(229, 106, 44, 0.15)',
};
```

**Uso en componentes:**
```jsx
<div className="shadow-soft">...</div>
<div className="shadow-elevated">...</div>
```

---

## ✍️ Cambiar Fuentes

Las fuentes se cargan en `app/layout.tsx`:

```typescript
const tangoSans = localFont({
  src: [
    { path: '../public/fonts/tangoSans/TangoSans.ttf', weight: '400' },
    { path: '../public/fonts/tangoSans/TangoSans_Bold.ttf', weight: '700' },
  ],
  variable: '--font-tango-sans',
});
```

Para cambiar fuentes:
1. Agrega los archivos de fuente en `public/fonts/`
2. Modifica las rutas en `layout.tsx`

---

## 🖼️ Cambiar Logos

```typescript
// lib/theme/config.ts
export const assets = {
  logoCompact: '/images/logos/logo_compacto.png',
  logoFull: '/images/logos/logo_full.png',
  favicon: '/images/favicon/favicon.ico',
};
```

Para cambiar logos:
1. Reemplaza los archivos en `public/images/logos/`
2. O cambia las rutas en `config.ts`

---

## 📊 Tabla de Colores

| Nombre | Valor | Uso | Clase Tailwind |
|--------|-------|-----|----------------|
| Primary | `#E56A2C` | Botones, links, CTAs | `bg-brand-primary`, `text-brand-primary` |
| Secondary | `#7493B2` | Elementos secundarios | `bg-brand-secondary`, `text-brand-secondary` |
| Accent | `#FDA46C` | Hovers, acentos | `bg-brand-accent`, `text-brand-accent` |
| Cream | `#E9E2CF` | Fondos, bordes | `bg-brand-cream`, `border-brand-cream` |
| Dark Blue | `#234465` | Texto principal | `text-brand-dark-blue`, `bg-brand-dark-blue` |

---

## 🔧 Después de Modificar

1. **Guarda el archivo** - El navegador se actualizará automáticamente
2. **Si no ves cambios** - Reinicia el servidor: `npm run dev`
3. **Si hay errores** - Revisa la sintaxis (comillas, comas, etc.)

---

## ❓ Problemas Comunes

### Los colores no cambian
- Verifica que guardaste el archivo
- Reinicia `npm run dev`
- Limpia caché del navegador (Ctrl+Shift+R)

### Error de compilación
- Revisa que los valores HEX tengan 6 dígitos (`#E56A2C` ✓, `#E56` ✗)
- Verifica que no falten comas entre valores

### Las sombras no se ven
- Asegúrate de que el elemento tenga fondo (`bg-white`)
- Las sombras necesitan contraste con el fondo
