// =============================================================================
// SEED — datos iniciales para desarrollo
// npx tsx prisma/seed.ts
// =============================================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Austral Growth OS...')

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'austral-web-studio' },
    update: {},
    create: {
      name: 'Austral Web Studio',
      slug: 'austral-web-studio',
      currency: 'USD',
      monthlyGoal: 6000,
      yearlyGoal: 72000,
      plan: 'PROFESSIONAL',
    },
  })

  const user = await prisma.user.upsert({
    where: { email: 'bruno@australwebstudio.com' },
    update: {},
    create: {
      email: 'bruno@australwebstudio.com',
      name: 'Bruno Medina',
      role: 'OWNER',
      workspaceId: workspace.id,
    },
  })

  const tags = await Promise.all([
    prisma.tag.upsert({ where: { workspaceId_name: { workspaceId: workspace.id, name: 'Automotriz' } }, update: {}, create: { workspaceId: workspace.id, name: 'Automotriz', color: '#6366F1' } }),
    prisma.tag.upsert({ where: { workspaceId_name: { workspaceId: workspace.id, name: 'Venezuela' } }, update: {}, create: { workspaceId: workspace.id, name: 'Venezuela', color: '#F59E0B' } }),
    prisma.tag.upsert({ where: { workspaceId_name: { workspaceId: workspace.id, name: 'Hot' } }, update: {}, create: { workspaceId: workspace.id, name: 'Hot', color: '#EF4444' } }),
    prisma.tag.upsert({ where: { workspaceId_name: { workspaceId: workspace.id, name: 'México' } }, update: {}, create: { workspaceId: workspace.id, name: 'México', color: '#10B981' } }),
  ])

  const leadsData = [
    { companyName: 'WitcherTorque', contactName: 'José Witcher', whatsapp: '+58412', instagram: '@witchertorque', country: 'Venezuela', city: 'Caracas', industry: 'Tuning / ECU', stage: 'REPLIED' as const, priority: 'HIGH' as const, estimatedValue: 1200, isHot: true, probability: 84 },
    { companyName: 'Roco4WD', contactName: 'Roco', instagram: '@roco4wd', country: 'Venezuela', city: 'Caracas', industry: 'Modificación 4x4', stage: 'DEMO' as const, priority: 'HIGH' as const, estimatedValue: 1500, isHot: true, probability: 78 },
    { companyName: 'CodeCar', contactName: 'Matías', whatsapp: '+54', country: 'Argentina', city: 'Olavarría', industry: 'Electrónica automotriz', stage: 'NEGOTIATION' as const, priority: 'URGENT' as const, estimatedValue: 750, isHot: true, probability: 91 },
    { companyName: 'JART Luxe Premium', contactName: 'Jorge', email: 'jorge@jartluxe.mx', country: 'México', city: 'CDMX', industry: 'Concesionaria lujo', stage: 'PROPOSAL' as const, priority: 'HIGH' as const, estimatedValue: 900, probability: 52 },
    { companyName: 'High Performance SLP', contactName: 'Carlos', instagram: '@highperfsanluis', country: 'México', city: 'San Luis Potosí', industry: 'Performance', stage: 'CONTACTED' as const, priority: 'MEDIUM' as const, estimatedValue: 690, probability: 34 },
    { companyName: 'Valentino Motors', contactName: 'Valentino', country: 'Venezuela', city: 'Catia La Mar', industry: 'Concesionaria', stage: 'WON' as const, priority: 'MEDIUM' as const, estimatedValue: 490, closedAt: new Date('2026-06-10') },
    { companyName: 'Instaservice Panama', contactName: 'Rafael', instagram: '@instaservice_pty', country: 'Panamá', city: 'Ciudad de Panamá', industry: 'Taller multimarca', stage: 'REPLIED' as const, priority: 'MEDIUM' as const, estimatedValue: 490, lastContactedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { companyName: 'EasyDrive Córdoba', country: 'Argentina', city: 'Córdoba', industry: 'Rent a Car', stage: 'CONTACTED' as const, priority: 'MEDIUM' as const, estimatedValue: 750 },
    { companyName: 'Ford Tech Cabudare', country: 'Venezuela', city: 'Cabudare', industry: 'Taller autorizado', stage: 'DETECTED' as const, priority: 'LOW' as const, estimatedValue: 490 },
    { companyName: 'Magicars Medellín', country: 'Colombia', city: 'Medellín', industry: 'Detailing / Academia', stage: 'DETECTED' as const, priority: 'MEDIUM' as const, estimatedValue: 350 },
  ]

  for (const leadData of leadsData) {
    await prisma.lead.upsert({
      where: { id: `seed-${leadData.companyName.replace(/\s/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `seed-${leadData.companyName.replace(/\s/g, '-').toLowerCase()}`,
        ...leadData,
        workspaceId: workspace.id,
        assignedToId: user.id,
        source: 'MANUAL',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    })
  }

  // Seed finances
  const financesData = [
    { type: 'INCOME' as const, category: 'Anticipo', description: 'Roco4WD — Anticipo 50%', amount: 750, date: new Date('2026-06-15') },
    { type: 'INCOME' as const, category: 'Pago final', description: 'Valentino Motors — Pago final', amount: 490, date: new Date('2026-06-12') },
    { type: 'INCOME' as const, category: 'Anticipo', description: 'JART Luxe — Anticipo 50%', amount: 450, date: new Date('2026-06-08') },
    { type: 'INCOME' as const, category: 'Pago final', description: 'Barba Roja — Pago final', amount: 350, date: new Date('2026-06-05') },
    { type: 'EXPENSE' as const, category: 'Hosting', description: 'Vercel Pro', amount: 20, date: new Date('2026-06-01') },
    { type: 'EXPENSE' as const, category: 'CDN/Assets', description: 'Cloudinary Plan', amount: 45, date: new Date('2026-06-01') },
    { type: 'EXPENSE' as const, category: 'AI/API', description: 'Groq API', amount: 18, date: new Date('2026-06-15') },
  ]

  for (const fin of financesData) {
    await prisma.finance.create({ data: { ...fin, workspaceId: workspace.id } })
  }

  // Seed automations
  await prisma.automation.createMany({
    data: [
      {
        workspaceId: workspace.id,
        name: 'Seguimiento automático — sin contacto 5 días',
        isActive: true,
        trigger: 'NO_CONTACT_DAYS',
        triggerConfig: { days: 5 },
        actions: [{ type: 'CREATE_TASK', config: { title: 'Seguimiento pendiente', priority: 'HIGH' } }],
      },
      {
        workspaceId: workspace.id,
        name: 'Mover pipeline cuando responde',
        isActive: true,
        trigger: 'LEAD_STAGE_CHANGED',
        triggerConfig: { from: 'CONTACTED', to: 'REPLIED' },
        actions: [
          { type: 'CREATE_TASK', config: { title: 'Agendar reunión' } },
          { type: 'SEND_NOTIFICATION', config: { message: 'Lead respondió — agendá reunión' } },
        ],
      },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed completado')
  console.log(`   Workspace: ${workspace.name}`)
  console.log(`   Usuario: ${user.email}`)
  console.log(`   Leads: ${leadsData.length}`)
  console.log(`   Finanzas: ${financesData.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
