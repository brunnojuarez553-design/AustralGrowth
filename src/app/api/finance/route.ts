import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.enum([
    "PROJECT_ADVANCE","PROJECT_FINAL","SUBSCRIPTION","CONSULTING","BONUS",
    "HOSTING","TOOLS","MARKETING","FREELANCE","TAXES","OPERATIONS","OTHER"
  ]),
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  date: z.string().transform((s) => new Date(s)),
  projectId: z.string().optional(),
  invoiceRef: z.string().optional(),
  isPaid: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = request.nextUrl;
    const months = parseInt(searchParams.get("months") ?? "6");
    const from = new Date();
    from.setMonth(from.getMonth() - months);

    const [transactions, summary] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: dbUser.id, date: { gte: from } },
        orderBy: { date: "desc" },
        take: 100,
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId: dbUser.id, date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { amount: true },
      }),
    ]);

    const monthlyIncome = summary.find((s) => s.type === "INCOME")?._sum.amount ?? 0;
    const monthlyExpenses = summary.find((s) => s.type === "EXPENSE")?._sum.amount ?? 0;

    // Outstanding payments (income, not paid)
    const outstanding = await prisma.transaction.aggregate({
      where: { userId: dbUser.id, type: "INCOME", isPaid: false },
      _sum: { amount: true },
    });

    return NextResponse.json({
      transactions,
      monthlyIncome,
      monthlyExpenses,
      monthlyProfit: monthlyIncome - monthlyExpenses,
      outstanding: outstanding._sum.amount ?? 0,
    });
  } catch (error) {
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
    const data = createTransactionSchema.parse(body);
    const transaction = await prisma.transaction.create({
      data: { ...data, userId: dbUser.id },
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
