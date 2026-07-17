"use client";
const FUNNEL = [
  { label: "Detectados", count: 87, color: "#F97316" },
  { label: "Contactados", count: 64, color: "#7C3AED" },
  { label: "Respondieron", count: 38, color: "#3B82F6" },
  { label: "Propuesta env.", count: 21, color: "#10B981" },
  { label: "Cerrados", count: 11, color: "#F59E0B" },
];
export function FunnelChart() {
  const max = FUNNEL[0].count;
  return (
    <div className="space-y-2">
      {FUNNEL.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <div className="w-[105px] text-[12px] flex-shrink-0" style={{color:"var(--text-2)"}}>{item.label}</div>
          <div className="flex-1 flex items-center gap-2">
            <div
              className="h-[22px] rounded flex items-center px-2 text-[11px] font-semibold text-white transition-all"
              style={{width:`${(item.count/max)*100}%`,background:item.color,minWidth:"28px"}}
            >
              {item.count}
            </div>
          </div>
          <div className="text-[11px] font-mono w-8 text-right" style={{color:"var(--text-3)"}}>
            {Math.round((item.count / max) * 100)}%
          </div>
        </div>
      ))}
    </div>
  );
}
