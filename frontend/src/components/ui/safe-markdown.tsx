import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { isSafeHref } from "@/lib/security/sanitize";
import { cn } from "@/lib/utils";

/**
 * The ONLY way AI / user-authored rich text is rendered.
 * - Raw HTML in markdown is ignored (skipHtml) and the HAST tree is sanitised.
 * - Images are dropped (no tracking pixels / data exfiltration via URLs).
 * - Links are restricted to http(s)/mailto/relative and open with noopener noreferrer.
 */
const schema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((t) => !["img", "input", "iframe", "picture", "source"].includes(t)),
};

const components: Components = {
  a: ({ href, children }) =>
    isSafeHref(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-ink first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-ink first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-[15px] font-semibold text-ink first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold text-ink first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  // list-outside + padding keeps numbers/bullets in their own gutter so wrapped lines align with the text.
  ul: ({ children }) => <ul className="my-2.5 list-outside list-disc space-y-1.5 pl-5 marker:text-brand/70 first:mt-0 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-2.5 list-outside list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-brand first:mt-0 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-relaxed [&>ol]:mt-1.5 [&>p]:my-0 [&>ul]:mt-1.5">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-gold/60 bg-gold-soft/40 py-1.5 pl-3 pr-2 text-ink-2">{children}</blockquote>,
  hr: () => <hr className="my-4 border-line" />,
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-[13px] leading-snug">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
  th: ({ children }) => <th className="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="min-w-[7rem] border-b border-line px-3 py-2 align-top [overflow-wrap:normal] [tr:last-child_&]:border-b-0">{children}</td>,
  pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-[#141d42] p-3 text-[12.5px] leading-relaxed text-white/90">{children}</pre>,
  code: ({ className, children }) =>
    className?.startsWith("language-") ? (
      <code className="font-mono">{children}</code>
    ) : (
      <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>
    ),
};

export function SafeMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("min-w-0 break-words text-sm text-ink-2 [overflow-wrap:anywhere]", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema]]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
