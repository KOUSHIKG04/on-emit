import "server-only";

type CreateRawEmailInput = {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
};

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

export function createRawEmail({
  to,
  cc = [],
  subject,
  body,
}: CreateRawEmailInput) {
  const headers = [
    `To: ${to.join(", ")}`,
    ...(cc.length > 0 ? [`Cc: ${cc.join(", ")}`] : []),
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];

  const encodedBody = wrapBase64(
    Buffer.from(body.replace(/\r?\n/g, "\r\n"), "utf8").toString("base64"),
  );
  const message = [...headers, "", encodedBody].join("\r\n");

  return Buffer.from(message, "utf8").toString("base64url");
}
