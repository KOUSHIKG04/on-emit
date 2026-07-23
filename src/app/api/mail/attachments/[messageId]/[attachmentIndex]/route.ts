import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getTenantCorsair } from "@/server/corsair";
import { db } from "@/server/db";
import { getAttachmentBuffer, parseGmailRaw } from "@/server/email/parse-email";
import { getActiveCorsairTenantId } from "@/server/integrations/google-accounts";

type RouteContext = {
  params: Promise<{
    messageId: string;
    attachmentIndex: string;
  }>;
};

function safeFilename(filename: string) {
  return filename
    .replace(/[\r\n"]/g, "")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .slice(0, 180);
}

export async function GET(_request: Request, context: RouteContext) {
  const { messageId, attachmentIndex } = await context.params;

  const index = Number(attachmentIndex);

  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json(
      {
        error: "Invalid attachment index.",
      },
      {
        status: 400,
      },
    );
  }

  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (!userId) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const corsairTenantId = await getActiveCorsairTenantId(db, userId);
    const tenantCorsair = getTenantCorsair(corsairTenantId);

    /*
     * The message is fetched using only the authenticated
     * user's Corsair tenant.
     */
    const rawMessage = await tenantCorsair.gmail.api.messages.get({
      userId: "me",
      id: messageId,
      format: "raw",
    });

    if (!rawMessage.raw) {
      return NextResponse.json(
        {
          error: "Raw Gmail message was not returned.",
        },
        {
          status: 404,
        },
      );
    }

    const parsed = await parseGmailRaw(rawMessage.raw);

    const attachment = parsed.attachments[index];

    if (!attachment) {
      return NextResponse.json(
        {
          error: "Attachment not found.",
        },
        {
          status: 404,
        },
      );
    }

    const buffer = getAttachmentBuffer(attachment);

    const originalFilename = attachment.filename ?? `attachment-${index + 1}`;

    const filename = safeFilename(originalFilename);

    const bytes = new Uint8Array(buffer);

    return new Response(bytes, {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",

        "Content-Length": String(bytes.byteLength),

        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          originalFilename,
        )}`,

        "Cache-Control": "private, no-store",

        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Attachment download failed:", error);

    return NextResponse.json(
      {
        error: "Attachment could not be downloaded.",
      },
      {
        status: 502,
      },
    );
  }
}
