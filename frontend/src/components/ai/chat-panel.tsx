"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { CHAT_HISTORY_TURNS } from "@/lib/api/mentor-schemas";
import { ChatReply } from "@/lib/api/schemas";
import { cleanText } from "@/lib/security/sanitize";
import { createRateLimiter } from "@/lib/security/throttle";
import { SafeMarkdown } from "@/components/ui/safe-markdown";
import { Fi } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const MAX_LEN = 2000;
const SUGGESTION_ICONS = ["bulb", "calendar-clock", "chart-line-up", "briefcase", "microphone", "book-open-cover"];

interface Msg {
  id: number;
  from: "user" | "ai";
  text: string;
  at: string;
  reply?: ChatReply;
}

const timeNow = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export function ChatPanel({
  agent,
  agentName,
  intro,
  suggestions = [],
  context = [],
  className,
  compact = false,
  onReply,
}: {
  agent: string;
  agentName: string;
  intro: string;
  suggestions?: string[];
  context?: string[];
  className?: string;
  compact?: boolean;
  /** Called after each answer, e.g. so a page can refresh progress the chat just changed. */
  onReply?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const limiter = useMemo(() => createRateLimiter(8, 60_000), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(0);
  // Unique per instance: the page chat and the mentor drawer can be mounted at the same time.
  const inputId = `chat-${useId()}`;

  const mutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: Array<{ from: "user" | "ai"; text: string }> }) =>
      apiFetch("/api/v1/ai/chat", ChatReply, { method: "POST", body: { agent, message, history } }),
    onSuccess: (reply) => {
      setMessages((m) => [...m, { id: ++idRef.current, from: "ai", text: reply.message, reply, at: timeNow() }]);
      onReply?.();
    },
    onError: (e) => setNotice(e instanceof ApiError ? e.message : "Could not reach the AI service."),
  });

  // Scroll only the message list (never the page) when new content arrives.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  // Auto-grow the composer up to ~6 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = (raw: string) => {
    const text = cleanText(raw, MAX_LEN);
    if (!text || mutation.isPending) return;
    if (!limiter.tryAcquire()) {
      setNotice(`Please wait ${Math.ceil(limiter.retryAfterMs() / 1000)}s before sending another message.`);
      return;
    }
    setNotice(null);
    // The last few turns go with the question so the answer can follow the conversation.
    const history = messages.slice(-CHAT_HISTORY_TURNS).map((m) => ({ from: m.from, text: m.text.slice(0, 4000) }));
    setMessages((m) => [...m, { id: ++idRef.current, from: "user", text, at: timeNow() }]);
    setInput("");
    mutation.mutate({ message: text, history });
  };

  return (
    <div className={cn("flex min-h-0 flex-col bg-bg/40", className)}>
      {context.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface px-4 py-2.5" aria-label="Context the agent uses">
          <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            <Fi name="layers" /> Context
          </span>
          {context.map((c) => (
            <span key={c} className="rounded-full border border-line bg-bg px-2.5 py-0.5 text-xs text-ink-2">
              {c}
            </span>
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-5", compact ? "px-3 py-4" : "px-4 py-6 sm:px-6")}>
          <AiMessage name={agentName}>
            <SafeMarkdown>{intro}</SafeMarkdown>
          </AiMessage>

          {messages.length === 0 && suggestions.length > 0 ? (
            <div className={cn("grid gap-2", compact ? "pl-0" : "pl-11 sm:grid-cols-2")}>
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="card-hover group flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left text-sm text-ink-2"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                    <Fi name={SUGGESTION_ICONS[i % SUGGESTION_ICONS.length] ?? "bulb"} />
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">{s}</span>
                  <Fi name="arrow-right" className="text-xs text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : null}

          {messages.map((m) =>
            m.from === "user" ? (
              <div key={m.id} className="animate-fade-up flex flex-col items-end gap-1">
                {/* User text is rendered as plain text — never as markdown/HTML. */}
                <p className="bg-brand-gradient max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-white shadow-md shadow-brand/15 [overflow-wrap:anywhere]">
                  {m.text}
                </p>
                <span className="pr-1 text-[11px] text-ink-3">You · {m.at}</span>
              </div>
            ) : (
              <AiMessage key={m.id} name={agentName} time={m.at} copyText={m.text}>
                <SafeMarkdown>{m.text}</SafeMarkdown>
                {m.reply ? (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                    {m.reply.sources.map((s) => (
                      <span
                        key={s.title}
                        className={cn(
                          "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                          s.kind === "institution" ? "bg-teal-soft text-teal" : "bg-surface-2 text-ink-2",
                        )}
                      >
                        <Fi name={s.kind === "institution" ? "bookmark" : "globe"} className="text-[10px]" />
                        <span className="truncate">{s.kind === "institution" ? `Institution source: ${s.title}` : s.title}</span>
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-medium text-amber">
                      <Fi name="sparkles" className="text-[10px]" /> AI-generated · {Math.round(m.reply.confidence * 100)}% confidence
                    </span>
                  </div>
                ) : null}
              </AiMessage>
            ),
          )}

          {mutation.isPending ? (
            <AiMessage name={agentName}>
              <span className="flex items-center gap-1.5 py-1" aria-label="Thinking">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-2 animate-bounce rounded-full bg-brand/60" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </span>
            </AiMessage>
          ) : null}
        </div>
      </div>

      <form
        className="border-t border-line bg-surface p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          {notice ? (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-rose" role="alert">
              <Fi name="exclamation" /> {notice}
            </p>
          ) : null}
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg p-1.5 pl-4 transition-colors focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <label htmlFor={inputId} className="sr-only">
              Message {agentName}
            </label>
            <textarea
              ref={inputRef}
              id={inputId}
              value={input}
              maxLength={MAX_LEN}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={`Message ${agentName}…`}
              className="max-h-40 min-h-9 flex-1 resize-none self-center bg-transparent py-2 text-sm leading-5 text-ink outline-none placeholder:text-ink-3"
            />
            <button
              type="submit"
              disabled={!input.trim() || mutation.isPending}
              className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-brand/20 transition-opacity disabled:opacity-40"
              aria-label="Send message"
            >
              <Fi name="paper-plane" />
            </button>
          </div>
          <p className="mt-1.5 flex justify-between gap-2 px-1 text-[11px] text-ink-3">
            <span>Enter to send · Shift+Enter for a new line · Don&apos;t share passwords or personal IDs</span>
            <span className="tabular-nums">
              {input.length}/{MAX_LEN}
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}

function AiMessage({ name, time, copyText, children }: { name: string; time?: string; copyText?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="animate-fade-up flex items-start gap-3">
      <span className="bg-brand-gradient mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl text-sm text-gold shadow-md shadow-brand/20" aria-hidden>
        <Fi name="robot" solid />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-ink">{name}</span>
          {time ? <span className="text-[11px] text-ink-3">{time}</span> : null}
          {copyText ? (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(copyText).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Copy response"
            >
              <Fi name={copied ? "check" : "copy"} className="text-[10px]" /> {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
