"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ELASTIC_OUT_SPRING, POWER3_IN } from "../lib/easings";
import { SendIcon } from "./icons/send";
import { BotMessageSquareIcon } from "./icons/bot-message-square";
import { XIcon } from "./icons/x";
import { ActivityIcon } from "./icons/activity";
import { HistoryIcon } from "./icons/history";
import ChatVortex from "./ChatVortex";
import type { AnimatedIconHandle } from "./icons/card-icon";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const GREETING: ChatMessage = {
  role: "assistant",
  text: "Hi, I'm VEGA — Umar's portfolio assistant. Ask me about his projects, skills, or experience.",
};

// Openers offered while the transcript is still just the greeting. A blank
// prompt box is the hardest thing to answer on a phone, where typing is the
// expensive part — these turn the first turn into a tap.
const SUGGESTIONS = [
  "What has Umar built?",
  "What's his tech stack?",
  "Where has he worked?",
  "How do I reach him?",
] as const;

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
  const resetRef = useRef<AnimatedIconHandle>(null);

  // New messages always push the transcript into view.
  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  // The trigger button lives in the cockpit tray (top nav) now, not here —
  // it flips us open/closed via this event and reads our state back via
  // "holochat-state" so its own icon/highlight can track us.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("holochat-state", { detail: { open: isOpen } }));
  }, [isOpen]);

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

  // Escape closes, the way every other dismissible surface on the web does.
  // Bound to the document rather than the panel so it works while focus is
  // anywhere inside — including the input, which swallows key events that
  // never bubble past it in some mobile browsers.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const resetConversation = () => {
    setMessages([GREETING]);
    setInput("");
    inputRef.current?.focus();
  };

  // Takes the text explicitly so a suggestion chip can send without first
  // round-tripping through the input's state.
  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
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
      // Hand the caret straight back, so a conversation is a run of typing
      // rather than a click-to-focus before every question.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const showSuggestions = messages.length === 1 && !isSending;

  return (
    // pointer-events-none on the shell: this container is sized to fit the
    // chat panel, so even with the panel hidden (or closed via GSAP, still
    // occupying layout) its footprint would swallow clicks meant for
    // whatever's underneath. Only the panel itself opts back in below — the
    // trigger now lives in the cockpit tray, not here.
    //
    // Pinned to both edges on phones so the panel can run the full width of
    // the screen as a bottom sheet, and released back to the right edge from
    // `sm` up, where it is a floating window again.
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-end sm:left-auto sm:right-6 sm:bottom-6">

      {/* --- Chat Window ---
         Sized against the viewport, not fixed pixels: a 500px-tall panel
         overflowed the top of a 440px landscape phone and cut off the header.
         Heights are in dvh rather than vh so the opening mobile keyboard
         shrinks the panel instead of pushing its input off-screen. Same
         glass-panel language as the rest of the site (SectionContent,
         CallbackForm, the cockpit tray): dark slate, soft white borders,
         backdrop blur — no separate neon theme of its own. */}
      <motion.div
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.8,
          y: isOpen ? 0 : 40,
        }}
        transition={isOpen ? ELASTIC_OUT_SPRING : { duration: 0.4, ease: POWER3_IN }}
        style={{
          transformOrigin: "bottom right",
          pointerEvents: isOpen ? "auto" : "none",
        }}
        role="dialog"
        aria-label="VEGA portfolio assistant"
        aria-modal="false"
        className="relative mb-3 flex h-[min(560px,74dvh)] w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-[0_24px_60px_rgba(2,8,23,0.6)] backdrop-blur-xl sm:mb-5 sm:h-[min(660px,76dvh)] sm:w-[420px] lg:h-[min(720px,78dvh)] lg:w-[460px]"
      >
        {/* Accretion disk behind the conversation. Masked off toward the
           bottom so it never sits under the input, and held well back in
           opacity — it is the room VEGA is speaking from, not a subject. */}
        <div className="pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(180deg,black_0%,black_62%,transparent_92%)]">
          <ChatVortex active={isOpen} />
        </div>

        {/* Header */}
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-300/20 bg-(--accent)/15 text-sky-200">
              <BotMessageSquareIcon size={17} />
              {/* Online pip — the one piece of chrome that says this is a live
                 thing rather than a static panel. */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-sky-50">VEGA</p>
              <p className="text-[11px] text-slate-400">Portfolio assistant</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ActivityIcon
              ref={transmitRef}
              size={14}
              className="mr-1 rotate-90 text-sky-300/70"
              aria-label="Transmission status"
            />
            <button
              type="button"
              onClick={resetConversation}
              onMouseEnter={() => resetRef.current?.startAnimation()}
              onMouseLeave={() => resetRef.current?.stopAnimation()}
              aria-label="Start a new conversation"
              title="New conversation"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-sky-100"
            >
              <HistoryIcon ref={resetRef} size={15} />
            </button>
            <button
              type="button"
              onClick={toggleChat}
              onMouseEnter={() => closeRef.current?.startAnimation()}
              onMouseLeave={() => closeRef.current?.stopAnimation()}
              aria-label="Close VEGA"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-sky-100"
            >
              <XIcon ref={closeRef} size={15} />
            </button>
          </div>
        </div>

        {/* Messages Area — user gets a filled bubble, assistant reads as
           plain text (no bubble), matching the shadcn-style chat pattern:
           the assistant's voice is the surface, not a boxed-in reply.
           aria-live so a screen reader hears replies as they land. */}
        <div
          ref={messagesRef}
          aria-live="polite"
          className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scroll-smooth p-4"
        >
          {messages.map((m, i) =>
            m.role === "assistant" ? (
              <p
                key={i}
                className="max-w-[92%] whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100/90 sm:text-sm"
              >
                {m.text}
              </p>
            ) : (
              <div
                key={i}
                className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-sky-300/20 bg-(--accent)/15 px-4 py-2.5"
              >
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-sky-50 sm:text-sm">
                  {m.text}
                </p>
              </div>
            ),
          )}
          {isSending && (
            <span className="flex gap-1 py-1" aria-label="VEGA is typing">
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

        {/* Openers — only while the conversation hasn't started. They sit
           above the input rather than in the transcript so they read as
           controls, and they disappear for good on the first real turn. */}
        {showSuggestions && (
          <div className="relative z-10 flex shrink-0 flex-wrap gap-2 px-4 pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void sendMessage(s)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 transition-colors hover:border-sky-300/40 hover:bg-(--accent)/10 hover:text-sky-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="relative z-10 shrink-0 border-t border-white/10 p-3 sm:p-4"
        >
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message VEGA..."
              aria-label="Message VEGA"
              autoComplete="off"
              // iOS zooms the whole page in on focus for any input under 16px,
              // and never zooms back out — hence text-base on phones, dropping
              // to the panel's own scale from `sm` up where no such rule
              // applies. enterKeyHint puts "send" on the virtual keyboard
              // instead of a newline arrow.
              enterKeyHint="send"
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3 pl-4 pr-12 text-base text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-sky-300/50 focus:bg-white/[0.06] sm:py-2.5 sm:text-sm"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={isSending || !input.trim()}
              onMouseEnter={() => sendRef.current?.startAnimation()}
              onMouseLeave={() => sendRef.current?.stopAnimation()}
              className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-(--accent) text-slate-950 transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-40 sm:h-8 sm:w-8"
            >
              <SendIcon ref={sendRef} size={15} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
