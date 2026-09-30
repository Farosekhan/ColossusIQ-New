"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { ChatPanel } from "@/components/ai/chat-panel";
import type { Role } from "@/lib/auth/roles";

const COPY: Partial<Record<Role, { agent: string; name: string; intro: string; suggestions: string[] }>> = {
  student: {
    agent: "mentor",
    name: "AI Mentor",
    intro: "Hi Anand! I know your courses, goals and recent results. What would you like help with?",
    suggestions: ["What should I study today?", "Why am I scoring low in DBMS?", "Create a 90-day placement plan"],
  },
  faculty: {
    agent: "faculty-copilot",
    name: "Faculty Copilot",
    intro: "Hello Dr. Meena. I can draft lesson plans, questions and rubrics, or summarise class performance.",
    suggestions: ["Explain normalization with a classroom example", "What are the internal assessment rules?"],
  },
};

export function MentorDrawer({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cfg = COPY[role] ?? {
    agent: "institution",
    name: "Institutional Intelligence",
    intro: "Ask questions about your institution. Answers link back to their data sources.",
    suggestions: ["What are the internal assessment rules?", "Minimum attendance for exam eligibility?"],
  };

  // Kept mounted while closed so the conversation survives toggling.
  return (
    <div className={open ? "fixed inset-0 z-50" : "hidden"} role="dialog" aria-modal="true" aria-label={cfg.name}>
      <button className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-bg shadow-card">
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <div>
            <p className="font-semibold text-ink">{cfg.name}</p>
            <p className="text-xs text-ink-3">Personal context · institution-grounded answers</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <ChatPanel agent={cfg.agent} agentName={cfg.name} intro={cfg.intro} suggestions={cfg.suggestions} className="flex-1" compact />
      </aside>
    </div>
  );
}
