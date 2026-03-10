import { NextResponse } from "next/server";
import { z } from "zod";

import {
  approveSmartMeetingRun,
  rejectSmartMeetingRun,
  SmartMeetingValidationError
} from "@/src/lib/smart-meetings";
import { requireAppUser } from "@/src/lib/session";

const approvalSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    runId: z.string().uuid(),
    attendeeEmails: z.array(z.string().email().max(320)).default([])
  }),
  z.object({
    action: z.literal("reject"),
    runId: z.string().uuid()
  })
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { planId } = await params;
  const body = await request.json();
  const parsed = approvalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  }

  try {
    if (parsed.data.action === "approve") {
      await approveSmartMeetingRun({
        planId,
        runId: parsed.data.runId,
        userId: user.id,
        attendeeEmails: parsed.data.attendeeEmails
      });
    } else {
      await rejectSmartMeetingRun({
        planId,
        runId: parsed.data.runId,
        userId: user.id
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SmartMeetingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Smart-Treffen konnte nicht aktualisiert werden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
