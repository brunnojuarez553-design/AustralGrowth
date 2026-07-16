import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { id } = await params;
    const body = await request.json();

    const lead = await prisma.lead.update({
      where: { id, workspaceId: dbUser.workspaceId },
      data: { ...body, updatedAt: new Date() },
    });

    if (body.stage) {
      await prisma.activity.create({
        data: {
          userId: dbUser.id,
          leadId: lead.id,
          type: "STAGE_CHANGED",
          description: `Estado actualizado: ${body.stage}`,
        },
      });
    }

    return NextResponse.json({ data: lead });
  } catch (error) {
    console.error("[LEAD PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { id } = await params;
    await prisma.lead.delete({ where: { id, workspaceId: dbUser.workspaceId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LEAD DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
