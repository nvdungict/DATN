'use client';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { createChatSocket, ChatSocket } from '@/lib/websocket';
import type { WSMessage } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'token' | 'final' | 'error';
  loading?: boolean;
}

export default function ChatInterface({
  tripId,
  onTripUpdate,
}: {
  tripId: number;
  onTripUpdate: () => void;
}) {
  const STORAGE_KEY = `chat_history_trip_${tripId}`;
  const WELCOME_MSG: ChatMessage = {
    role: 'assistant',
    content: '👋 Hi! I can help you modify your trip, search for places, or answer travel questions. What would you like to do?',
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as ChatMessage[];
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

  // Persist to localStorage on every change (skip transient loading bubbles)
  useEffect(() => {
    const stable = messages.filter((m) => !m.loading);
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
          return [...prev.slice(0, -1), { role: 'assistant', content: msg.content, type: 'final' }];
        }
        return [...prev, { role: 'assistant', content: msg.content, type: 'final' }];
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
    <div className="flex flex-col h-full bg-black/20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <span className="text-white font-semibold text-sm">AI Travel Assistant</span>
        <button
          onClick={clearHistory}
          title="Xoá lịch sử chat"
          className="ml-auto text-slate-500 hover:text-slate-300 text-xs transition"
        >
          🗑
        </button>
        <span
          className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`}
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
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : msg.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-sm'
                  : 'bg-white/8 border border-white/10 text-slate-200 rounded-bl-sm'
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
      <div className="px-4 py-3 border-t border-white/10">
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
            placeholder="Ask me to plan, modify, or search..."
            className="flex-1 resize-none px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition self-end"
          >
            ↑
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
