import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { DealStage } from "@prisma/client";

const PIPELINE_STAGES: Array<{ stage: DealStage; label: string; color: string }> = [
  { stage: "LEAD", label: "Lead detectado", color: "#475569" },
  { stage: "CONTACTED", label: "Contactado", color: "#3B82F6" },
  { stage: "RESPONDED", label: "Respondió", color: "#22C55E" },
  { stage: "MEETING", label: "Reunión agendada", color: "#8B5CF6" },
  { stage: "DEMO", label: "Demo enviada", color: "#A855F7" },
  { stage: "PROPOSAL", label: "Propuesta enviada", color: "#F59E0B" },
  { stage: "NEGOTIATION", label: "Negociación", color: "#10B981" },
  { stage: "WON", label: "Ganado ✓", color: "#059669" },
  { stage: "LOST", label: "Perdido", color: "#EF4444" },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const format = request.nextUrl.searchParams.get("format");

    const deals = await prisma.deal.findMany({
      where: { userId: dbUser.id },
      include: {
        lead: {
          select: { company: true, contactName: true, country: true, industry: true, aiScore: true },
        },
      },
      orderBy: [{ aiHot: "desc" }, { updatedAt: "desc" }],
    });

    if (format === "pipeline") {
      const columns = PIPELINE_STAGES.map((s) => ({
        ...s,
        deals: deals.filter((d) => d.stage === s.stage),
      }));
      return NextResponse.json({ columns });
    }

    return NextResponse.json({ deals });
  } catch (error) {
    console.error("[DEALS GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const deal = await prisma.deal.create({
      data: { ...body, userId: dbUser.id },
      include: { lead: { select: { company: true } } },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
