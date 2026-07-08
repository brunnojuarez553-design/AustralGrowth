"use client";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { formatCurrency, formatRelative } from "@/lib/utils/format";
import { DollarSign, Target, Users, Percent, Flame, Clock, ChevronRight } from "lucide-react";
import type { DashboardStats } from "@/types";

// Mock data for demo — replace with real API calls
const MOCK_STATS: DashboardStats = {
  monthlyRevenue: 4820, annualRevenue: 31400, monthlyTarget: 6000, annualTarget: 72000,
  activeLeads: 24, hotLeads: 6, proposalsSent: 8, closeRate: 31,
  avgTicket: 595, pipelineValue: 14280, monthlyGrowth: 23,
};

const UPCOMING = [
  { id: "1", company: "WitcherTorque", type: "Reunión", time: "hoy 15:00", color: "#6366F1", initials: "WT", tag: "blue" as const },
  { id: "2", company: "Roco4WD", type: "Seguimiento WhatsApp", time: "hoy 17:00", color: "#10B981", initials: "RC", tag: "amber" as const },
  { id: "3", company: "CodeCar", type: "Enviar propuesta", time: "mañana", color: "#F59E0B", initials: "CC", tag: "green" as const },
  { id: "4", company: "JART Luxe", type: "Demo pendiente", time: "mañana 11:00", color: "#EF4444", initials: "JL", tag: "red" as const },
];

export function DashboardView() {
  const { data: stats = MOCK_STATS } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
    staleTime: 60_000,
  });

  const progress = Math.round((stats.monthlyRevenue / stats.monthlyTarget) * 100);

  return (
    <div className="space-y-3.5 fade-in">
      {/* Metric row */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Facturación mensual"
          value={formatCurrency(stats.monthlyRevenue)}
          change={stats.monthlyGrowth}
          changeLabel={`+${stats.monthlyGrowth}% vs mes anterior`}
          icon={<DollarSign size={12} />}
        />
        <MetricCard
          label="Objetivo mensual"
          value={formatCurrency(stats.monthlyTarget)}
          progress={progress}
          progressLabel={`${progress}% completado · ${formatCurrency(stats.monthlyTarget - stats.monthlyRevenue)} restante`}
          icon={<Target size={12} />}
        />
        <MetricCard
          label="Leads activos"
          value={String(stats.activeLeads)}
          changeLabel={`${stats.hotLeads} calientes 🔥`}
          change={stats.hotLeads}
          icon={<Users size={12} />}
        />
        <MetricCard
          label="Tasa de cierre"
          value={`${stats.closeRate}%`}
          change={4}
          changeLabel="+4pts vs mes ant."
          icon={<Percent size={12} />}
        />
      </div>

      {/* Second row: funnel + revenue */}
      <div className="grid grid-cols-2 gap-3.5">
        <Card>
          <CardHeader title="Embudo de conversión" subtitle="Leads del mes actual" />
          <FunnelChart />
        </Card>
        <Card>
          <CardHeader title="Facturación 2026" subtitle="USD · últimos 6 meses" />
          <RevenueChart />
        </Card>
      </div>

      {/* Third row: upcoming + AI */}
      <div className="grid grid-cols-2 gap-3.5">
        <Card>
          <CardHeader title="Próximos seguimientos">
            <Tag variant="amber">5 hoy</Tag>
          </CardHeader>
          <div className="space-y-0.5">
            {UPCOMING.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 px-2 py-2 rounded-[7px] cursor-pointer transition-all hover:opacity-80"
                style={{background:"transparent"}} onMouseEnter={e=>(e.currentTarget.style.background="var(--surface-3)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                  style={{background:item.color}}>
                  {item.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium truncate" style={{color:"var(--text)"}}>{item.company}</div>
                  <div className="text-[11px]" style={{color:"var(--text-3)"}}>{item.type} · {item.time}</div>
                </div>
                <Tag variant={item.tag}>{item.type.split(" ")[0]}</Tag>
                <ChevronRight size={12} style={{color:"var(--text-3)"}} />
              </div>
            ))}
          </div>
        </Card>

        <AiInsightsPanel stats={stats} />
      </div>

      {/* Pipeline value + avg ticket */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Valor en pipeline" value={formatCurrency(stats.pipelineValue)} icon={<Flame size={12} />} variant="success" />
        <MetricCard label="Ticket promedio" value={formatCurrency(stats.avgTicket)} icon={<DollarSign size={12} />} />
        <MetricCard label="Propuestas activas" value={String(stats.proposalsSent)} changeLabel="Esperando respuesta" icon={<Clock size={12} />} />
      </div>
    </div>
  );
}
