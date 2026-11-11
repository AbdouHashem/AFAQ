export interface CompressedImageResult {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  originalSizeBytes: number;
  width: number;
  height: number;
}

const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024; // 15 MB pre-compression guard
const MAX_TARGET_BYTES = 450 * 1024; // 450 KB target (under 512 KB server cap)
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;

const ALLOWED_INPUT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function estimateBase64ByteSize(dataUrl: string): number {
  const base64Part = dataUrl.split(',')[1] ?? '';
  const padding = base64Part.endsWith('==')
    ? 2
    : base64Part.endsWith('=')
      ? 1
      : 0;
  return Math.max(0, Math.floor((base64Part.length * 3) / 4) - padding);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة ملف الصورة. تأكد من أن الملف صورة صالحة.'));
    };
    img.src = objectUrl;
  });
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): string {
  return canvas.toDataURL(mimeType, quality);
}

export function formatArabicFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} بايت`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} كيلوبايت`;
  }
  return `${(kb / 1024).toFixed(1)} ميجابايت`;
}

export async function compressCoverImageFile(
  file: File
): Promise<CompressedImageResult> {
  if (!ALLOWED_INPUT_TYPES.has(file.type)) {
    throw new Error(
      'صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.'
    );
  }

  if (file.size === 0) {
    throw new Error('ملف الصورة المختار فارغ.');
  }

  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error(
      'حجم الملف الأصلي كبير جدًا (الحد الأقصى قبل الضغط 15 ميجابايت).'
    );
  }

  const img = await loadImageElement(file);
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  if (!srcWidth || !srcHeight) {
    throw new Error('تعذر تحديد أبعاد الصورة.');
  }

  const scale = Math.min(1, MAX_WIDTH / srcWidth, MAX_HEIGHT / srcHeight);
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('تعذر تهيئة أداة ضغط الصور في المتصفح.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Prefer WebP for maximum compression efficiency; fallback to JPEG if unsupported
  let preferredMime = 'image/webp';
  let dataUrl = encodeCanvas(canvas, preferredMime, 0.82);
  if (!dataUrl.startsWith('data:image/webp')) {
    preferredMime = 'image/jpeg';
    dataUrl = encodeCanvas(canvas, preferredMime, 0.84);
  }

  let sizeBytes = estimateBase64ByteSize(dataUrl);
  const qualities = [0.72, 0.62, 0.52];
  for (const q of qualities) {
    if (sizeBytes <= MAX_TARGET_BYTES) break;
    dataUrl = encodeCanvas(canvas, preferredMime, q);
    sizeBytes = estimateBase64ByteSize(dataUrl);
  }

  if (sizeBytes > MAX_TARGET_BYTES) {
    throw new Error(
      'تعذر ضغط الصورة للحد المطلوب (أقل من 450 كيلوبايت). يرجى اختيار صورة أخرى.'
    );
  }

  return {
    dataUrl,
    mimeType: preferredMime,
    sizeBytes,
    originalSizeBytes: file.size,
    width: targetWidth,
    height: targetHeight,
  };
}
