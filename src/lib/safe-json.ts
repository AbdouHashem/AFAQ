export async function parseJsonResponse<T>(
  res: Response,
  fallbackErrorMessage = 'استجابة الخادم غير صالحة. يرجى المحاولة مرة أخرى.'
): Promise<T> {
  const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';
  const rawText = await res.text();
  const trimmed = rawText.trim();

  if (
    !trimmed ||
    trimmed.startsWith('<') ||
    (contentType && !contentType.includes('application/json') && !contentType.includes('+json'))
  ) {
    throw new Error(fallbackErrorMessage);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(fallbackErrorMessage);
  }
}

export async function tryParseJson<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';
  const rawText = await res.text();
  const trimmed = rawText.trim();

  if (
    !trimmed ||
    trimmed.startsWith('<') ||
    (contentType && !contentType.includes('application/json') && !contentType.includes('+json'))
  ) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}
