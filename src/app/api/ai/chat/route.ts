import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { chatWithDirector } from "@/lib/ai/director";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { messages, sessionId } = await request.json();

    // Get current stats for context
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthlyIncome, activeLeads, hotLeads, topDeals] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: dbUser.id, type: "INCOME", date: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.lead.count({ where: { userId: dbUser.id, status: { notIn: ["WON", "LOST"] } } }),
      prisma.lead.count({ where: { userId: dbUser.id, aiScore: { gte: 70 } } }),
      prisma.deal.findMany({
        where: { userId: dbUser.id, stage: { notIn: ["WON", "LOST"] } },
        select: { value: true, stage: true, lead: { select: { company: true, aiScore: true } } },
        orderBy: { value: "desc" }, take: 5,
      }),
    ]);

    const wonDeals = await prisma.deal.count({ where: { userId: dbUser.id, stage: "WON" } });
    const totalDeals = await prisma.deal.count({ where: { userId: dbUser.id } });
    const wonData = await prisma.deal.findMany({
      where: { userId: dbUser.id, stage: "WON" }, select: { value: true }
    });
    const avgTicket = wonData.length > 0 ? wonData.reduce((s, d) => s + d.value, 0) / wonData.length : 0;

    const stats = {
      monthlyRevenue: monthlyIncome._sum.amount ?? 0,
      annualRevenue: 0,
      monthlyTarget: dbUser.monthlyTarget,
      annualTarget: dbUser.annualTarget,
      activeLeads, hotLeads,
      proposalsSent: 0,
      closeRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
      avgTicket: Math.round(avgTicket),
      pipelineValue: 0, monthlyGrowth: 0,
    };

    const response = await chatWithDirector(
      messages,
      stats,
      topDeals.map((d) => ({
        company: d.lead.company, stage: d.stage,
        value: d.value, score: d.lead.aiScore,
      }))
    );

    // Persist session
    if (sessionId) {
      await prisma.aiSession.update({
        where: { id: sessionId },
        data: { messages: [...messages, { role: "assistant", content: response }], updatedAt: new Date() },
      });
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error("[AI CHAT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
