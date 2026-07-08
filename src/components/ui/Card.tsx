import { cn } from "@/lib/utils/cn";
interface CardProps { children: React.ReactNode; className?: string; accentColor?: string; padding?: "sm"|"md"|"lg"; }
export function Card({ children, className, accentColor, padding="md" }: CardProps) {
  const p = {sm:"p-3",md:"p-4",lg:"p-5"}[padding];
  return (
    <div className={cn("rounded-[10px] relative overflow-hidden",p,className)} style={{background:"var(--surface)",border:"1px solid var(--border)"}}>
      {accentColor && <div className="absolute top-0 left-0 right-0 h-[3px]" style={{background:accentColor}}/>}
      {children}
    </div>
  );
}
export function CardHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3.5">
      <div>
        <div className="text-[13px] font-semibold" style={{color:"var(--text)"}}>{title}</div>
        {subtitle && <div className="text-[11px]" style={{color:"var(--text-3)"}}>{subtitle}</div>}
      </div>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
