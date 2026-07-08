"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader } from "@/components/ui/Card";
import { Flame, Clock, AlertTriangle, Lightbulb, Brain } from "lucide-react";
import type { DashboardStats } from "@/types";

const MOCK_INSIGHTS = [
  { id:"1", type:"hot_lead", icon: Flame, color:"rgba(99,102,241,0.15)", textColor:"#A5B4FC", text: "6 leads con alta probabilidad de cierre. WitcherTorque lidera con 84%." },
  { id:"2", type:"followup", icon: Clock, color:"rgba(245,158,11,0.15)", textColor:"#FCD34D", text: "Hace 5 días sin contacto con Instaservice Panama. Riesgo de enfriamiento." },
  { id:"3", type:"risk", icon: AlertTriangle, color:"rgba(239,68,68,0.15)", textColor:"#FCA5A5", text: "JART Luxe no abrió la propuesta en 3 días. Probabilidad de abandono: 62%." },
  { id:"4", type:"opportunity", icon: Lightbulb, color:"rgba(16,185,129,0.15)", textColor:"#6EE7B7", text: "Tu tasa de cierre mejora 12% los martes. Agenda demos hoy." },
];

export function AiInsightsPanel({ stats }: { stats: DashboardStats }) {
  return (
    <div
      className="rounded-[10px] p-4"
      style={{background:"rgba(245,158,11,0.04)",border:"1px solid rgba(245,158,11,0.15)"}}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{background:"rgba(245,158,11,0.12)",color:"var(--amber)"}}>
          <Brain size={14} />
        </div>
        <div>
          <div className="text-[12.5px] font-semibold" style={{color:"var(--text)"}}>IA Comercial · Alertas del día</div>
          <div className="text-[10.5px]" style={{color:"var(--text-3)"}}>Actualizado hace 12 min</div>
        </div>
      </div>

      <div className="space-y-0">
        {MOCK_INSIGHTS.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.id}
              className="flex items-start gap-2.5 py-2.5"
              style={{borderBottom: i < MOCK_INSIGHTS.length - 1 ? "1px solid rgba(245,158,11,0.08)" : "none"}}
            >
              <div
                className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{background:insight.color,color:insight.textColor}}
              >
                <Icon size={12} />
              </div>
              <div className="text-[12px] leading-[1.5]" style={{color:"var(--text-2)"}}>
                {insight.text}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-3 pt-3 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
        style={{borderTop:"1px solid rgba(245,158,11,0.1)",color:"#FCD34D"}}
      >
        Ver todos los insights del Director IA →
      </div>
    </div>
  );
}
