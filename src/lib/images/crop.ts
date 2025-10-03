import { Area } from 'react-easy-crop';

/**
 * cropImage
 * Given an original File (image) and pixel area from react-easy-crop, return a new Blob cropped to that area.
 * Returns WebP by default.
 */
export async function cropImage(file: File, area: Area, targetMime: string = 'image/webp', quality = 0.92): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const bitmap = await createImageBitmap(new Blob([arrayBuffer]));

  const canvas = document.createElement('canvas');
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2d unavailable');

  ctx.drawImage(
    bitmap,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
  );

  const blob: Blob = await new Promise((res, rej) => {
    canvas.toBlob(b => b ? res(b) : rej(new Error('crop toBlob failed')), targetMime, quality);
  });
  return blob;
}
