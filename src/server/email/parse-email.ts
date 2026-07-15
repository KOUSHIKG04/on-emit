import PostalMime, {
  type Address,
  type Attachment,
  type Email,
} from "postal-mime";
import sanitizeHtml from "sanitize-html";
import { randomBytes } from "node:crypto";

export type SafeEmailAddress = {
  name: string | null;
  email: string;
};

export type SafeEmailAttachment = {
  index: number;
  filename: string;
  mimeType: string;
  disposition: "attachment" | "inline" | null;
  inline: boolean;
  size: number;
};

export type SafeParsedMessage = {
  id: string;
  subject: string;
  sentAt: string | null;
  from: SafeEmailAddress;
  to: SafeEmailAddress[];
  cc: SafeEmailAddress[];
  replyTo: SafeEmailAddress[];
  htmlDocument: string | null;
  text: string | null;
  attachments: SafeEmailAttachment[];
};

function decodeGmailRaw(raw: string) {
  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");

  return Buffer.from(normalized, "base64");
}

export async function parseGmailRaw(raw: string): Promise<Email> {
  const bytes = decodeGmailRaw(raw);

  return PostalMime.parse(bytes, {
    attachmentEncoding: "base64",

    /*
     * Prevent unusually nested malicious MIME messages from
     * consuming excessive resources.
     */
    maxNestingDepth: 50,

    /*
     * Restrict the maximum header section to 2 MB.
     */
    maxHeadersSize: 2 * 1024 * 1024,
  });
}

export function getAttachmentBuffer(attachment: Attachment) {
  if (typeof attachment.content === "string") {
    if (attachment.encoding === "base64") {
      return Buffer.from(attachment.content, "base64");
    }

    return Buffer.from(attachment.content, "utf8");
  }

  if (attachment.content instanceof ArrayBuffer) {
    return Buffer.from(attachment.content);
  }

  return Buffer.from(attachment.content);
}

function flattenAddresses(
  addresses: Address[] | undefined,
): SafeEmailAddress[] {
  return (addresses ?? []).flatMap((address): SafeEmailAddress[] => {
    /*
     * An address can represent an email group.
     */
    if ("group" in address && Array.isArray(address.group)) {
      return address.group.flatMap((member): SafeEmailAddress[] => {
        /*
         * PostalMime types allow address to be undefined,
         * so ignore group members without an address.
         */
        if (!member.address) {
          return [];
        }

        return [
          {
            name: member.name || null,
            email: member.address,
          },
        ];
      });
    }

    /*
     * Handle a normal individual mailbox.
     */
    if (
      "address" in address &&
      typeof address.address === "string" &&
      address.address.length > 0
    ) {
      return [
        {
          name: address.name || null,
          email: address.address,
        },
      ];
    }

    return [];
  });
}

function getSender(address: Address | undefined): SafeEmailAddress {
  const result = flattenAddresses(address ? [address] : [])[0];

  return (
    result ?? {
      name: null,
      email: "Unknown sender",
    }
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertInlineImages(html: string, attachments: Attachment[]) {
  let result = html;

  for (const attachment of attachments) {
    if (!attachment.contentId || !attachment.mimeType.startsWith("image/")) {
      continue;
    }

    const contentId = attachment.contentId.replace(/^<|>$/g, "");

    const content = getAttachmentBuffer(attachment).toString("base64");

    const dataUrl = `data:${attachment.mimeType};base64,${content}`;

    result = result.replace(
      new RegExp(`cid:${escapeRegExp(contentId)}`, "gi"),
      dataUrl,
    );
  }

  return result;
}

function sanitizeEmailHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      // "center",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
    ],

    /*
     * Inline styles are important for email layouts.
     * External CSS requests are blocked again by the iframe CSP.
     */
    allowedAttributes: {
      // "*": [
      //   "class",
      //   "style",
      //   "title",
      //   "dir",
      //   "align",
      //   "valign",
      //   "width",
      //   "height",
      //   "role",
      //   "aria-label",
      // ],

      a: ["href", "title", "target", "rel"],

      img: ["src", "alt", "title", "width", "height"],

      table: [
        "width",
        "height",
        "border",
        "cellpadding",
        "cellspacing",
        "align",
        "valign",
        "bgcolor",
        "style",
      ],

      td: [
        "width",
        "height",
        "colspan",
        "rowspan",
        "align",
        "valign",
        "bgcolor",
        "style",
      ],

      th: [
        "width",
        "height",
        "colspan",
        "rowspan",
        "align",
        "valign",
        "bgcolor",
        "style",
      ],
    },

    /*
     * Only embedded data images are allowed.
     *
     * Remote http/https image URLs are removed to prevent
     * email tracking pixels from learning the user's IP.
     */
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
      img: ["data", "http", "https"],
    },

    transformTags: {
      a(tagName, attributes) {
        return {
          tagName,
          attribs: {
            ...attributes,
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        };
      },
    },

    disallowedTagsMode: "discard",
  });
}

function createHtmlDocument(html: string) {
  /*
   * This random nonce allows only our height-reporting script.
   * Scripts originally contained in the email were already
   * removed by sanitize-html.
   */
  const scriptNonce = randomBytes(18).toString("base64");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />

    <meta
      http-equiv="Content-Security-Policy"
      content="
        default-src 'none';
        img-src data: https: http:;
        style-src 'unsafe-inline';
        script-src 'nonce-${scriptNonce}';
        font-src data:;
        connect-src 'none';
        media-src 'none';
        object-src 'none';
        frame-src 'none';
        form-action 'none';
        base-uri 'none';
      "
    />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />

    <style>
  :root {
    color-scheme: light dark;

    /*
     * EmailHtmlFrame replaces these placeholders using
     * the actual CSS variables from globals.css.
     */
    --email-background: __ON_EMIT_BACKGROUND__;
    --email-foreground: __ON_EMIT_FOREGROUND__;
    --email-card: __ON_EMIT_CARD__;
    --email-card-foreground: __ON_EMIT_CARD_FOREGROUND__;
    --email-primary: __ON_EMIT_PRIMARY__;
    --email-primary-foreground: __ON_EMIT_PRIMARY_FOREGROUND__;
    --email-muted: __ON_EMIT_MUTED__;
    --email-muted-foreground: __ON_EMIT_MUTED_FOREGROUND__;
    --email-border: __ON_EMIT_BORDER__;
  }

  * {
    box-sizing: border-box;
    max-width: 100%;
  }

  html,
  body {
    width: 100%;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    overflow-wrap: anywhere;

    background: var(--email-background) !important;
    color: var(--email-foreground) !important;

    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      "Liberation Mono",
      monospace !important;

    font-size: 14px;
    line-height: 1.65;
  }

  body {
    padding: 20px;
  }

  /*
   * Force sender content to inherit our colors and font.
   */
  body * {
    color: inherit !important;
    font-family: inherit !important;
    box-shadow: none !important;
  }

  p {
    margin: 12px 0;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 22px 0 10px;
    color: var(--email-foreground) !important;
    font-weight: 650;
    line-height: 1.3;
  }

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 20px;
  }

  h3 {
    font-size: 17px;
  }

  h4,
  h5,
  h6 {
    font-size: 15px;
  }

  a {
    color: var(--email-primary) !important;
    overflow-wrap: anywhere;
    font-weight: 500;
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  img {
    display: block;
    max-width: 100% !important;
    height: auto !important;
    margin: 14px auto;
    border-radius: 8px;
  }

  table {
    width: 100% !important;
    max-width: 100% !important;
    margin: 16px 0;
    border: 1px solid var(--email-border) !important;
    border-collapse: collapse;
    border-radius: 8px;
    background: var(--email-card) !important;
    color: var(--email-card-foreground) !important;
  }

  td,
  th {
    padding: 10px 12px !important;
    border: 1px solid var(--email-border) !important;
    background: transparent !important;
    color: var(--email-card-foreground) !important;
    overflow-wrap: anywhere;
    text-align: left;
  }

  th {
    background: var(--email-muted) !important;
    font-weight: 600;
  }

  blockquote {
    margin: 16px 0;
    padding: 12px 16px;
    border: 1px solid var(--email-border);
    border-left: 4px solid var(--email-primary);
    border-radius: 0 8px 8px 0;
    background: var(--email-muted) !important;
    color: var(--email-muted-foreground) !important;
  }

  blockquote * {
    color: var(--email-muted-foreground) !important;
  }

  pre {
    max-width: 100%;
    margin: 16px 0;
    padding: 14px;
    overflow-x: auto;
    border: 1px solid var(--email-border);
    border-radius: 8px;
    background: var(--email-muted) !important;
    color: var(--email-foreground) !important;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 12px;
    line-height: 1.55;
  }

  code {
    border: 1px solid var(--email-border);
    border-radius: 4px;
    background: var(--email-muted) !important;
    color: var(--email-foreground) !important;
    padding: 2px 5px;
    font-size: 12px;
  }

  pre code {
    padding: 0;
    border: 0;
    background: transparent !important;
  }

  ul,
  ol {
    margin: 12px 0;
    padding-left: 24px;
  }

  li {
    margin: 5px 0;
  }

  hr {
    margin: 22px 0;
    border: 0;
    border-top: 1px solid var(--email-border);
  }
</style>
  </head>

  <body>
    ${html}

    <script nonce="${scriptNonce}">
      (() => {
        const sendHeight = () => {
          const height = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          );

          window.parent.postMessage(
            {
              type: "on-emit:email-height",
              height
            },
            "*"
          );
        };

        /*
         * Report after the first layout.
         */
        window.addEventListener("load", () => {
          requestAnimationFrame(sendHeight);
        });

        /*
         * Report again when images, tables or responsive
         * elements change the document height.
         */
        const observer = new ResizeObserver(() => {
          requestAnimationFrame(sendHeight);
        });

        observer.observe(document.documentElement);
        observer.observe(document.body);

        sendHeight();
      })();
    </script>
  </body>
</html>`;
}

export function createSafeParsedMessage(
  id: string,
  email: Email,
): SafeParsedMessage {
  const htmlWithInlineImages = email.html
    ? insertInlineImages(email.html, email.attachments)
    : null;

  const sanitizedHtml = htmlWithInlineImages
    ? sanitizeEmailHtml(htmlWithInlineImages)
    : null;

  return {
    id,
    subject: email.subject ?? "(No subject)",
    sentAt: email.date ?? null,
    from: getSender(email.from),
    to: flattenAddresses(email.to),
    cc: flattenAddresses(email.cc),
    replyTo: flattenAddresses(email.replyTo),

    htmlDocument: sanitizedHtml ? createHtmlDocument(sanitizedHtml) : null,

    text: email.text?.trim() ?? null,

    attachments: email.attachments.map((attachment, index) => {
      const content = getAttachmentBuffer(attachment);

      return {
        index,
        filename: attachment.filename ?? `attachment-${index + 1}`,
        mimeType: attachment.mimeType ?? "application/octet-stream",
        disposition: attachment.disposition,
        inline:
          attachment.disposition === "inline" || attachment.related === true,
        size: content.byteLength,
      };
    }),
  };
}
