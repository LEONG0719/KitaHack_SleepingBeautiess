'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mood = 'happy' | 'neutral' | 'tired';

interface BuddyContext {
  name: string;
  photoURL: string;
  mood: Mood;
  vitality: number;
  level: number;
  streak: number;
  goals: string;
  campus: string;
  favoriteCuisine: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  timestamp: Date;
}

interface BuddyChatProps {
  buddyContext: BuddyContext;
}

const moodAccent: Record<Mood, { color: string; bg: string; border: string; bubbleBg: string }> = {
  happy:   { color: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-200', bubbleBg: 'bg-emerald-50' },
  neutral: { color: '#f59e0b', bg: 'bg-amber-500',   border: 'border-amber-200',   bubbleBg: 'bg-amber-50'   },
  tired:   { color: '#94a3b8', bg: 'bg-slate-500',   border: 'border-slate-200',   bubbleBg: 'bg-slate-50'   },
};

// Quick prompt suggestions per mood
const quickPrompts: Record<Mood, string[]> = {
  happy:   ['What should I eat today? 🍛', 'Give me a healthy tip!', 'I hit my streak! 🔥'],
  neutral: ["What's a balanced meal?", 'Recommend campus food lah', 'How to boost energy?'],
  tired:   ["I'm too tired to cook…", 'Easy healthy snacks?', 'Help me wake up! ☕'],
};

function TypingIndicator({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-emerald-100 flex items-center justify-center text-xs">🐱</div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-gray-100 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: accentColor,
                animation: `typingDot 1.2s ${i * 0.2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes typingDot {
          0%,60%,100% { transform:translateY(0);    opacity:0.4; }
          30%          { transform:translateY(-4px); opacity:1; }
        }
      `}</style>
    </div>
  );
}

export default function BuddyChat({ buddyContext }: BuddyChatProps) {
  const { mood } = buddyContext;
  const accent = moodAccent[mood];

  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unread,    setUnread]    = useState(0);

  const inputRef     = useRef<HTMLInputElement>(null);
  const initialized  = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🔥 "Polite" Scroll Logic: Stays inside the container, doesn't pull the whole page down
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest" 
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const greetings: Record<Mood, string> = {
        happy:  `Wah, boss! You look great today! Ready to eat healthy? 😺✨`,
        neutral: `Heyyy~ friend, jom chat with me lah! Ask me anything about food 🍵`,
        tired:  `Psst… I'm sleepy too leh… but I'm here for you 😴💤`,
    };

    const greeting: ChatMessage = {
      id:        'greeting',
      role:      'assistant',
      content:   greetings[mood],
      timestamp: new Date(),
    };

    setTimeout(() => {
      setMessages([greeting]);
      if (!isOpen) setUnread(1);
    }, 600);
  }, [mood, isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id:        `u-${Date.now()}`,
      role:      'user',
      content:   text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.length > 0 
        ? [...messages, userMsg]
            .filter((m) => m.id !== 'greeting')
            .slice(-8)
            .map((m) => ({ role: m.role, content: m.content }))
        : [{ role: 'user', content: text.trim() }];

      const res = await fetch('/api/buddy-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages:     history,
          buddyContext,
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id:        `a-${Date.now()}`,
        role:      'assistant',
        content:   data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [...prev, {
        id:        `err-${Date.now()}`,
        role:      'assistant',
        content:   'Aiyo, connection problem lah… try again? 😅',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, buddyContext, isLoading, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
  
    useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest" // 🔥 This is the magic part that stops the page jump!
        });
    }
    }, [messages]);

  return (
    <div className="relative w-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── COLLAPSED STATE ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'w-full flex items-center gap-3 bg-white border rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all text-left group',
            accent.border
          )}
        >
          <div className="w-10 h-10 rounded-full border-2 border-white shadow bg-emerald-100 flex items-center justify-center text-xl flex-shrink-0"
               style={{ borderColor: accent.color }}>
            🐱
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: accent.color }}>
                Buddy Says
            </p>
            {messages.length > 0 ? (
                <p className="text-sm font-semibold text-gray-700 truncate">
                {messages[messages.length - 1].content}
                </p>
            ) : (
                <p className="text-sm text-gray-400 italic">Starting up…</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {unread > 0 && (
              <span className={cn('w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center', accent.bg)}>
                {unread}
              </span>
            )}
            <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
          </div>
        </button>
      )}

      {/* ── EXPANDED CHAT PANEL ── */}
      {isOpen && (
        <div className={cn('bg-white border rounded-[1.5rem] overflow-hidden shadow-lg flex flex-col transition-all', accent.border)}
          style={{ height: '420px' }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: `${accent.color}22`, background: `${accent.color}08` }}>
              <div className="w-9 h-9 rounded-full border-2 border-white shadow bg-emerald-100 flex items-center justify-center text-xl flex-shrink-0"
                  style={{ borderColor: accent.color }}>
                  🐱
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 leading-none">Buddy</p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: accent.color }}>
                  {isLoading ? 'typing…' : 'online'}
                  </p>
              </div>
              <button onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Container */}
            <div 
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth"
            >
                {messages.map((msg) => {
                  const isBuddy = msg.role === 'assistant' || msg.role === 'model';
                  return (
                    <div key={msg.id} className={cn('flex items-end gap-2 mb-3', !isBuddy ? 'flex-row-reverse' : 'flex-row')}>
                      {isBuddy ? (
                          <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-emerald-100 flex items-center justify-center text-lg flex-shrink-0 z-10">
                            🐱
                          </div>
                      ) : (
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center z-10">
                            {buddyContext.photoURL ? (
                                <img src={buddyContext.photoURL} alt="Me" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] font-bold text-gray-400">ME</span>
                            )}
                          </div>
                      )}

                      <div className={cn('flex flex-col gap-1 min-w-0', !isBuddy ? 'items-end' : 'items-start')}>
                          <div className={cn(
                          'px-4 py-2.5 rounded-2xl text-sm font-medium max-w-[240px] sm:max-w-[280px] leading-relaxed shadow-sm break-words',
                          isBuddy
                              ? `${accent.bubbleBg} text-gray-800 rounded-bl-sm border ${accent.border}`
                              : 'text-white rounded-br-sm shadow-md'
                          )}
                          style={!isBuddy ? { background: `linear-gradient(135deg, ${accent.color}ee, ${accent.color}99)` } : {}}>
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-gray-300 px-1">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
                {isLoading && <TypingIndicator accentColor={accent.color} />}
                {/* 🔥 The scroll anchor */}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-hide">
                {quickPrompts[mood].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className={cn(
                      'flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all hover:shadow-sm active:scale-95',
                      accent.bubbleBg, accent.border
                    )}
                    style={{ color: accent.color }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className={cn('flex items-center gap-2 px-4 py-3 border-t flex-shrink-0', accent.border)}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Chat with Buddy…`}
                disabled={isLoading}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-current focus:ring-2 focus:ring-offset-0 disabled:opacity-50 transition-all"
                style={{ '--tw-ring-color': `${accent.color}33` } as React.CSSProperties}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-all active:scale-95 disabled:opacity-40 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.color}99)` }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
        </div>
      )}
    </div>
  );
}