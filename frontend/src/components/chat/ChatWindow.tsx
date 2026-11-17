"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./types";
import { ProductCard } from "./ProductCard";
import { OrderTracker } from "./OrderTracker";

interface ChatWindowProps {
  onClose: () => void;
  apiUrl?: string;
}

export function ChatWindow({ onClose, apiUrl }: ChatWindowProps) {
  const baseChatUrl =
    apiUrl ||
    (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat`
      : "http://localhost:8000/api/v1/chat");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Namaste! 🙏 Welcome to **TradeExpress**.\n\nI can help you discover products, check live order delivery status, or explain return & shipping policies. What can I do for you today?",
      quickSuggestions: [
        "Track ORD-2026-9021",
        "Black Shirts under ₹1000",
        "Return Policy",
        "Wholesale Rates",
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate or restore session ID from sessionStorage
    let savedSess = "";
    try {
      savedSess = sessionStorage.getItem("tx_chat_session_id") || "";
    } catch {}
    if (!savedSess) {
      savedSess = `sess_${Math.random().toString(36).substring(2, 10)}`;
      try {
        sessionStorage.setItem("tx_chat_session_id", savedSess);
      } catch {}
    }
    setSessionId(savedSess);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      let res: Response;
      try {
        res = await fetch(`${baseChatUrl}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
          }),
        });
      } catch {
        res = await fetch(`/api/v1/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
          }),
        });
      }

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: "assistant",
        content: data.reply || "Aapka sawal mil gaya hai, please thoda intezaar karein.",
        products: data.products || [],
        orderStatus: data.order_status || null,
        quickSuggestions: data.quick_suggestions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content:
          "Network se connect karne me problem aayi. Please dobara try karein ya hamari customer support team (+91 98765 43210) se contact karein.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `reset_${Date.now()}`,
        role: "assistant",
        content: "Chat cleared! How can I assist you with your shopping or orders?",
        quickSuggestions: ["Black Shirts under ₹1000", "Track My Order", "Return Policy"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[560px] w-[370px] sm:w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-3.5 text-white flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-base border border-white/30">
            🤖
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-700 rounded-full" />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight tracking-tight">TradeExpress AI</h3>
            <span className="text-[11px] text-indigo-100 flex items-center gap-1">
              <span>●</span> Online Shopping Assistant
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            title="Clear Chat"
            className="p-1.5 hover:bg-white/10 rounded-lg text-xs text-indigo-100 transition-colors"
          >
            🔄
          </button>
          <button
            onClick={onClose}
            title="Minimize"
            className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-100 transition-colors font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none whitespace-pre-line"
              }`}
            >
              {m.content}
            </div>

            {/* Embedded Order Tracker Card */}
            {m.orderStatus && (
              <div className="w-full mt-1.5">
                <OrderTracker order={m.orderStatus} />
              </div>
            )}

            {/* Embedded Product Cards (Horizontal Carousel) */}
            {m.products && m.products.length > 0 && (
              <div className="w-full mt-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Suggested Products ({m.products.length})
                </span>
                <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  {m.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Suggestions Chips */}
            {m.quickSuggestions && m.quickSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {m.quickSuggestions.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-full px-2.5 py-1 transition-colors font-medium shadow-2xs"
                  >
                    {chip} →
                  </button>
                ))}
              </div>
            )}

            <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 w-fit text-xs text-slate-500 shadow-sm">
            <span className="animate-spin text-indigo-600">⌛</span>
            <span>AI is searching catalog & orders...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask product, price, or Order ID..."
          className="flex-1 bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl p-2.5 transition-colors font-bold text-xs shrink-0 shadow-sm"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
