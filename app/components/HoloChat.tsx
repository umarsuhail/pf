"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ELASTIC_OUT_SPRING, POWER3_IN } from "../lib/easings";
import { SendIcon } from "./icons/send";
import { BotMessageSquareIcon } from "./icons/bot-message-square";
import { XIcon } from "./icons/x";
import { ActivityIcon } from "./icons/activity";
import { HistoryIcon } from "./icons/history";
import SpacetimeField from "./SpacetimeField";
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
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-end sm:left-auto sm:right-6 sm:bottom-6">
      <motion.div
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.86,
          y: isOpen ? 0 : 36,
        }}
        transition={isOpen ? ELASTIC_OUT_SPRING : { duration: 0.4, ease: POWER3_IN }}
        style={{
          transformOrigin: "bottom right",
          pointerEvents: isOpen ? "auto" : "none",
        }}
        role="dialog"
        aria-label="VEGA portfolio assistant"
        aria-modal="false"
        className="relative isolate mb-3 flex h-[min(590px,78dvh)] w-full flex-col overflow-hidden rounded-[1.75rem] border border-sky-200/20 bg-[#020716]/96 shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_30px_100px_rgba(0,0,0,0.72),0_0_80px_rgba(14,165,233,0.11)] sm:mb-5 sm:h-[min(680px,80dvh)] sm:w-[430px] lg:h-[min(720px,82dvh)] lg:w-[470px]"
      >
        {/* Lightweight depth layers: the SVG is a warped spacetime navigation
            lattice, while the nebula and frame are composited CSS surfaces. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.13),transparent_32%),radial-gradient(circle_at_88%_46%,rgba(99,102,241,0.14),transparent_42%),linear-gradient(160deg,rgba(8,20,45,0.95),rgba(2,7,22,0.98)_56%,rgba(7,5,28,0.98))]"
        />
        <div aria-hidden="true" className="vega-panel-grid pointer-events-none absolute inset-0 opacity-55" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[15%] bottom-[13%] opacity-75 [mask-image:linear-gradient(180deg,transparent_0%,black_20%,black_72%,transparent_100%)]"
        >
          <SpacetimeField active={isOpen} />
        </div>
        <div aria-hidden="true" className="vega-scanline pointer-events-none absolute inset-x-0 z-20 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[7px] rounded-[1.4rem] border border-white/[0.035]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-9 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent shadow-[0_0_14px_rgba(103,232,249,0.9)]" />

        {/* Narrow spacecraft telemetry rail. */}
        <div className="relative z-30 flex h-7 shrink-0 items-center justify-between border-b border-cyan-200/10 bg-cyan-300/[0.035] px-4 font-mono text-[8px] font-semibold uppercase tracking-[0.24em] text-cyan-100/45">
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.95)]" />
            Deep space comms
          </span>
          <span className="hidden text-cyan-100/30 min-[360px]:inline">CH 07 · ENCRYPTED</span>
          <span className="text-emerald-300/70">Signal 98%</span>
        </div>

        <header className="relative z-30 flex shrink-0 items-center justify-between gap-3 border-b border-cyan-100/10 bg-[#040b20]/70 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-200/25 bg-[radial-gradient(circle,rgba(34,211,238,0.2),rgba(37,99,235,0.08)_55%,transparent_70%)] text-cyan-100 shadow-[inset_0_0_18px_rgba(34,211,238,0.12),0_0_24px_rgba(14,165,233,0.12)]">
              <span aria-hidden="true" className="vega-orbit-ring absolute -inset-1 rounded-full border border-dashed border-cyan-200/25" />
              <BotMessageSquareIcon size={18} />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#040b20] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold tracking-[0.16em] text-cyan-50">VEGA</p>
                <span className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.18em] text-cyan-200/60">
                  Online
                </span>
              </div>
              <p className="truncate text-[11px] tracking-[0.04em] text-slate-400">Portfolio navigation intelligence</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ActivityIcon
              ref={transmitRef}
              size={14}
              className="mr-1 rotate-90 text-cyan-300/75"
              aria-label="Transmission status"
            />
            <button
              type="button"
              onClick={resetConversation}
              onMouseEnter={() => resetRef.current?.startAnimation()}
              onMouseLeave={() => resetRef.current?.stopAnimation()}
              aria-label="Start a new conversation"
              title="New conversation"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-colors hover:border-cyan-200/15 hover:bg-cyan-200/[0.06] hover:text-cyan-100"
            >
              <HistoryIcon ref={resetRef} size={16} />
            </button>
            <button
              type="button"
              onClick={toggleChat}
              onMouseEnter={() => closeRef.current?.startAnimation()}
              onMouseLeave={() => closeRef.current?.stopAnimation()}
              aria-label="Close VEGA"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-colors hover:border-cyan-200/15 hover:bg-cyan-200/[0.06] hover:text-cyan-100"
            >
              <XIcon ref={closeRef} size={16} />
            </button>
          </div>
        </header>

        <div
          ref={messagesRef}
          aria-live="polite"
          className="vega-scrollbar relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scroll-smooth px-4 py-5 sm:px-5"
        >
          {messages.map((message, index) =>
            message.role === "assistant" ? (
              <div key={index} className="max-w-[94%] self-start">
                <div className="mb-1.5 flex items-center gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-cyan-200/55">
                  <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(103,232,249,0.9)]" />
                  VEGA · Received
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-cyan-100/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.62),rgba(15,23,42,0.74))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.16)]">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100/90 sm:text-sm">
                    {message.text}
                  </p>
                </div>
              </div>
            ) : (
              <div key={index} className="max-w-[86%] self-end">
                <div className="mb-1.5 flex items-center justify-end gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-indigo-200/55">
                  Uplink · You
                  <span className="h-1 w-1 rounded-full bg-indigo-300 shadow-[0_0_6px_rgba(165,180,252,0.9)]" />
                </div>
                <div className="rounded-2xl rounded-tr-sm border border-indigo-200/20 bg-[linear-gradient(135deg,rgba(49,46,129,0.75),rgba(14,116,144,0.55))] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/95 sm:text-sm">
                    {message.text}
                  </p>
                </div>
              </div>
            ),
          )}

          {isSending && (
            <div className="max-w-[70%] self-start" aria-label="VEGA is typing">
              <div className="mb-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-cyan-200/55">
                VEGA · Decoding
              </div>
              <span className="flex w-fit gap-1.5 rounded-2xl rounded-tl-sm border border-cyan-100/10 bg-cyan-950/55 px-4 py-3">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300/75"
                    style={{ animationDelay: `${dot * 0.12}s` }}
                  />
                ))}
              </span>
            </div>
          )}

          {showSuggestions && (
            <section className="mt-2 border-t border-cyan-100/10 pt-4" aria-label="Suggested questions">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.25em] text-cyan-100/45">
                  Suggested coordinates
                </p>
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-cyan-200/20 to-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="group flex min-h-12 items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#071126]/72 px-3 py-2.5 text-left text-xs leading-snug text-slate-300 transition-[border-color,background-color,color,transform] hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-cyan-950/45 hover:text-cyan-50"
                  >
                    <span>{suggestion}</span>
                    <span className="font-mono text-[9px] text-cyan-300/35 transition-colors group-hover:text-cyan-200/80">
                      0{index + 1} ↗
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
          className="relative z-30 shrink-0 border-t border-cyan-100/10 bg-[#030919]/92 px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4"
        >
          <div className="mb-2 flex items-center justify-between px-1 font-mono text-[7px] font-semibold uppercase tracking-[0.22em] text-cyan-100/35">
            <span>Transmission console</span>
            <span className="flex items-center gap-1.5 text-emerald-300/55">
              <span className="h-1 w-1 rounded-full bg-emerald-300" /> Ready
            </span>
          </div>
          <div className="relative flex items-center rounded-2xl border border-cyan-100/15 bg-[linear-gradient(135deg,rgba(8,20,43,0.96),rgba(3,10,27,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_0_30px_rgba(14,165,233,0.06)] transition-colors focus-within:border-cyan-300/40">
            <span aria-hidden="true" className="ml-4 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/65 shadow-[0_0_7px_rgba(103,232,249,0.8)]" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask VEGA about Umar..."
              aria-label="Message VEGA"
              autoComplete="off"
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent py-3.5 pl-3 pr-2 text-base text-slate-100 placeholder:text-slate-500/80 focus:outline-none sm:py-3 sm:text-sm"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={isSending || !input.trim()}
              onMouseEnter={() => sendRef.current?.startAnimation()}
              onMouseLeave={() => sendRef.current?.stopAnimation()}
              className="mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-100/25 bg-[linear-gradient(135deg,#67e8f9,#38bdf8_52%,#818cf8)] text-slate-950 shadow-[0_0_22px_rgba(56,189,248,0.28)] transition-[transform,filter,opacity] hover:scale-[1.04] hover:brightness-110 disabled:pointer-events-none disabled:opacity-30 sm:h-9 sm:w-9"
            >
              <SendIcon ref={sendRef} size={16} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
