"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Model output, rendered.
 *
 * A tutor's answer is markdown whether or not we asked for it: bold, lists,
 * headings, the occasional table or code block. Printing it raw shows students
 * literal `**` and `|---|`, so it gets parsed.
 *
 * Raw HTML is deliberately *not* enabled: `react-markdown` builds React
 * elements rather than setting `innerHTML`, and without `rehype-raw` any HTML
 * in the reply is shown as text. That is what makes it safe to render output
 * from a model, which is ultimately shaped by whatever the student typed.
 *
 * Element styles are mapped by hand because the typography plugin is not
 * installed, and because the panel is 380px wide, which wants tighter spacing
 * than a prose default.
 */

const components: Components = {
  p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,

  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-muted line-through">{children}</del>,

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),

  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // Headings inside a chat bubble are structural, not display type, so they stay
  // close to body size so an answer does not shout mid-conversation.
  h1: ({ children }) => (
    <h3 className="mb-2 mt-4 text-sm font-semibold tracking-tight first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 mt-4 text-sm font-semibold tracking-tight first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-widest text-muted first:mt-0">
      {children}
    </h5>
  ),

  code: ({ children }) => (
    <code className="rounded bg-border/60 px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  // A code block must scroll inside itself; the panel must never scroll
  // sideways. The child `code` resets the inline pill styling above.
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-subtle p-3 font-mono text-xs leading-relaxed last:mb-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-xs">
      {children}
    </pre>
  ),

  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-border pl-3 text-muted last:mb-0">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-4 border-border" />,

  // Same rule as code blocks: the table scrolls, the panel does not.
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-subtle px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1 align-top">{children}</td>
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
