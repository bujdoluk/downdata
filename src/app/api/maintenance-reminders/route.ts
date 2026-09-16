import { NextResponse } from "next/server";
import { z } from "zod";
import { getMyReminderRules, upsertReminderRule, removeReminderRule } from "@/features/maintenance/services/maintenanceReminders";

const CHANNELS = ["slack", "email", "sms"] as const;

const upsertBodySchema = z.object({
  serviceSlug: z.string().min(1).nullable(),
  minutesBefore: z.number().int().positive(),
  channels: z.array(z.enum(CHANNELS)).min(1),
});

export async function GET() {
  return NextResponse.json(await getMyReminderRules());
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const result = upsertBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid reminder rule." }, { status: 400 });
  }

  try {
    const rule = await upsertReminderRule(result.data);
    return NextResponse.json(rule);
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "A reminder for that scope already exists." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing reminder id." }, { status: 400 });
  }

  const removed = await removeReminderRule(id);
  if (!removed) {
    return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
  }
  return NextResponse.json({ removed: true });
}
