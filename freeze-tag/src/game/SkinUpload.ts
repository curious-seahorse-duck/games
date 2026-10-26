import { isSkinImage } from './SkinImage.mjs';

export async function prepareSkinUpload(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG, or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Skin images must be 5 MB or smaller.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('This image could not be opened. Choose another image.'); }
  try {
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width > 4096 || bitmap.height > 4096) throw new Error('Images must be at most 4096 × 4096 pixels.');
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    const ratio = Math.min(128 / bitmap.width, 128 / bitmap.height);
    const width = bitmap.width * ratio; const height = bitmap.height * ratio;
    context.drawImage(bitmap, (128 - width) / 2, (128 - height) / 2, width, height);
    const data = canvas.toDataURL('image/png');
    if (!isSkinImage(data)) throw new Error('The skin image could not be prepared. Choose another image.');
    return data;
  } finally { bitmap.close(); }
}
