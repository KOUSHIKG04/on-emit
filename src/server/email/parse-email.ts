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
      "html",
      "head",
      "body",
      "style",
      "title",
      "meta",
      "div",
      "span",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "caption",
      "col",
      "colgroup",
      "ul",
      "ol",
      "li",
      "dl",
      "dt",
      "dd",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "strike",
      "del",
      "ins",
      "sub",
      "sup",
      "small",
      "mark",
      "code",
      "pre",
      "blockquote",
      "hr",
      "br",
      "center",
      "font",
      "button",
      "section",
      "header",
      "footer",
      "nav",
      "main",
      "article",
      "aside",
      "figure",
      "figcaption",
      "svg",
      "path",
      "rect",
      "circle",
      "g",
      "defs",
      "use",
      "line",
      "polyline",
      "polygon",
    ],

    allowedAttributes: {
      "*": [
        "style",
        "class",
        "id",
        "align",
        "valign",
        "width",
        "height",
        "bgcolor",
        "color",
        "border",
        "cellpadding",
        "cellspacing",
        "colspan",
        "rowspan",
        "role",
        "aria-*",
        "dir",
        "lang",
        "title",
        "target",
        "rel",
        "face",
        "size",
      ],
      a: ["href", "title", "target", "rel", "name", "id", "style", "class"],
      img: [
        "src",
        "alt",
        "title",
        "width",
        "height",
        "style",
        "class",
        "border",
      ],
      svg: ["viewbox", "width", "height", "fill", "xmlns", "style", "class"],
      path: ["d", "fill", "stroke", "stroke-width", "style", "class"],
    },

    allowedSchemes: ["http", "https", "mailto", "data", "cid", "tel"],

    allowedSchemesByTag: {
      a: ["http", "https", "mailto", "tel"],
      img: ["data", "http", "https", "cid"],
    },

    allowedStyles: {
      "*": {
        color: [/.*/],
        background: [/.*/],
        "background-color": [/.*/],
        "background-image": [/.*/],
        "background-position": [/.*/],
        "background-repeat": [/.*/],
        "background-size": [/.*/],
        "font-size": [/.*/],
        "font-family": [/.*/],
        "font-weight": [/.*/],
        "font-style": [/.*/],
        "text-align": [/.*/],
        "text-decoration": [/.*/],
        "text-transform": [/.*/],
        "text-indent": [/.*/],
        "line-height": [/.*/],
        "letter-spacing": [/.*/],
        width: [/.*/],
        height: [/.*/],
        "min-width": [/.*/],
        "max-width": [/.*/],
        "min-height": [/.*/],
        "max-height": [/.*/],
        padding: [/.*/],
        "padding-top": [/.*/],
        "padding-right": [/.*/],
        "padding-bottom": [/.*/],
        "padding-left": [/.*/],
        margin: [/.*/],
        "margin-top": [/.*/],
        "margin-right": [/.*/],
        "margin-bottom": [/.*/],
        "margin-left": [/.*/],
        border: [/.*/],
        "border-top": [/.*/],
        "border-right": [/.*/],
        "border-bottom": [/.*/],
        "border-left": [/.*/],
        "border-color": [/.*/],
        "border-style": [/.*/],
        "border-width": [/.*/],
        "border-radius": [/.*/],
        "border-collapse": [/.*/],
        "border-spacing": [/.*/],
        display: [/.*/],
        "vertical-align": [/.*/],
        "box-sizing": [/.*/],
        float: [/.*/],
        clear: [/.*/],
        overflow: [/.*/],
        "white-space": [/.*/],
        "list-style": [/.*/],
        "list-style-type": [/.*/],
        opacity: [/.*/],
        visibility: [/.*/],
        gap: [/.*/],
        "flex-direction": [/.*/],
        "justify-content": [/.*/],
        "align-items": [/.*/],
      },
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

    nonTextTags: ["script", "textarea"],

    allowVulnerableTags: true,

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

  const baseHead = `
    <meta charset="utf-8" />

    <meta
      http-equiv="Content-Security-Policy"
      content="
        default-src 'none';
        img-src data: http: https: cid:;
        style-src 'unsafe-inline';
        script-src 'nonce-${scriptNonce}';
        font-src data: https: http:;
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
      html, body {
        margin: 0;
        padding: 16px 8px;
        background-color: #f2f4f8;
        color: #202124;
        font-family: Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      * {
        box-sizing: border-box;
      }

      img {
        max-width: 100%;
      }

      a {
        color: #1a73e8;
      }
    </style>
  `;

  const scriptTag = `
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

        window.addEventListener("load", () => {
          requestAnimationFrame(sendHeight);
        });

        const observer = new ResizeObserver(() => {
          requestAnimationFrame(sendHeight);
        });

        if (document.documentElement) observer.observe(document.documentElement);
        if (document.body) observer.observe(document.body);

        sendHeight();
      })();
    </script>
  `;

  const hasHead = /<head[^>]*>/i.test(html);
  const hasBody = /<body[^>]*>/i.test(html);

  if (hasHead) {
    let result = html.replace(/<head[^>]*>/i, `$&${baseHead}`);
    if (hasBody) {
      result = result.replace(/<\/body>/i, `${scriptTag}</body>`);
    } else {
      result += scriptTag;
    }
    return result;
  }

  return `<!doctype html>
<html>
  <head>
    ${baseHead}
  </head>
  <body>
    ${html}
    ${scriptTag}
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
