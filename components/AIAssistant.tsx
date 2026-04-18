'use client';

import { useState, useRef, useEffect } from 'react';
import { FaRobot, FaTimes, FaPaperPlane, FaMinus, FaExpand } from 'react-icons/fa';
import { getNexusGuideResponse } from '@/lib/ai.adapter';

interface Msg { role: 'user' | 'bot'; text: string; ts?: Date; }

const SUGGESTIONS = [
  { label: 'كيف أحجز استشارة؟', icon: '📅' },
  { label: 'ما هي عملة NEX؟', icon: '💰' },
  { label: 'كيف أصبح خبيراً؟', icon: '🎓' },
  { label: 'How do I book?', icon: '🤝' },
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'bot',
      text: 'مرحباً! أنا دليل مستشاري 🤖\nكيف يمكنني مساعدتك اليوم؟\n\nHello! How can I help?',
      ts: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [msgs, open, minimized]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', text, ts: new Date() };
    setMsgs(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const newHistory = [...history, { role: 'user', parts: [{ text }] }];
      const reply = await getNexusGuideResponse(text, history);
      const botMsg: Msg = { role: 'bot', text: reply || 'عذراً، حاول مجدداً.', ts: new Date() };
      setMsgs(p => [...p, botMsg]);
      setHistory([...newHistory, { role: 'model', parts: [{ text: reply }] }]);
    } catch {
      setMsgs(p => [...p, { role: 'bot', text: '⚠️ الخدمة غير متاحة. حاول لاحقاً.', ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-20 left-4 lg:bottom-8 lg:left-8 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 glow-strong"
      style={{ background: 'var(--color-accent)' }}
      aria-label="فتح المساعد الذكي"
    >
      <FaRobot className="w-6 h-6" style={{ color: 'var(--color-text-inv)' }} />
      <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 animate-live"
        style={{ background: 'var(--color-success)', borderColor: 'var(--color-bg)' }} />
    </button>
  );

  return (
    <div
      className="fixed bottom-20 left-4 lg:bottom-8 lg:left-8 z-40 w-80 sm:w-96 rounded-3xl border shadow-2xl overflow-hidden animate-scale-in"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-glow)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: 'var(--color-accent)' }}>
        <div className="relative">
          <FaRobot className="w-6 h-6" style={{ color: 'var(--color-text-inv)' }} />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
            style={{ background: 'var(--color-success)', border: '1.5px solid var(--color-accent)' }} />
        </div>
        <div className="flex-1">
          <p className="font-black text-sm leading-tight" style={{ color: 'var(--color-text-inv)' }}>دليل مستشاري</p>
          <p className="text-xs opacity-70" style={{ color: 'var(--color-text-inv)' }}>Mostasharai Guide • نشط</p>
        </div>
        <button onClick={() => setMinimized(!minimized)}
          className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-inv)' }}>
          <FaMinus className="w-3 h-3" />
        </button>
        <button onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-inv)' }}>
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-up`}
                style={{ animationDelay: '0ms' }}>
                <div
                  className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={m.role === 'user'
                    ? {
                      background: 'var(--color-surface-2)',
                      color: 'var(--color-text)',
                      borderRadius: '6px 18px 18px 18px',
                      border: '1px solid var(--color-border)',
                    }
                    : {
                      background: 'var(--color-accent)',
                      color: 'var(--color-text-inv)',
                      borderRadius: '18px 6px 18px 18px',
                    }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-end">
                <div className="px-4 py-3 flex items-center gap-1.5"
                  style={{ background: 'var(--color-accent)', borderRadius: '18px 6px 18px 18px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        background: 'var(--color-text-inv)',
                        animationDelay: `${i * 0.15}s`,
                        opacity: 0.9
                      }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {msgs.length <= 1 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s.label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:opacity-80"
                  style={{
                    borderColor: 'rgba(0,212,255,0.25)',
                    color: 'var(--color-accent)',
                    background: 'var(--color-accent-glow)',
                  }}
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="اكتب سؤالك..."
              className="flex-1 input text-sm py-2.5"
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: 'var(--color-accent)', color: 'var(--color-text-inv)' }}
            >
              <FaPaperPlane className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
