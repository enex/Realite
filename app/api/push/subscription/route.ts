import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteWebPushSubscription,
  upsertWebPushSubscription,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";
import { getWebPushPublicKey } from "@/src/lib/web-push";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
});

const deleteSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export async function GET() {
  const publicKey = getWebPushPublicKey();
  return NextResponse.json({
    supported: Boolean(publicKey),
    publicKey,
  });
}

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const parsed = subscriptionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Push-Subscription" },
      { status: 400 },
    );
  }

  await upsertWebPushSubscription({
    userId: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Push-Subscription" },
      { status: 400 },
    );
  }

  await deleteWebPushSubscription(parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
