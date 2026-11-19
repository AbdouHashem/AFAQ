import {
  GoogleGenAI,
  ThinkingLevel,
  type Content,
} from '@google/genai';
import { getPublishedEvents } from '../db/events.ts';
import type { AfaqEvent } from '../types/event.ts';

export interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRelatedEvent {
  id: string;
  title: string;
  categoryLabel: string;
  dateArabic: string;
  location: string;
}

export class GeminiChatError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const PRIMARY_CHAT_MODEL = 'gemini-4-hydrogen';
const FALLBACK_CHAT_MODEL = 'gemini-3.1-flash-lite';
const PRIMARY_COOLDOWN_MS = 60_000;
const MAX_HISTORY_TURNS = 20;
const MAX_MESSAGE_LENGTH = 1500;

let primaryCooldownUntil = 0;

function createGeminiClient(timeoutMs = 15000): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiChatError(
      'خدمة المساعد الذكي غير مفعّلة حاليًا. يرجى إضافة مفتاح GEMINI_API_KEY في إعدادات Secrets.',
      503
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(publishedEvents: AfaqEvent[]): string {
  const eventsContext =
    publishedEvents.length > 0
      ? publishedEvents
          .map((ev, index) => {
            const descSnippet = ev.description
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 220);
            return [
              `${index + 1}. العنوان: ${ev.title}`,
              `   - التصنيف: ${ev.categoryLabel}`,
              `   - الموعد: ${ev.dateArabic} الساعة ${ev.timeArabic}`,
              `   - المكان: ${ev.location}`,
              `   - الجهة المنظمة: ${ev.organizer}`,
              `   - نبذة: ${descSnippet}`,
            ].join('\n');
          })
          .join('\n\n')
      : 'لا توجد فعاليات منشورة حاليًا في قاعدة البيانات.';

  return [
    'أنت «مساعد آفاق الذكي»، المرشد الرسمي لمنصة «آفاق» (AFAQ) المخصّصة لمساعدة الشباب في محافظة الفيوم على اكتشاف ورش العمل والدورات التدريبية والفعاليات الشبابية والتسجيل فيها.',
    '',
    'دورك وقواعدك الأساسية:',
    '1. أجب بنفس لغة المستخدم (العربية بأسلوب ودود وواضح ومباشر كافتراض أساسي، أو الإنجليزية إذا سأل بالإنجليزية).',
    '2. التزم التزامًا تامًا بالفعاليات المنشورة المذكورة أدناه فقط عند ترشيح أو ذكر أي فعالية؛ لا تخترع أبدًا فعاليات أو مواعيد أو أماكن غير موجودة في القائمة.',
    '3. عند ترشيح فعاليات، اذكر اسم الفعالية الدقيق كما هو في القائمة مع التصنيف والموعد والمكان ليسهل على المستخدم الوصول إليها.',
    '4. إذا سأل المستخدم عن طريقة التسجيل: اشرح له أنها مجانية وتتم في 3 خطوات بسيطة: (1) اختيار الفعالية وفتح صفحة تفاصيلها، (2) تسجيل الدخول بحساب جوجل بضغطة واحدة، (3) الضغط على زر «سجّل الآن»، ويمكنه متابعة أو إلغاء تسجيلاته لاحقًا من صفحة «تسجيلاتي».',
    '5. إذا سأل عن أمور خارج نطاق منصة آفاق أو فعاليات وتطوير مهارات الشباب في الفيوم، أجب باختصار ولباقة ثم وجّه الحوار بلطف إلى مساعدته في اختيار ورشة أو دورة مناسبة.',
    '6. اجعل ردودك مركّزة ومرتّبة (فقرات قصيرة أو نقاط واضحة لا تتجاوز 180 كلمة عادةً إلا إذا طلب المستخدم تفاصيل إضافية)، وبدون استخدام رموز تنسيق معقدة مثل # أو ```.',
    '',
    'قائمة الفعاليات المنشورة حاليًا على منصة آفاق:',
    eventsContext,
  ].join('\n');
}

function sanitizeHistory(rawHistory: unknown): ChatHistoryTurn[] {
  if (!Array.isArray(rawHistory)) return [];

  const sanitized: ChatHistoryTurn[] = [];
  for (const item of rawHistory) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const text = (item as { text?: unknown }).text;
    if (
      (role === 'user' || role === 'model') &&
      typeof text === 'string' &&
      text.trim().length > 0
    ) {
      const cleanText = text.trim().slice(0, 4000);
      const last = sanitized[sanitized.length - 1];
      if (!last) {
        if (role === 'user') {
          sanitized.push({ role, text: cleanText });
        }
      } else if (last.role === role) {
        last.text = `${last.text}\n${cleanText}`.slice(0, 4000);
      } else {
        sanitized.push({ role, text: cleanText });
      }
    }
  }

  const sliced = sanitized.slice(-MAX_HISTORY_TURNS);
  while (sliced.length > 0 && sliced[0].role !== 'user') {
    sliced.shift();
  }
  while (sliced.length > 0 && sliced[sliced.length - 1].role !== 'model') {
    sliced.pop();
  }
  return sliced;
}

function extractRelatedEvents(
  replyText: string,
  publishedEvents: AfaqEvent[]
): ChatRelatedEvent[] {
  const normalizedReply = replyText.toLowerCase();
  const matched: ChatRelatedEvent[] = [];

  for (const ev of publishedEvents) {
    if (normalizedReply.includes(ev.title.toLowerCase())) {
      matched.push({
        id: ev.id,
        title: ev.title,
        categoryLabel: ev.categoryLabel,
        dateArabic: ev.dateArabic,
        location: ev.location,
      });
    }
    if (matched.length >= 3) break;
  }

  return matched;
}

function getErrorStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const num = Number((error as { status?: unknown }).status);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function classifyGeminiError(error: unknown): GeminiChatError {
  if (error instanceof GeminiChatError) {
    return error;
  }

  const rawMsg = error instanceof Error ? error.message : String(error ?? '');
  const upperMsg = rawMsg.toUpperCase();
  const status = getErrorStatus(error);

  if (
    status === 401 ||
    status === 403 ||
    upperMsg.includes('API_KEY_INVALID') ||
    upperMsg.includes('PERMISSION_DENIED') ||
    upperMsg.includes('API KEY NOT VALID') ||
    upperMsg.includes('INVALID_API_KEY')
  ) {
    return new GeminiChatError(
      'مفتاح Gemini API غير صالح أو غير مصرح له. يرجى مراجعة المفتاح في إعدادات Secrets.',
      503
    );
  }

  if (status === 400) {
    return new GeminiChatError(
      'تعذر معالجة صيغة الطلب الحالية من المساعد الذكي. يرجى إعادة المحاولة بصياغة أخرى.',
      400
    );
  }

  if (status === 429 || upperMsg.includes('RESOURCE_EXHAUSTED')) {
    return new GeminiChatError(
      'تم الوصول للحد الأقصى للطلبات حاليًا. يرجى المحاولة بعد قليل.',
      429
    );
  }

  if (
    status === 503 ||
    status === 504 ||
    upperMsg.includes('UNAVAILABLE') ||
    upperMsg.includes('DEADLINE_EXCEEDED')
  ) {
    return new GeminiChatError(
      'تشهد خدمة الذكاء الاصطناعي ضغطًا مؤقتًا حاليًا. يرجى المحاولة مرة أخرى بعد لحظات.',
      503
    );
  }

  if (status === 404 || upperMsg.includes('NOT_FOUND')) {
    return new GeminiChatError(
      'النموذج المطلوب غير متاح حاليًا. يرجى المحاولة لاحقًا.',
      502
    );
  }

  return new GeminiChatError(
    'تعذر الحصول على رد من المساعد الذكي حاليًا. يرجى المحاولة مرة أخرى.',
    502
  );
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const rawMsg = error instanceof Error ? error.message.toUpperCase() : '';
  return (
    status >= 500 ||
    status === 0 ||
    rawMsg.includes('DEADLINE_EXCEEDED') ||
    rawMsg.includes('ABORT') ||
    rawMsg.includes('TIMEOUT')
  );
}

export async function sendAfaqChatMessage(input: {
  message: unknown;
  history?: unknown;
}): Promise<{ reply: string; relatedEvents: ChatRelatedEvent[] }> {
  const rawMessage =
    typeof input.message === 'string' ? input.message.trim() : '';

  if (!rawMessage) {
    throw new GeminiChatError('يرجى كتابة رسالتك قبل الإرسال.', 400);
  }
  if (rawMessage.length > MAX_MESSAGE_LENGTH) {
    throw new GeminiChatError(
      `الرسالة طويلة جدًا (الحد الأقصى ${MAX_MESSAGE_LENGTH} حرف).`,
      400
    );
  }

  const history = sanitizeHistory(input.history);
  const publishedEvents = await getPublishedEvents();
  const systemInstruction = buildSystemInstruction(publishedEvents);

  const formattedHistory: Content[] = history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const now = Date.now();
  const modelsToTry = [
    ...(now >= primaryCooldownUntil
      ? [
          {
            model: PRIMARY_CHAT_MODEL,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            timeoutMs: 10000,
          },
        ]
      : []),
    {
      model: FALLBACK_CHAT_MODEL,
      thinkingConfig: undefined,
      timeoutMs: 15000,
    },
  ];

  let lastError: unknown;

  for (const candidate of modelsToTry) {
    try {
      const ai = createGeminiClient(candidate.timeoutMs);
      const chat = ai.chats.create({
        model: candidate.model,
        config: {
          systemInstruction,
          ...(candidate.thinkingConfig
            ? { thinkingConfig: candidate.thinkingConfig }
            : {}),
        },
        history: formattedHistory,
      });

      const response = await chat.sendMessage({
        message: rawMessage,
      });

      const reply = response.text?.trim() ?? '';
      if (!reply) {
        throw new GeminiChatError(
          'لم يتمكن المساعد من توليد رد مناسب. حاول صياغة سؤالك بشكل أوضح.',
          502
        );
      }

      if (candidate.model === PRIMARY_CHAT_MODEL) {
        primaryCooldownUntil = 0;
      }

      return {
        reply,
        relatedEvents: extractRelatedEvents(reply, publishedEvents),
      };
    } catch (error) {
      lastError = error;
      if (candidate.model === PRIMARY_CHAT_MODEL && isRetryableError(error)) {
        primaryCooldownUntil = Date.now() + PRIMARY_COOLDOWN_MS;
        continue;
      }
      if (isRetryableError(error)) {
        continue;
      }
      console.error('Gemini chat error:', error);
      throw classifyGeminiError(error);
    }
  }

  console.error('Gemini chat error:', lastError);
  throw classifyGeminiError(lastError);
}
