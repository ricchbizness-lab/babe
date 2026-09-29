import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, ownershipErrorToStatus } from "@/lib/ownership";
import { sendPushToUser } from "@/lib/pushSend";

const notifySchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();

    const body = await req.json();
    const parsed = notifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    await sendPushToUser(userId, parsed.data);
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
