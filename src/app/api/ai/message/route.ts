import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { generateMessage } from "@/lib/ai/director";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { channel, leadId } = await request.json();
    const lead = await prisma.lead.findUnique({
      where: { id: leadId, userId: dbUser.id },
      include: { deal: { select: { stage: true } } },
    });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const result = await generateMessage({
      channel,
      leadCompany: lead.company,
      leadIndustry: lead.industry,
      dealStage: lead.deal?.stage ?? "LEAD",
      agencyName: dbUser.agencyName ?? "nuestra agencia",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
