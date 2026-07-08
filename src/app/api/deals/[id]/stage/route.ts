import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { id } = await params;
    const { stage } = await request.json();
    const deal = await prisma.deal.update({
      where: { id, userId: dbUser.id },
      data: { stage, closedAt: (stage === "WON" || stage === "LOST") ? new Date() : undefined },
    });
    await prisma.activity.create({
      data: { userId: dbUser.id, dealId: deal.id, type: "STAGE_CHANGED", title: `Pipeline → ${stage}`, metadata: { newStage: stage } },
    });
    return NextResponse.json(deal);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
