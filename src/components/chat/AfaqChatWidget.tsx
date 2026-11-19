import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpLeft,
  Bot,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

export interface ChatRelatedEvent {
  id: string;
  title: string;
  categoryLabel: string;
  dateArabic: string;
  location: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  relatedEvents?: ChatRelatedEvent[];
}

export interface AfaqChatWidgetProps {
  onOpenEventById: (eventId: string) => void;
}

const STORAGE_KEY = 'afaq_gemini_chat_v1';

const QUICK_PROMPTS = [
  'إيه الفعاليات والورش المتاحة قريب؟',
  'أرشّحلي دورة مناسبة لتطوير مهاراتي',
  'إزاي أسجل في أي فعالية؟',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'أهلًا بك في منصة آفاق! أنا مساعدك الذكي لاكتشاف الورش والدورات والفعاليات الشبابية في الفيوم. اسألني عن أي فعالية أو مجال يهمك وسأرشّح لك الأنسب.',
};

function loadSavedMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [WELCOME_MESSAGE];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return [WELCOME_MESSAGE];
}

function renderFormattedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const AfaqChatWidget: React.FC<AfaqChatWidgetProps> = ({
  onOpenEventById,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadSavedMessages()
  );
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage write errors
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, isSending]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? inputValue).trim();
    if (!text || isSending) return;

    setError(null);
    if (!textOverride) {
      setInputValue('');
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };

    // Exclude static welcome message from API history
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        reply?: string;
        relatedEvents?: ChatRelatedEvent[];
        error?: string;
      };

      if (!res.ok || !payload.reply) {
        throw new Error(
          payload.error || 'تعذر الحصول على رد من المساعد حاليًا.'
        );
      }

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: payload.reply,
        relatedEvents: Array.isArray(payload.relatedEvents)
          ? payload.relatedEvents
          : undefined,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء التواصل مع المساعد الذكي.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    setInputValue('');
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    inputRef.current?.focus();
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const hasConversation = messages.some((m) => m.id !== 'welcome');

  return (
    <div className="fixed bottom-5 end-5 z-40 flex flex-col items-end gap-3">
      {/* Expandable Chat Dialog */}
      {isOpen && (
        <section
          role="dialog"
          aria-label="مساعد آفاق الذكي"
          className="flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-brand-800/10 bg-brand-700 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-accent-300">
                <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-ui text-small font-bold text-white">
                  مساعد آفاق الذكي
                </h2>
                <p className="truncate font-ui text-caption text-brand-100">
                  دليلك للورش والدورات في الفيوم
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {hasConversation && (
                <button
                  type="button"
                  onClick={handleResetChat}
                  disabled={isSending}
                  title="بدء محادثة جديدة"
                  aria-label="بدء محادثة جديدة"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-100 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق المساعد الذكي"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-100 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-brand-50/20">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${
                    isUser ? 'items-start' : 'items-end'
                  }`}
                >
                  <div
                    className={`flex max-w-[88%] items-start gap-2 ${
                      isUser ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    {!isUser && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-200 bg-accent-50 text-brand-700">
                        <Bot className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-small leading-[1.7] whitespace-pre-wrap break-words ${
                        isUser
                          ? 'rounded-ss-sm bg-brand-700 text-white'
                          : 'rounded-se-sm border border-slate-200 bg-white text-brand-900 shadow-xs'
                      }`}
                    >
                      {isUser ? msg.text : renderFormattedText(msg.text)}
                    </div>
                  </div>

                  {!isUser &&
                    msg.relatedEvents &&
                    msg.relatedEvents.length > 0 && (
                      <div className="flex max-w-[88%] flex-col gap-1.5 pe-9">
                        {msg.relatedEvents.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onOpenEventById(ev.id)}
                            className="flex items-center justify-between gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-start shadow-xs hover:border-accent-500 hover:bg-accent-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-ui text-caption font-bold text-brand-900">
                                {ev.title}
                              </p>
                              <p className="truncate font-ui text-[11px] text-slate-600">
                                {ev.categoryLabel} · {ev.dateArabic}
                              </p>
                            </div>
                            <ArrowUpLeft
                              className="h-4 w-4 shrink-0 text-brand-700"
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}

            {/* Starter Quick Prompts */}
            {!hasConversation && !isSending && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 font-ui text-caption font-medium text-brand-700 hover:border-accent-500 hover:bg-accent-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Loading Indicator */}
            {isSending && (
              <div className="flex items-center justify-end gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-se-sm border border-slate-200 bg-white px-3.5 py-2.5 text-small text-slate-600 shadow-xs">
                  <Loader2
                    className="h-4 w-4 animate-spin text-accent-600"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span>جارٍ التفكير...</span>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-200 bg-accent-50 text-brand-700">
                  <Bot className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-error/25 bg-red-50 px-3 py-2.5 text-caption font-ui text-error"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="border-t border-slate-200 bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                disabled={isSending}
                maxLength={1500}
                placeholder="اكتب سؤالك عن الفعاليات أو الورش..."
                aria-label="اكتب رسالتك لمساعد آفاق"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border border-slate-200 bg-brand-50/30 px-3 py-2 font-ui text-small text-brand-900 placeholder:text-slate-500 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                aria-label="إرسال الرسالة"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'إخفاء مساعد آفاق الذكي' : 'فتح مساعد آفاق الذكي'}
        className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-brand-700 px-5 py-3 font-ui text-small font-semibold text-white shadow-md hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-all cursor-pointer"
      >
        {isOpen ? (
          <X className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        ) : (
          <MessageCircle
            className="h-5 w-5 shrink-0 text-accent-300"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        <span>{isOpen ? 'إغلاق المساعد' : 'اسأل آفاق'}</span>
      </button>
    </div>
  );
};
