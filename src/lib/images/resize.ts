/**
 * resizeImage
 * Client-side image resizing & compression using Canvas.
 * - Strips EXIF (by re-encoding)
 * - Constrains max width/height while preserving aspect ratio
 * - Accepts quality for JPEG/WebP output
 */
export interface ResizeOptions {
  maxDimension?: number; // default 512
  mimeType?: string;     // 'image/webp' | 'image/jpeg' | original fallback
  quality?: number;      // 0..1 for lossy formats
}

export async function resizeImage(file: File, opts: ResizeOptions = {}): Promise<Blob> {
  const { maxDimension = 512, mimeType, quality = 0.85 } = opts;

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer]);
  const imgBitmap = await createImageBitmap(blob);

  const { width, height } = imgBitmap;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.drawImage(imgBitmap, 0, 0, targetW, targetH);

  const format = selectOutputMime(mimeType, file.type);

  const blobOut: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), format, quality);
  });

  return blobOut;
}

function selectOutputMime(requested: string | undefined, original: string): string {
  // Prefer requested if supplied & supported
  if (requested && isSupportedOutput(requested)) return requested;
  // Fallback: if original is png and very large consider webp
  if (/image\/png/.test(original)) return 'image/webp';
  if (/image\/(jpe?g|webp)/.test(original)) return original;
  return 'image/webp';
}

function isSupportedOutput(mt: string) {
  return ['image/jpeg', 'image/webp', 'image/png'].includes(mt);
}
