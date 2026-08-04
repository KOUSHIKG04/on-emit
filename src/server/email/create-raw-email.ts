import "server-only";

type CreateRawEmailInput = {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
};

function encodeHeader(value: string) {
  const safeValue = safeHeaderValue(value);
  return /^[\x20-\x7E]*$/.test(safeValue)
    ? safeValue
    : `=?UTF-8?B?${Buffer.from(safeValue, "utf8").toString("base64")}?=`;
}

function safeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function createRawEmail({
  to,
  cc = [],
  subject,
  body,
  inReplyTo,
  references,
}: CreateRawEmailInput) {
  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `To: ${to.map(safeHeaderValue).join(", ")}`,
    ...(cc.length > 0 ? [`Cc: ${cc.map(safeHeaderValue).join(", ")}`] : []),
    `Subject: ${encodeHeader(subject)}`,
    ...(inReplyTo ? [`In-Reply-To: ${safeHeaderValue(inReplyTo)}`] : []),
    ...(references ? [`References: ${safeHeaderValue(references)}`] : []),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];

  const normalizedBody = body.replace(/\r?\n/g, "\r\n");
  const encodedBody =
    Buffer.from(normalizedBody, "utf8")
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") ?? "";
  const message = [...headers, "", encodedBody].join("\r\n");

  return Buffer.from(message, "utf8").toString("base64url");
}
