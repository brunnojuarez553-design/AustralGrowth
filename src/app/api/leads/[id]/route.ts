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
    const body = await request.json();

    const lead = await prisma.lead.update({
      where: { id, userId: dbUser.id },
      data: { ...body, updatedAt: new Date() },
    });

    if (body.status) {
      await prisma.activity.create({
        data: {
          userId: dbUser.id, leadId: lead.id,
          type: "LEAD_UPDATED",
          title: `Estado actualizado: ${body.status}`,
        },
      });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[LEAD PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { id } = await params;
    await prisma.lead.delete({ where: { id, userId: dbUser.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
