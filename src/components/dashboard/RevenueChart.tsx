"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
const DATA = [
  { month: "Ene", revenue: 1800 },
  { month: "Feb", revenue: 2400 },
  { month: "Mar", revenue: 3100 },
  { month: "Abr", revenue: 2900 },
  { month: "May", revenue: 3900 },
  { month: "Jun", revenue: 4820 },
];
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value: number}>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-[7px] text-[12px]" style={{background:"var(--surface-3)",border:"1px solid var(--border-2)",color:"var(--text)"}}>
      <div style={{color:"var(--text-3)"}}>{label}</div>
      <div className="font-semibold font-mono">${payload[0].value.toLocaleString()}</div>
    </div>
  );
};
export function RevenueChart() {
  return (
    <div style={{height:"160px"}}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={DATA} barSize={28}>
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#475569",fontSize:11}} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{fill:"rgba(249,115,22,0.05)"}} />
          <Bar dataKey="revenue" radius={[4,4,0,0]}>
            {DATA.map((_, i) => <Cell key={i} fill={i === DATA.length-1 ? "#F97316" : "rgba(249,115,22,0.4)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
