import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { getDownloadURL } from 'firebase-admin/storage';
import { db } from './index.ts';
import { eventMedia } from './schema.ts';
import { adminStorage, firebaseStorageBucketName } from '../lib/firebase-admin.ts';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOCAL_MEDIA_PREFIX = '/api/media/';

export const MAX_MEDIA_BYTES = 512 * 1024; // 512 KB compressed cap

const MIME_TO_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export class MediaUploadError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function detectImageMimeFromMagicBytes(
  buf: Buffer
): 'image/webp' | 'image/jpeg' | 'image/png' | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

let cachedBucketAvailable: { checkedAt: number; available: boolean } | null =
  null;

async function isFirebaseBucketAvailable(): Promise<boolean> {
  if (!firebaseStorageBucketName) return false;
  const now = Date.now();
  if (
    cachedBucketAvailable &&
    now - cachedBucketAvailable.checkedAt < 60_000
  ) {
    return cachedBucketAvailable.available;
  }

  try {
    const [exists] = await adminStorage
      .bucket(firebaseStorageBucketName)
      .exists();
    cachedBucketAvailable = { checkedAt: now, available: exists };
    return exists;
  } catch {
    cachedBucketAvailable = { checkedAt: now, available: false };
    return false;
  }
}

export async function uploadEventCoverMedia(dataUrl: unknown): Promise<{
  url: string;
  sizeBytes: number;
  mimeType: string;
  storage: 'firebase' | 'database';
}> {
  if (typeof dataUrl !== 'string' || !dataUrl.trim()) {
    throw new MediaUploadError('بيانات الصورة مطلوبة.', 400);
  }

  const match = dataUrl
    .trim()
    .match(/^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new MediaUploadError(
      'صيغة الصورة غير مدعومة. الصيغ المسموح بها: WebP وJPEG وPNG.',
      400
    );
  }

  const declaredMime = match[1].toLowerCase();
  const base64Payload = match[2];
  const buffer = Buffer.from(base64Payload, 'base64');

  if (buffer.length === 0) {
    throw new MediaUploadError('ملف الصورة فارغ.', 400);
  }

  if (buffer.length > MAX_MEDIA_BYTES) {
    throw new MediaUploadError(
      'حجم الصورة بعد الضغط يتجاوز الحد الأقصى المسموح به (512 كيلوبايت).',
      413
    );
  }

  const detectedMime = detectImageMimeFromMagicBytes(buffer);
  if (!detectedMime || detectedMime !== declaredMime) {
    throw new MediaUploadError(
      'محتوى الملف لا يطابق صيغة صورة صالحة.',
      400
    );
  }

  // Prefer Firebase Storage when the bucket is provisioned
  if (await isFirebaseBucketAvailable()) {
    try {
      const ext = MIME_TO_EXT[detectedMime] ?? 'webp';
      const objectPath = `events/covers/${crypto.randomUUID()}.${ext}`;
      const bucket = adminStorage.bucket(firebaseStorageBucketName);
      const file = bucket.file(objectPath);

      await file.save(buffer, {
        metadata: {
          contentType: detectedMime,
          cacheControl: 'public, max-age=31536000, immutable',
        },
        resumable: false,
      });

      const downloadUrl = await getDownloadURL(file);
      return {
        url: downloadUrl,
        sizeBytes: buffer.length,
        mimeType: detectedMime,
        storage: 'firebase',
      };
    } catch (err) {
      console.warn(
        'Firebase Storage upload failed, falling back to Cloud SQL event_media:',
        err
      );
    }
  }

  try {
    const inserted = await db
      .insert(eventMedia)
      .values({
        mimeType: detectedMime,
        data: buffer,
        sizeBytes: buffer.length,
      })
      .returning({ id: eventMedia.id });

    return {
      url: `${LOCAL_MEDIA_PREFIX}${inserted[0].id}`,
      sizeBytes: buffer.length,
      mimeType: detectedMime,
      storage: 'database',
    };
  } catch (error) {
    console.error('Database error in uploadEventCoverMedia:', error);
    throw new Error('تعذر حفظ الصورة حاليًا. يرجى المحاولة مرة أخرى.', {
      cause: error,
    });
  }
}

export async function getEventMediaById(id: string): Promise<{
  mimeType: string;
  data: Buffer;
  sizeBytes: number;
} | null> {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  try {
    const rows = await db
      .select({
        mimeType: eventMedia.mimeType,
        data: eventMedia.data,
        sizeBytes: eventMedia.sizeBytes,
      })
      .from(eventMedia)
      .where(eq(eventMedia.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0];
  } catch (error) {
    console.error('Database error in getEventMediaById:', error);
    throw new Error('تعذر تحميل الصورة حاليًا.', { cause: error });
  }
}

export async function deleteEventMediaByUrl(
  url: string | null | undefined
): Promise<void> {
  if (!url) return;

  try {
    if (url.startsWith(LOCAL_MEDIA_PREFIX)) {
      const mediaId = url.slice(LOCAL_MEDIA_PREFIX.length).split('?')[0];
      if (UUID_REGEX.test(mediaId)) {
        await db.delete(eventMedia).where(eq(eventMedia.id, mediaId));
      }
      return;
    }

    if (
      firebaseStorageBucketName &&
      url.includes(`/${firebaseStorageBucketName}/o/`)
    ) {
      const encodedPath = url
        .split(`/${firebaseStorageBucketName}/o/`)[1]
        ?.split('?')[0];
      if (encodedPath) {
        const objectPath = decodeURIComponent(encodedPath);
        if (objectPath.startsWith('events/covers/')) {
          await adminStorage
            .bucket(firebaseStorageBucketName)
            .file(objectPath)
            .delete({ ignoreNotFound: true });
        }
      }
    }
  } catch (err) {
    console.warn('Non-fatal cleanup failure for media URL:', err);
  }
}
