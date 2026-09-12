import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";
interface MetricCardProps {
  label: string; value: string; change?: number; changeLabel?: string;
  icon?: React.ReactNode; progress?: number; progressLabel?: string;
  variant?: "default"|"success"|"warning"|"danger"; className?: string;
}
export function MetricCard({ label, value, change, changeLabel, icon, progress, progressLabel, variant="default", className }: MetricCardProps) {
  const isPos = change !== undefined && change > 0;
  const isNeg = change !== undefined && change < 0;
  return (
    <div className={cn("future-panel rounded-[20px] p-5", className)}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{color:"var(--text-3)"}}>
        {icon && <span className="text-[13px]">{icon}</span>}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="text-[25px] font-semibold tracking-[-.05em] font-mono leading-none mb-1"
        style={{color:variant==="success"?"var(--green)":variant==="warning"?"var(--amber)":variant==="danger"?"var(--red)":"var(--text)"}}>
        {value}
      </div>
      {progress !== undefined && (
        <>
          <div className="h-1 rounded-full mt-3 mb-2 overflow-hidden" style={{background:"var(--surface-3)"}}>
            <div className="energy-bar h-full rounded-full" style={{width:`${Math.min(100,progress)}%`}}/>
          </div>
          {progressLabel && <div className="text-[10.5px]" style={{color:"var(--text-3)"}}>{progressLabel}</div>}
        </>
      )}
      {change !== undefined && (
        <div className="flex items-center gap-1 text-[11px] mt-1" style={{color:isPos?"var(--green)":isNeg?"var(--red)":"var(--text-3)"}}>
          {isPos ? <TrendingUp size={11}/> : isNeg ? <TrendingDown size={11}/> : null}
          <span>{changeLabel ?? `${isPos?"+":""}${change}%`}</span>
        </div>
      )}
    </div>
  );
}
