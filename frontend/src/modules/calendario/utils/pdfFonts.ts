/**
 * Con html2canvas `foreignObjectRendering` el DOM se serializa a una imagen SVG, y ahí las fuentes
 * web (Inter, Font Awesome) no existen: se usa una fuente de respaldo más ancha y los iconos salen
 * como cuadrados. Este helper descarga esas hojas de estilo y devuelve un <style> con las fuentes
 * incrustadas como data URI, para inyectarlo dentro del nodo que se captura.
 */
const FONT_STYLESHEETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Outfit:wght@400;700;900&display=swap',
];

let cachedCss: Promise<string> | null = null;

const blobToDataUri = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const inlineFontFaces = async (sheetUrl: string): Promise<string> => {
  const css = await (await fetch(sheetUrl)).text();
  const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? [];

  // Descargas en paralelo: en serie cada fuente sumaba una ida y vuelta de red.
  const out = await Promise.all(blocks.map(async (block) => {
    // Google Fonts parte cada familia en subconjuntos; solo se necesita el latino (U+0000-00FF).
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
    if (range && !range.includes('U+0000-00FF')) return '';

    const urlMatch = block.match(/url\((['"]?)([^)'"]+\.woff2)\1\)/);
    if (!urlMatch) return '';
    const fontUrl = new URL(urlMatch[2], sheetUrl).href;
    try {
      const dataUri = await blobToDataUri(await (await fetch(fontUrl)).blob());
      return block.replace(/src:[^;]+;/, `src: url(${dataUri}) format('woff2');`);
    } catch {
      // Si una fuente no se puede descargar se omite; el resto sigue funcionando.
      return '';
    }
  }));
  return out.filter(Boolean).join('\n');
};

/** CSS con @font-face incrustados (se descarga una sola vez). */
export const getEmbeddedFontCss = (): Promise<string> => {
  if (!cachedCss) {
    cachedCss = Promise.all(FONT_STYLESHEETS.map(inlineFontFaces))
      .then(parts => parts.join('\n'))
      .catch(() => {
        cachedCss = null;
        return '';
      });
  }
  return cachedCss;
};
