"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AgentMarkdown({ children }: { children: string }) {
  return (
    <div className="max-w-full min-w-0 space-y-2 [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1({ children }) {
            return <h1 className="pt-2 text-lg font-semibold">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="pt-2 text-base font-semibold">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="pt-1 font-semibold">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="pt-1 font-medium">{children}</h4>;
          },
          p({ children }) {
            return <p className="whitespace-pre-wrap">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal space-y-1 pl-5">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-0.5">{children}</li>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline underline-offset-4"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-foreground/25 border-l-2 pl-3">
                {children}
              </blockquote>
            );
          },
          code({ className, children }) {
            return (
              <code
                className={
                  className
                    ? `${className} font-mono text-xs`
                    : "bg-background/60 rounded px-1 py-0.5 font-mono text-xs"
                }
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <pre className="bg-background/60 max-w-full overflow-x-auto rounded-md p-3 text-xs">
                {children}
              </pre>
            );
          },
          hr() {
            return <hr className="border-foreground/15 my-3" />;
          },
          table({ children }) {
            return (
              <div className="max-w-full overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border-foreground/15 bg-background/40 border px-2 py-1.5 font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-foreground/15 border px-2 py-1.5">
                {children}
              </td>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
