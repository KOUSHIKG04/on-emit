"use client";

import { useEffect, useRef, useState } from "react";

type EmailHtmlFrameProps = {
  htmlDocument: string;
  title: string;
};

type EmailHeightMessage = {
  type: "on-emit:email-height";
  height: number;
};

function isEmailHeightMessage(value: unknown): value is EmailHeightMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;

  return (
    message.type === "on-emit:email-height" &&
    typeof message.height === "number" &&
    Number.isFinite(message.height)
  );
}

export function EmailHtmlFrame({ htmlDocument, title }: EmailHtmlFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(440);

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (!isEmailHeightMessage(event.data)) {
        return;
      }

      const nextHeight = Math.min(
        30_000,
        Math.max(200, Math.ceil(event.data.height)),
      );

      setHeight(nextHeight);
    }

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    setHeight(440);
  }, [htmlDocument]);

  const isCapped = height >= 30_000;

  const finalDocument = isCapped
    ? htmlDocument.replace(
        "</head>",
        "<style>html, body { overflow-y: auto !important; height: auto !important; }</style></head>",
      )
    : htmlDocument;

  return (
    <div className="border-border/80 w-full max-w-full overflow-hidden rounded-xl border bg-[#f2f4f8] shadow-sm">
      <iframe
        ref={iframeRef}
        title={`Email content: ${title}`}
        srcDoc={finalDocument}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        scrolling={isCapped ? "yes" : "no"}
        style={{
          height: `${height}px`,
          overflowY: isCapped ? "auto" : "hidden",
        }}
        className="block w-full max-w-full border-0 bg-[#f2f4f8]"
      />
    </div>
  );
}
