"use client";

import { useEffect, useRef, useState } from "react";

import { allowRemoteEmailImageSources } from "@/lib/email-content-security-policy";

type EmailHtmlFrameProps = {
  htmlDocument: string;
  title: string;
  allowRemoteImages?: boolean;
};

type EmailHeightMessage = {
  type: "on-emit:email-height";
  height: number;
};

const themeTokens = {
  __ON_EMIT_BACKGROUND__: "--background",
  __ON_EMIT_FOREGROUND__: "--foreground",
  __ON_EMIT_CARD__: "--card",
  __ON_EMIT_CARD_FOREGROUND__: "--card-foreground",
  __ON_EMIT_PRIMARY__: "--primary",
  __ON_EMIT_PRIMARY_FOREGROUND__: "--primary-foreground",
  __ON_EMIT_MUTED__: "--muted",
  __ON_EMIT_MUTED_FOREGROUND__: "--muted-foreground",
  __ON_EMIT_BORDER__: "--border",
} as const;

function applyAppTheme(htmlDocument: string) {
  const rootStyles = getComputedStyle(document.documentElement);

  let result = htmlDocument;

  for (const [token, cssVariable] of Object.entries(themeTokens)) {
    const value = rootStyles.getPropertyValue(cssVariable).trim();

    /*
     * The values come from our own globals.css,
     * not from the email.
     */
    result = result.replaceAll(token, value || "transparent");
  }

  return result;
}

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

export function EmailHtmlFrame({
  htmlDocument,
  title,
  allowRemoteImages = false,
}: EmailHtmlFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [height, setHeight] = useState(440);

  const [themedDocument, setThemedDocument] = useState<string | null>(null);

  /*
   * Apply the exact active theme from globals.css.
   */
  useEffect(() => {
    function updateTheme() {
      setThemedDocument(applyAppTheme(htmlDocument));
    }

    updateTheme();

    /*
     * Reapply if the application switches between
     * light and dark mode.
     */
    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      observer.disconnect();
    };
  }, [htmlDocument]);

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
        Math.max(440, Math.ceil(event.data.height)),
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
  }, [themedDocument]);

  if (!themedDocument) {
    return (
      <div className="border-border bg-card h-[440px] w-full animate-pulse rounded-lg border" />
    );
  }

  const isCapped = height >= 30_000;

  const imageAwareDocument = allowRemoteImages
    ? allowRemoteEmailImageSources(themedDocument)
    : themedDocument;

  const finalThemedDocument = isCapped
    ? imageAwareDocument.replace(
        "</head>",
        "<style>html, body { overflow-y: auto !important; height: auto !important; }</style></head>",
      )
    : imageAwareDocument;

  return (
    <iframe
      ref={iframeRef}
      title={`Email content: ${title}`}
      srcDoc={finalThemedDocument}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      scrolling={isCapped ? "yes" : "no"}
      style={{
        height: `${height}px`,
        overflowY: isCapped ? "auto" : "hidden",
      }}
      className="border-border bg-card block w-full max-w-full overflow-hidden rounded-lg border"
    />
  );
}
