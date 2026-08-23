/**
 * ABP (Análisis de Posesión de Balón) - Field Image Loader
 * Maneja la carga de imágenes de campos de ataque y defensa en el canvas
 */

// Importar las imágenes directamente
import ataqueImage from '../assets/campos/ataque/campo.svg';
import defensaImage from '../assets/campos/defensa/campo.svg';

export function initializeABPLoader() {
  console.log('ABP: Inicializando ABP Loader...');

  const loadAtaqueBtn = document.getElementById('loadAtaque');
  const loadDefensaBtn = document.getElementById('loadDefensa');
  const backgroundImage = document.getElementById('backgroundImage');
  const stage = document.getElementById('stage');

  if (!loadAtaqueBtn) {
    console.warn('ABP: Botón de Ataque no encontrado');
  }
  if (!loadDefensaBtn) {
    console.warn('ABP: Botón de Defensa no encontrado');
  }
  if (!backgroundImage) {
    console.warn('ABP: Elemento backgroundImage no encontrado');
  }

  if (!loadAtaqueBtn || !loadDefensaBtn || !backgroundImage) {
    console.warn('ABP: Elementos necesarios no encontrados');
    return;
  }

  console.log('ABP: Todos los elementos encontrados. Vinculando eventos...');

  // Imagen de ataque (campo completo, vista superior)
  loadAtaqueBtn.addEventListener('click', () => {
    console.log('ABP: Click en botón Ataque');
    loadFieldImage('ataque');
  });

  // Imagen de defensa (media cancha de defensa, vista superior)
  loadDefensaBtn.addEventListener('click', () => {
    console.log('ABP: Click en botón Defensa');
    loadFieldImage('defensa');
  });

  function loadFieldImage(type) {
    const imageUrl = type === 'ataque' ? ataqueImage : defensaImage;

    if (!imageUrl) {
      console.warn(`ABP: No se encontró imagen para tipo "${type}"`);
      return;
    }

    console.log(`ABP: Cargando imagen de ${type} desde:`, imageUrl);

    // Ocultar cualquier video anterior
    const youtubePlayer = document.getElementById('youtubePlayer');
    if (youtubePlayer) {
      youtubePlayer.classList.remove('is-visible');
    }

    // Cargar la imagen de fondo en el canvas
    backgroundImage.src = imageUrl;
    backgroundImage.classList.add('is-visible');

    // Esperar a que la imagen se cargue
    backgroundImage.onload = () => {
      console.log(`ABP: Imagen de ${type} cargada exitosamente`);
    };

    backgroundImage.onerror = () => {
      console.error(`ABP: Error al cargar imagen de ${type} desde:`, imageUrl);
    };

    // Hacer visible el lienzo y mostrar la imagen
    if (stage) {
      stage.classList.add('abp-mode');
    }

    // Cambiar etiqueta de fuente
    const sourceLabel = document.getElementById('sourceLabel');
    if (sourceLabel) {
      sourceLabel.textContent = type === 'ataque' ? 'Campo de Ataque' : 'Campo de Defensa';
    }
  }
}

// Exportar para uso global si es necesario
if (typeof window !== 'undefined') {
  window.ABPLoader = { initializeABPLoader };
}
