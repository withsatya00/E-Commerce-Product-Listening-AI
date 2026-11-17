"use client";

import React, { useState } from "react";
import { ChatWindow } from "./ChatWindow";

interface ChatWidgetProps {
  apiUrl?: string;
}

export function ChatWidget({ apiUrl = "/api/v1/chat" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="mb-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <ChatWindow onClose={() => setIsOpen(false)} apiUrl={apiUrl} />
        </div>
      )}

      {/* Floating Action Bubble */}
      <div className="flex items-center gap-3">
        {/* Helper Notification Pill */}
        {!isOpen && showTooltip && (
          <div className="hidden sm:flex items-center gap-2 bg-white text-slate-800 text-xs font-semibold py-2 px-3.5 rounded-2xl shadow-lg border border-slate-200/80 animate-bounce duration-1000">
            <span>✨ Need help? Track order or search items!</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="text-slate-400 hover:text-slate-600 text-[10px]"
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating Bubble Button */}
        <button
          onClick={() => {
            setIsOpen((prev) => !prev);
            setShowTooltip(false);
          }}
          className="relative bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-full p-3.5 shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center border-2 border-white focus:outline-none focus:ring-4 focus:ring-indigo-300"
          aria-label="Toggle Shopping Assistant Chatbot"
        >
          {isOpen ? (
            <span className="text-xl leading-none">✕</span>
          ) : (
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-xl">💬</span>
              <span className="text-xs font-bold tracking-tight hidden sm:inline">Ask AI</span>
            </div>
          )}

          {/* Active Status Beacon */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
        </button>
      </div>
    </div>
  );
}

export default ChatWidget;
