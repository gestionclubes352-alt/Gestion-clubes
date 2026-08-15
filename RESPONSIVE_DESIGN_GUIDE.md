# Guía de Diseño Responsive - Adaptación a Diferentes Dispositivos

## Resumen de Breakpoints

| Dispositivo | Resolución | Breakpoint | Clases Tailwind |
|---|---|---|---|
| Móvil pequeño | 320×568 | `xs` | `xs:*` |
| Móvil | 640×800 | `sm` | `sm:*` |
| Tablet | 768×1024 | `md` | `md:*` |
| Portátil 13" | 1280×800 | `lg` | `lg:*` |
| Portátil 15" | 1920×1080 | `2xl` | `2xl:*` |
| Monitor 24" | 1920×1080 | `3xl` | `3xl:*` |
| Monitor 27-28" | 2560×1440 | `4xl` | `4xl:*` |
| Monitor 32" | 3840×2160 | `5xl` | `5xl:*` |

---

## Estrategia por Dispositivo

### 1. **Móvil (xs - md)**
- ✅ Bottom navigation activa
- ✅ Sidebar modal/drawer
- ✅ Contenido a pantalla completa
- ✅ Tablas con scroll horizontal
- ✅ Fuentes: 12-16px

```tsx
// Ejemplo responsive para móvil
<div className="
  px-2 sm:px-3 md:px-4
  py-2 sm:py-3 md:py-4
  text-xs sm:text-sm md:text-base
">
  Contenido escalable
</div>
```

---

### 2. **Portátil 13" (1280×800)**
- ⚠️ **Altura limitada** (800px) → scroll vertical necesario
- ✅ Sidebar visible (280px) + Contenido (1000px)
- ⚠️ Modales pueden no caber → usar `max-h-[80dvh]`
- ✅ Tablas con más columnas visibles
- Usar breakpoint `lg:` y `h-sm:`

```tsx
// Crítico para portátiles 13": considerar altura
<div className="h-[calc(100dvh-80px)] overflow-y-auto lg:h-[calc(100dvh-64px)]">
  <div className="space-y-2 lg:space-y-3">
    {/* Items con scroll si es necesario */}
  </div>
</div>
```

---

### 3. **Portátil 15-17" (1920×1080+)**
- ✅ Espacios cómodos
- ✅ Layouts de dos columnas
- ✅ Fuentes más legibles: 14-18px
- Usar breakpoint `2xl:` y `h-lg:`

```tsx
<div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 2xl:gap-6">
  <Card />
  <Card />
</div>
```

---

### 4. **Monitor 24" (1920×1080)**
- ✅ Mismo tamaño que portátil 15"
- ✅ Más espacio horizontal (sin sidebar grande)
- ✅ Layouts de 2-3 columnas
- ✅ Tablas con todas las columnas visibles
- Usar breakpoint `3xl:` y `h-lg:`

---

### 5. **Monitor 27-28" (2560×1440)**
- ✅ Espacios generosos
- ✅ Layouts de 3+ columnas
- ✅ Widgets dashboard con información abundante
- ✅ Fuentes escaladas: 16-20px
- ✅ Márgenes aumentados
- Usar breakpoint `4xl:` y `h-xl:`

```tsx
<div className="grid grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4 gap-6 4xl:gap-8">
  {items.map(item => <Widget key={item.id} {...item} />)}
</div>
```

---

### 6. **Monitor 32" (3840×2160)**
- ✅ Espacio abundante
- ✅ Layouts de 4+ columnas
- ✅ Fuentes grandes: 18-24px
- ✅ Padding generoso
- ✅ Elementos más grandes
- Usar breakpoint `5xl:`

```tsx
<div className="px-4 lg:px-8 3xl:px-12 4xl:px-16 5xl:px-20">
  <h1 className="text-2xl 2xl:text-3xl 3xl:text-4xl 4xl:text-5xl 5xl:text-6xl">
    Título escalable
  </h1>
</div>
```

---

## Mejoras Específicas por Componente

### Header
```tsx
// Responsive padding y gap
<header className="
  px-2 sm:px-3 md:px-4 lg:px-8 3xl:px-12 4xl:px-16
  gap-2 sm:gap-3 md:gap-4 lg:gap-6 3xl:gap-8
  py-2 md:py-3 lg:py-4 3xl:py-6
">
```

### Sidebar
```tsx
// Ancho responsive (pero mejor mantener fijo en lg+)
<aside className={`
  ${isCollapsed ? 'w-[72px]' : 'w-[280px]'}
  3xl:w-[300px]  // Más ancho en monitores grandes
  4xl:w-[320px]
  5xl:w-[360px]
`}>
```

### Tablas
```tsx
// Overflow con scroll suave en móvil/tablet
<div className="overflow-x-auto lg:overflow-x-visible">
  <table className="
    text-xs sm:text-sm md:text-base lg:text-sm 2xl:text-base 3xl:text-lg 4xl:text-xl
    [&_th]:py-2 md:[&_th]:py-3 lg:[&_th]:py-2 2xl:[&_th]:py-3 3xl:[&_th]:py-4
    [&_td]:py-1.5 md:[&_td]:py-2 lg:[&_td]:py-1.5 2xl:[&_td]:py-2 3xl:[&_td]:py-3
  ">
    {/* Contenido */}
  </table>
</div>
```

### Modales y Diálogos
```tsx
// Modales adaptables a altura disponible
<div className="
  max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-4rem)]
  w-[90vw] sm:w-96 md:w-[32rem] 2xl:w-[40rem] 3xl:w-[48rem] 4xl:w-[56rem]
  overflow-y-auto
">
  {/* Contenido con máximo de altura */}
</div>
```

### Cards y Widgets
```tsx
// Cards con tamaño dinámico
<div className="
  p-3 sm:p-4 md:p-5 lg:p-6 2xl:p-8 3xl:p-10 4xl:p-12
  rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-2xl
  gap-2 sm:gap-3 md:gap-4 lg:gap-6
  text-xs sm:text-sm md:text-base 2xl:text-lg 3xl:text-xl 4xl:text-2xl
">
  Contenido escalable
</div>
```

---

## Media Queries Personalizadas

### Por Altura (Crítica para Portátiles)
```tsx
// Para portátiles 13" con altura 800px
<div className="h-sm:max-h-[200px] h-md:max-h-[300px] h-lg:max-h-[400px]">
  {/* Ajusta altura del contenido según pantalla */}
</div>

// Variante con min-height
<div className="h-min-800:space-y-4 h-max-600:space-y-2">
  {/* Espaciado adaptado a altura */}
</div>
```

### Por Orientación
```tsx
// Diferentes layouts para portrait y landscape
<div className="
  grid grid-cols-1 portrait:grid-cols-1
  landscape:grid-cols-2 md:grid-cols-2
  lg:grid-cols-3
">
```

### Container Queries (Para Componentes Reutilizables)
```tsx
// Componente responsive interno sin depender de viewport
<div className="@container">
  <div className="
    grid grid-cols-1
    @md:grid-cols-2
    @lg:grid-cols-3
    @2xl:grid-cols-4
  ">
    {/* Adapta por tamaño del contenedor */}
  </div>
</div>
```

---

## Checklist de Responsividad

### ✅ Testing Essential
- [ ] Móvil 320px (iPhone SE)
- [ ] Móvil 480px (Android estándar)
- [ ] Tablet 768px (iPad)
- [ ] Laptop 1024px (MacBook 13")
- [ ] Laptop 1280px (Surface 13")
- [ ] Desktop 1920px (Monitor 24")
- [ ] Desktop 2560px (Monitor 27-28")
- [ ] Desktop 3840px (Monitor 32" / 4K)

### ✅ Validaciones por Dispositivo
- [ ] **Móvil**: sin scroll horizontal, touch targets 44px mínimo
- [ ] **Portátil 13"**: altura 800px, scroll vertical si es necesario
- [ ] **Monitor 24"+**: máximo ancho contenido < 95vw
- [ ] **Oscuro/Claro**: ambos temas en todos los tamaños
- [ ] **Impresión**: layout sin barras fijas

### ✅ Performance
- [ ] Imágenes escaladas por viewport
- [ ] Lazy loading activo en tablas largas
- [ ] Scroll suave en listas grandes
- [ ] Animations deshabilitadas en prefers-reduced-motion

---

## Ejemplos Prácticos

### Layout Adaptativo Completo
```tsx
// Componente que funciona en todos los tamaños
<div className="
  /* Móvil */
  px-3 py-4
  /* Tablet */
  sm:px-4 sm:py-5
  /* Laptop */
  lg:px-6 lg:py-6
  /* Desktop */
  2xl:px-8 2xl:py-8
  3xl:px-10 3xl:py-10
  4xl:px-12 4xl:py-12
">
  <h1 className="
    /* Base */
    text-xl font-bold
    /* Tablet+ */
    sm:text-2xl
    /* Laptop+ */
    lg:text-3xl
    /* Desktop+ */
    2xl:text-4xl
    3xl:text-5xl
    4xl:text-6xl
  ">
    Título Responsive
  </h1>

  <div className="
    /* Base: 1 col */
    grid grid-cols-1 gap-3
    /* Tablet: 2 cols */
    sm:grid-cols-2 sm:gap-4
    /* Laptop: 3 cols */
    lg:grid-cols-3 lg:gap-6
    /* Desktop grande: 4 cols */
    3xl:grid-cols-4 3xl:gap-8
    4xl:grid-cols-5 4xl:gap-10
  ">
    {items.map(item => <Card key={item.id} {...item} />)}
  </div>
</div>
```

---

## CSS Fluid/Clamp (Para Escalado Suave)

Usar `clamp()` para interpolación suave sin saltos en breakpoints:

```css
/* Padding que crece con viewport */
padding: clamp(0.75rem, 2vw, 2rem);

/* Font que crece continuamente */
font-size: clamp(0.875rem, 1.5vw, 1.75rem);

/* Width máximo del contenido */
max-width: clamp(320px, 100%, 1920px);

/* Gap entre items */
gap: clamp(0.5rem, 1.5vw, 2rem);
```

---

## Notas Importantes

1. **Portátiles 13"**: La altura (800px) es el factor limitante. Siempre prever scroll vertical.
2. **Monitores 4K (3840×2160)**: Aumentar fuentes y espacios generosamente.
3. **Sidewar**: Mantener ancho fijo en lg+, solo tamaño variable en móvil.
4. **Tablas**: Scroll horizontal obligatorio en md-, visible completo en lg+.
5. **Modales**: Considerar altura disponible con `max-h-[80dvh]`.
6. **Imágenes**: Usar `object-contain` y `max-w-full` para evitar desbordamientos.
7. **Dark mode**: Probar en todos los breakpoints.

---

## Implementación Paso a Paso

1. ✅ Agregado `tailwind.config.js` con breakpoints personalizados
2. 📝 Actualizar componentes principales (Header, Sidebar, BottomNav)
3. 🎨 Revisar tablas y listas para scroll horizontal
4. 📱 Probar en diferentes tamaños y orientaciones
5. 🖥️ Validar en monitores grandes
6. 🌙 Probar dark/light mode en todos los breakpoints
7. ⚡ Optimizar performance en móvil

---

## Testing Rápido en DevTools

```js
// En la consola del navegador
// Simular diferentes tamaños
[
  { name: 'Mobile 320', size: [320, 568] },
  { name: 'Mobile 480', size: [480, 800] },
  { name: 'Tablet 768', size: [768, 1024] },
  { name: 'Laptop 1280', size: [1280, 800] },
  { name: 'Desktop 1920', size: [1920, 1080] },
  { name: 'Desktop 2560', size: [2560, 1440] },
  { name: 'Desktop 3840', size: [3840, 2160] }
].forEach(device => {
  console.log(`%c${device.name}`, 'background: #333; color: #0f0; padding: 5px;');
  window.resizeTo(device.size[0], device.size[1]);
});
```
