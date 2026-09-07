"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { ELASTIC_OUT_SPRING, POWER3_IN } from "../lib/easings";
import { SendIcon } from "./icons/send";
import { BotMessageSquareIcon } from "./icons/bot-message-square";
import { XIcon } from "./icons/x";
import { ActivityIcon } from "./icons/activity";
import type { AnimatedIconHandle } from "./icons/card-icon";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const GREETING: ChatMessage = {
  role: "assistant",
  text: "Hi, I'm VEGA — Umar's portfolio assistant. Ask me about his projects, skills, or experience.",
};

export default function HoloChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<AnimatedIconHandle>(null);
  const transmitRef = useRef<AnimatedIconHandle>(null);
  const closeRef = useRef<AnimatedIconHandle>(null);

  // New messages always push the transcript into view.
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages, isSending]);

  // The trigger button lives in the cockpit tray (top nav) now, not here —
  // it flips us open/closed via this event and reads our state back via
  // "holochat-state" so its own icon/highlight can track us.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("holochat-state", { detail: { open: isOpen } }));
  }, [isOpen]);

  // The open/close motion is declarative — see the panel's motion.div
  // `animate` prop below, driven off `isOpen`.
  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const onToggle = () => toggleChat();
    window.addEventListener("toggle-holochat", onToggle);
    return () => window.removeEventListener("toggle-holochat", onToggle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const history = messages.map((m) => ({ role: m.role, message: m.text }));
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsSending(true);
    sendRef.current?.startAnimation();
    // send.tsx's "animate" variant is a toggle state (paper plane flown off),
    // not a self-reverting keyframe loop — reset it after the flourish plays.
    setTimeout(() => sendRef.current?.stopAnimation(), 650);
    // The header status glyph draws itself in on every send — a transmission
    // blip — then settles back to its steady state on its own, since
    // activity.tsx's "animate" keyframes already end where "normal" rests.
    transmitRef.current?.startAnimation();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.message || "I'm temporarily unavailable — try again in a moment.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Message failed to send — check your connection and try again." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    // pointer-events-none on the shell: this container is sized to fit the
    // chat panel, so even with the panel hidden (still occupying layout)
    // its footprint would swallow clicks meant for whatever's underneath.
    // Only the panel itself opts back in (via its own style prop, while
    // isOpen) below — the trigger now lives in the cockpit tray, not here.
    <div className="pointer-events-none fixed bottom-3 right-3 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">

      {/* --- Chat Window ---
         Sized against the viewport, not fixed pixels: a 500px-tall panel
         overflowed the top of a 440px landscape phone and cut off the header.
         Same glass-panel language as the rest of the site (SectionContent,
         CallbackForm, the cockpit tray): dark slate, soft white borders,
         backdrop blur — no separate neon theme of its own. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 40 }}
        animate={
          isOpen
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.8, y: 40 }
        }
        transition={
          isOpen
            ? { duration: 0.6, ...ELASTIC_OUT_SPRING }
            : { duration: 0.4, ease: POWER3_IN }
        }
        style={{
          transformOrigin: "bottom right",
          pointerEvents: isOpen ? "auto" : "none",
        }}
        className="relative mb-3 flex h-[min(500px,68vh)] w-[min(360px,88vw)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-[0_24px_60px_rgba(2,8,23,0.6)] backdrop-blur-xl sm:mb-5"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-300/20 bg-(--accent)/15 text-sky-200">
              <BotMessageSquareIcon size={16} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-sky-50">VEGA</p>
              <p className="text-[11px] text-slate-400">Portfolio assistant</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ActivityIcon
              ref={transmitRef}
              size={14}
              className="rotate-90 text-sky-300/70"
              aria-label="Transmission status"
            />
            <button
              type="button"
              onClick={toggleChat}
              aria-label="Close VEGA"
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-sky-100"
            >
              <XIcon ref={closeRef} size={14} />
            </button>
          </div>
        </div>

        {/* Messages Area — user gets a filled bubble, assistant reads as
           plain text (no bubble), matching the shadcn-style chat pattern:
           the assistant's voice is the surface, not a boxed-in reply. */}
        <div
          ref={messagesRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
        >
          {messages.map((m, i) =>
            m.role === "assistant" ? (
              <p
                key={i}
                className="max-w-[92%] whitespace-pre-wrap text-sm leading-relaxed text-slate-100/90"
              >
                {m.text}
              </p>
            ) : (
              <div
                key={i}
                className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-sky-300/20 bg-(--accent)/15 px-4 py-2.5"
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-sky-50">
                  {m.text}
                </p>
              </div>
            ),
          )}
          {isSending && (
            <span className="flex gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </span>
          )}
        </div>

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="shrink-0 border-t border-white/10 p-3 sm:p-4"
        >
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message VEGA..."
              aria-label="Message VEGA"
              disabled={isSending}
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-12 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-sky-300/50 focus:bg-white/[0.06] disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={isSending || !input.trim()}
              onMouseEnter={() => sendRef.current?.startAnimation()}
              onMouseLeave={() => sendRef.current?.stopAnimation()}
              className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-(--accent) text-slate-950 transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-40"
            >
              <SendIcon ref={sendRef} size={14} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
