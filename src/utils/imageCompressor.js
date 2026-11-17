/**
 * Compresse et redimensionne une image côté client via HTMLCanvasElement.
 * - Retourne tel quel les fichiers non-images (ex: PDF).
 * - Ne dépasse jamais maxDimension (1280px par défaut) sur le plus grand côté, sans agrandir les images plus petites.
 * - Convertit en JPEG qualité 0.80 (~150-250 Ko).
 *
 * @param {File} file
 * @param {{ maxDimension?: number, maxWidth?: number, maxHeight?: number, quality?: number, fileName?: string }} [options]
 * @returns {Promise<File>}
 */
export async function compressImage(file, options = {}) {
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
    return file;
  }

  // Éviter de corrompre des SVG vectoriels
  if (file.type === 'image/svg+xml') {
    return file;
  }

  const maxDimension = Number.isFinite(options.maxDimension) ? options.maxDimension : 1280;
  const maxWidth = Number.isFinite(options.maxWidth) ? options.maxWidth : maxDimension;
  const maxHeight = Number.isFinite(options.maxHeight) ? options.maxHeight : maxDimension;
  const quality = typeof options.quality === 'number' ? options.quality : 0.8;

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = objectUrl;
    });

    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;

    if (!originalWidth || !originalHeight) {
      return file;
    }

    // Ratio <= 1 pour ne jamais agrandir une image plus petite que 1280px
    const ratio = Math.min(1, maxWidth / originalWidth, maxHeight / originalHeight);
    const targetWidth = Math.max(1, Math.round(originalWidth * ratio));
    const targetHeight = Math.max(1, Math.round(originalHeight * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }

    // Fond blanc pour éviter les fonds noirs lors de la conversion PNG transparent -> JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const compressedBlob = await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    });

    if (!compressedBlob) {
      return file;
    }

    const baseName = (file.name || `photo_${Date.now()}`).replace(/\.[^/.]+$/, '');
    const outputFileName = options.fileName || `${baseName}.jpg`;

    return new File([compressedBlob], outputFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('Compression image ignorée (fallback fichier original) :', err);
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default compressImage;
