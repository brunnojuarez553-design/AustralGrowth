import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";

// Lista blanca de campos que un usuario puede editar. Cualquier otro campo
// (workspaceId, id, createdAt, etc.) se descarta automáticamente, aunque
// venga en el cuerpo de la petición.
const leadUpdateSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  country: z.string().optional(),
  city: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.enum(['SOLO','SMALL','MEDIUM','LARGE','ENTERPRISE']).optional(),
  source: z.enum(['MANUAL','INSTAGRAM','WHATSAPP','EMAIL','REFERRAL','COLD_OUTREACH','INBOUND','CSV_IMPORT','AI_DETECTED']).optional(),
  stage: z.enum(['DETECTED','CONTACTED','REPLIED','MEETING','DEMO','PROPOSAL','NEGOTIATION','WON','LOST']).optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),
  estimatedValue: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  isHot: z.boolean().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { id } = await params;
    const body = await request.json();
    const validated = leadUpdateSchema.parse(body);

    const lead = await prisma.lead.update({
      where: { id, workspaceId: dbUser.workspaceId },
      data: { ...validated, updatedAt: new Date() },
    });

    if (validated.stage) {
      await prisma.activity.create({
        data: {
          userId: dbUser.id,
          leadId: lead.id,
          type: "STAGE_CHANGED",
          description: `Estado actualizado: ${validated.stage}`,
        },
      });
    }

    return NextResponse.json({ data: lead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error("[LEAD PATCH]", error);
    return NextResponse.json({ error: "Internal error", debug: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const user = session?.user
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
