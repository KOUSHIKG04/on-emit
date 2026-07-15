"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function prepareEmailMarkdown(body: string) {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<summary>([\s\S]*?)<\/summary>/gi, "\n\n#### $1\n\n")
    .replace(/<\/?(?:details|blockquote|sub)>/gi, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

type EmailMarkdownProps = {
  body: string;
};

export function EmailMarkdown({ body }: EmailMarkdownProps) {
  const markdown = prepareEmailMarkdown(body);

  return (
    <div className="mt-5 max-w-full min-w-0 overflow-hidden text-sm leading-6 [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1({ children }) {
            return (
              <h1 className="mt-6 mb-3 text-xl font-semibold">{children}</h1>
            );
          },

          h2({ children }) {
            return (
              <h2 className="mt-6 mb-3 text-lg font-semibold">{children}</h2>
            );
          },

          h3({ children }) {
            return (
              <h3 className="mt-5 mb-2 text-base font-semibold">{children}</h3>
            );
          },

          h4({ children }) {
            return (
              <h4 className="mt-5 mb-2 text-sm font-semibold">{children}</h4>
            );
          },

          p({ children }) {
            return (
              <p className="my-3 max-w-full min-w-0 break-words whitespace-pre-wrap">
                {children}
              </p>
            );
          },

          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                title={href}
                className="text-primary break-all underline underline-offset-4"
              >
                {children}
              </a>
            );
          },

          ul({ children, className }) {
            const isTaskList = className?.includes("contains-task-list");

            return (
              <ul
                className={
                  isTaskList
                    ? "my-3 space-y-2"
                    : "my-3 list-disc space-y-1 pl-6"
                }
              >
                {children}
              </ul>
            );
          },

          ol({ children }) {
            return (
              <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>
            );
          },

          li({ children, className }) {
            const isTask = className?.includes("task-list-item");

            return (
              <li className={isTask ? "flex items-start gap-2" : "pl-1"}>
                {children}
              </li>
            );
          },

          blockquote({ children }) {
            return (
              <blockquote className="border-primary/50 bg-muted/50 my-4 border-l-4 px-4 py-2">
                {children}
              </blockquote>
            );
          },

          pre({ children }) {
            return (
              <pre className="bg-muted my-4 max-w-full overflow-x-auto rounded-lg p-4 text-xs leading-5">
                {children}
              </pre>
            );
          },

          code({ className, children }) {
            const isCodeBlock = className?.startsWith("language-");

            if (isCodeBlock) {
              return (
                <code className={`${className} font-mono`}>{children}</code>
              );
            }

            return (
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs break-all">
                {children}
              </code>
            );
          },

          hr() {
            return <hr className="border-border my-6" />;
          },

          table({ children }) {
            return (
              <div className="my-4 max-w-full overflow-x-auto">
                <table className="border-border w-full border-collapse text-left text-sm">
                  {children}
                </table>
              </div>
            );
          },

          th({ children }) {
            return (
              <th className="border-border bg-muted border px-3 py-2 font-medium">
                {children}
              </th>
            );
          },

          td({ children }) {
            return (
              <td className="border-border border px-3 py-2">{children}</td>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
