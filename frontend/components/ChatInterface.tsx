'use client';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { createChatSocket, ChatSocket } from '@/lib/websocket';
import type { WSMessage } from '@/types';
import BookingModal from './BookingModal';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'token' | 'final' | 'error';
  loading?: boolean;
  metadata?: any;
}

export default function ChatInterface({
  tripId,
  onTripUpdate,
  initialPrompt,
}: {
  tripId: number;
  onTripUpdate: () => void;
  initialPrompt?: string;
}) {
  const STORAGE_KEY = `chat_history_trip_${tripId}`;
  const WELCOME_MSG: ChatMessage = {
    role: 'assistant',
    content: '👋 Hi! I can help you modify your trip, search for places, or answer travel questions. What would you like to do?',
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        // Filter out any error messages that might have been saved previously
        const validMessages = parsed.filter(m => m.type !== 'error');
        if (validMessages.length > 0) return validMessages;
      }
    } catch {}
    return [WELCOME_MSG];
  });
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const socketRef = useRef<ChatSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000); // ms, doubles on each fail (max 30s)
  const unmounted = useRef(false);
  const autoPromptSent = useRef(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingItem, setSelectedBookingItem] = useState<any>(null);
  const [bookingType, setBookingType] = useState<'FLIGHT' | 'HOTEL'>('FLIGHT');

  function openBookingModal(item: any, type: 'FLIGHT' | 'HOTEL') {
    setSelectedBookingItem(item);
    setBookingType(type);
    setBookingModalOpen(true);
  }

  function connect() {
    if (unmounted.current) return;
    const socket = createChatSocket(
      handleMessage,
      () => {
        setConnected(true);
        reconnectDelay.current = 1000; // reset on successful connect
      },
      (code: number) => {
        setConnected(false);
        setTyping(false);

        if (code === 1008) {
          // Token expired or unauthorized — stop reconnecting, prompt re-login
          setMessages((prev) => [
            ...prev.filter((m) => !m.loading),
            {
              role: 'assistant',
              content: '⚠️ Phiên đăng nhập đã hết hạn. Vui lòng **đăng xuất và đăng nhập lại** để tiếp tục.',
              type: 'error',
            },
          ]);
          return; // ← không reconnect
        }

        // Other disconnects: auto-reconnect with backoff
        if (!unmounted.current) {
          reconnectTimer.current = setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
            connect();
          }, reconnectDelay.current);
        }
      },
    );
    socketRef.current = socket;
  }

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle auto-prompt once connected
  useEffect(() => {
    if (connected && initialPrompt && !autoPromptSent.current && socketRef.current) {
      autoPromptSent.current = true;
      setMessages((prev) => [...prev, { role: 'user', content: initialPrompt }]);
      socketRef.current.send(initialPrompt, tripId);
      setTyping(true);
    }
  }, [connected, initialPrompt, tripId]);

  // Persist to localStorage on every change (skip transient loading bubbles and errors)
  useEffect(() => {
    const stable = messages.filter((m) => !m.loading && m.type !== 'error');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stable.slice(-100)));
    } catch {}
  }, [messages, STORAGE_KEY]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([WELCOME_MSG]);
  }

  function handleMessage(msg: WSMessage) {
    if (msg.type === 'token') {
      setTyping(true);
      // Update or create loading assistant message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.loading) {
          return [...prev.slice(0, -1), { ...last, content: last.content + '\n' + msg.content, loading: true }];
        }
        return [...prev, { role: 'assistant', content: msg.content, loading: true }];
      });
    } else if (msg.type === 'final') {
      setTyping(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.loading) {
          return [...prev.slice(0, -1), { role: 'assistant', content: msg.content, type: 'final', metadata: msg.metadata }];
        }
        return [...prev, { role: 'assistant', content: msg.content, type: 'final', metadata: msg.metadata }];
      });
      // Refresh trip data if itinerary was updated
      if (msg.metadata?.itinerary_items && msg.metadata.itinerary_items.length > 0) {
        onTripUpdate();
      }
    } else if (msg.type === 'error') {
      setTyping(false);
      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: 'assistant', content: `⚠️ ${msg.content}`, type: 'error' },
      ]);
    }
  }

  function sendMessage() {
    const text = input.trim();
    if (!text || !socketRef.current) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    socketRef.current.send(text, tripId);
    setInput('');
    setTyping(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // isComposing: đang trong quá trình nhập IME (tiếng Việt, Nhật, Hàn...)
    // → không submit cho đến khi composition hoàn tất
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-3xl relative">
      {/* Subtle top gradient glow */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3 relative z-10 bg-slate-900/50 backdrop-blur-md">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0 border border-white/10">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-white font-bold text-sm tracking-wide">AI Assistant</span>
          <span className="text-indigo-300/80 text-[11px] font-medium uppercase tracking-wider">Travel Copilot</span>
        </div>
        <button
          onClick={clearHistory}
          title="Clear chat history"
          className="ml-auto text-slate-600 hover:text-slate-400 text-xs transition px-2 py-1 rounded hover:bg-white/5"
        >
          Clear
        </button>
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`}
          title={connected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-sm shadow-indigo-500/20'
                  : msg.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-300 rounded-bl-sm backdrop-blur-md'
                  : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm backdrop-blur-md hover:bg-white/[0.07] transition-colors'
              } ${msg.loading ? 'animate-pulse' : ''}`}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="text-white">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                    li: ({ children }) => <li className="text-slate-300">{children}</li>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
              {msg.loading && <span className="inline-block mt-1 text-slate-500">▋</span>}
              
              {/* Render Booking Results if present */}
              {msg.metadata?.booking_results && msg.metadata.booking_results.length > 0 && (
                <div className="mt-4 space-y-3">
                  {msg.metadata.booking_results.map((item: any, idx: number) => {
                    const isFlight = !!item.flight_number;
                    const formatPrice = (price: number, currency: string) => {
                      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currency }).format(price);
                    };
                    return (
                      <div key={idx} className="bg-white/10 border border-white/20 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {isFlight ? `${item.airline} - ${item.flight_number}` : item.name}
                          </div>
                          <div className="text-xs text-indigo-200 mt-1">
                            {isFlight 
                              ? `${item.departure_airport} (${item.departure_time}) → ${item.arrival_airport} (${item.arrival_time})`
                              : item.address
                            }
                          </div>
                          <div className="font-bold text-emerald-400 text-sm mt-1">
                            {formatPrice(isFlight ? item.price : (item.total_price || item.price_per_night), item.currency)}
                          </div>
                        </div>
                        <button
                          onClick={() => openBookingModal(item, isFlight ? 'FLIGHT' : 'HOTEL')}
                          className="ml-3 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
                        >
                          Book
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {typing && !messages[messages.length - 1]?.loading && (
          <div className="flex justify-start">
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-white/10 bg-slate-900/60 backdrop-blur-md relative z-10">
        {!connected && (
          <p className="text-xs text-slate-500 mb-2 text-center">
            Connecting to AI... Make sure the backend is running.
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Type your request here..."
            className="flex-1 resize-none px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all custom-scrollbar shadow-inner"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white disabled:opacity-40 transition-all self-end flex items-center justify-center shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5 translate-x-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center font-medium uppercase tracking-widest">Enter to send · Shift+Enter for newline</p>
      </div>

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        type={bookingType}
        itemDetails={selectedBookingItem}
        tripId={tripId}
        onSuccess={(result) => {
          setBookingModalOpen(false);
          // Auto send a message thanking the user or confirming
          setMessages(prev => [...prev, { role: 'assistant', content: `✅ Đặt chỗ thành công! Mã PNR của bạn là: **${result.pnr}**. Lịch trình đã được cập nhật.`, type: 'final' }]);
          onTripUpdate();
        }}
      />
    </div>
  );
}
