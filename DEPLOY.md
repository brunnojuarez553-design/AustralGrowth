# AUSTRAL GROWTH OS — GUÍA DE DEPLOY A PRODUCCIÓN

## Stack
- **Next.js 15** + React 19 + TypeScript
- **Supabase** (Auth + PostgreSQL)
- **Prisma** ORM
- **Groq API** (IA) — alternativa: OpenAI
- **Vercel** (deploy + crons)
- **Recharts** (gráficos)
- **Zustand** + **React Query** (estado)

---

## PASO 1 — Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **Settings > API** y copiar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Ir a **Settings > Database** y copiar connection strings para `DATABASE_URL` y `DIRECT_URL`
4. En **Authentication > Providers**, habilitar Email

---

## PASO 2 — Variables de entorno locales

```bash
cp .env.example .env.local
# Completar todos los valores
```

---

## PASO 3 — Database

```bash
npm install
npx prisma db push          # Crea las tablas en Supabase
npx tsx prisma/seed.ts      # Carga datos iniciales de Austral Web Studio
npx prisma studio           # (opcional) visualizar DB en browser
```

---

## PASO 4 — Desarrollo local

```bash
npm run dev
# Abrir http://localhost:3000
```

---

## PASO 5 — Deploy a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel Dashboard
# Project > Settings > Environment Variables
# Agregar todas las variables de .env.example
```

O conectar el repo a Vercel desde [vercel.com/new](https://vercel.com/new) — auto-deploya en cada push a main.

---

## PASO 6 — Crons en Vercel

El archivo `vercel.json` ya configura los crons:

| Cron | Schedule | Función |
|------|----------|---------|
| `/api/cron/ai-insights` | 8am diario | Genera insights IA para todos los workspaces |
| `/api/cron/follow-up-reminders` | 9am L-V | Crea tareas de seguimiento pendientes |
| `/api/cron/automations` | Cada 15 min | Ejecuta automatizaciones por tiempo |

Requiere configurar `CRON_SECRET` en Vercel:
```bash
openssl rand -base64 32
```

---

## PASO 7 — Crear primer usuario

1. Ir a `https://tu-dominio.vercel.app`
2. Registrarse con email
3. El workspace se crea automáticamente en el primer login
4. (opcional) Ejecutar seed para cargar datos demo

---

## MÓDULOS IMPLEMENTADOS

| Módulo | Ruta | API | Estado |
|--------|------|-----|--------|
| Dashboard Ejecutivo | `/dashboard` | `/api/dashboard` | ✅ Completo |
| CRM Pipeline | `/crm` | `/api/pipeline` | ✅ Completo |
| IA Comercial | `/ia` | `/api/ai/insights` | ✅ Completo |
| Centro de Prospección | `/prospeccion` | `/api/leads` | ✅ Completo |
| Propuestas | `/propuestas` | `/api/proposals` | ✅ Completo |
| Gestión de Proyectos | `/proyectos` | `/api/projects` | ✅ Completo |
| Finanzas | `/finanzas` | `/api/finances` | ✅ Completo |
| Director Comercial IA | `/director` | `/api/ai/director` | ✅ Streaming |
| Automatizaciones | `/automatizaciones` | `/api/automations` | ✅ Completo |
| Métricas | `/metricas` | `/api/dashboard` | ✅ Completo |

---

## GROQ vs OPENAI

El sistema detecta automáticamente qué API usar:

```typescript
const useGroq = !!process.env.GROQ_API_KEY
```

**Recomendación:** Usar Groq con `llama-3.3-70b-versatile` — 10x más rápido y 20x más barato que GPT-4o.

Obtener API key gratis en [console.groq.com](https://console.groq.com)

---

## ESTRUCTURA DE CARPETAS

```
austral-growth-os/
├── prisma/
│   ├── schema.prisma       ← Schema completo de DB
│   └── seed.ts             ← Datos iniciales
├── src/
│   ├── app/
│   │   ├── (app)/          ← Páginas autenticadas
│   │   │   ├── layout.tsx  ← Layout con sidebar
│   │   │   ├── dashboard/
│   │   │   ├── crm/
│   │   │   ├── ia/
│   │   │   ├── prospeccion/
│   │   │   ├── propuestas/
│   │   │   ├── proyectos/
│   │   │   ├── finanzas/
│   │   │   ├── director/
│   │   │   ├── automatizaciones/
│   │   │   └── metricas/
│   │   └── api/
│   │       ├── leads/
│   │       ├── pipeline/
│   │       ├── ai/
│   │       │   ├── director/    ← Streaming SSE
│   │       │   ├── insights/
│   │       │   └── generate-message/
│   │       ├── dashboard/
│   │       ├── proposals/
│   │       ├── projects/
│   │       ├── finances/
│   │       ├── automations/
│   │       └── cron/
│   │           ├── ai-insights/
│   │           ├── follow-up-reminders/
│   │           └── automations/
│   ├── components/
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Topbar.tsx
│   │       └── Providers.tsx
│   ├── hooks/
│   │   ├── useLeads.ts
│   │   ├── usePipeline.ts
│   │   ├── useDashboard.ts
│   │   └── useAI.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── supabase.ts
│   │   ├── supabase-server.ts
│   │   └── utils.ts
│   ├── store/
│   │   └── index.ts        ← Zustand stores
│   └── types/
│       └── index.ts
├── .env.example
├── vercel.json             ← Crons config
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## ROADMAP SUGERIDO (próximas 8 semanas)

**Semana 1-2**
- [ ] Auth flow completo con Supabase (registro, login, recuperar password)
- [ ] Middleware de auth en Next.js
- [ ] Lead detail panel (drawer lateral)

**Semana 3-4**
- [ ] Drag & drop real en Kanban (react-beautiful-dnd)
- [ ] Import CSV de leads con papaparse
- [ ] Generador de propuestas con exportación a PDF

**Semana 5-6**
- [ ] Command palette (⌘K) con búsqueda global
- [ ] Notificaciones en tiempo real con Supabase Realtime
- [ ] Integración WhatsApp Business API

**Semana 7-8**
- [ ] Multi-workspace (para escalar como SaaS)
- [ ] Billing con Stripe
- [ ] Dashboard de analytics avanzado
