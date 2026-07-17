"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Flame } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

const STAGES = [
  { key:"LEAD", label:"Lead detectado", color:"#475569", count:8 },
  { key:"CONTACTED", label:"Contactado", color:"#3B82F6", count:5 },
  { key:"RESPONDED", label:"Respondió", color:"#22C55E", count:4 },
  { key:"MEETING", label:"Reunión", color:"#8B5CF6", count:3 },
  { key:"DEMO", label:"Demo enviada", color:"#A855F7", count:2 },
  { key:"PROPOSAL", label:"Propuesta env.", color:"#F59E0B", count:2 },
  { key:"NEGOTIATION", label:"Negociación", color:"#10B981", count:1 },
  { key:"WON", label:"Ganado ✓", color:"#059669", count:11 },
];

const DEALS = [
  { id:"1", stage:"RESPONDED", company:"WitcherTorque", country:"Venezuela", value:1200, hot:true, score:84 },
  { id:"2", stage:"DEMO", company:"Roco4WD", country:"Venezuela", value:1500, hot:true, score:78 },
  { id:"3", stage:"NEGOTIATION", company:"CodeCar", country:"Argentina", value:750, hot:true, score:91 },
  { id:"4", stage:"PROPOSAL", company:"JART Luxe", country:"México", value:900, hot:false, score:52 },
  { id:"5", stage:"CONTACTED", company:"High Perf. SLP", country:"México", value:690, hot:false, score:34 },
  { id:"6", stage:"LEAD", company:"Ford Tech Cabudare", country:"Venezuela", value:490, hot:false, score:15 },
  { id:"7", stage:"LEAD", company:"Magicars Medellín", country:"Colombia", value:350, hot:false, score:12 },
  { id:"8", stage:"WON", company:"Valentino Motors", country:"Venezuela", value:490, hot:false, score:100 },
];

export function PipelineBoard() {
  const [deals, setDeals] = useState(DEALS);
  const [dragId, setDragId] = useState<string|null>(null);

  const getDeals = (stage: string) => deals.filter(d => d.stage === stage);

  const handleDrop = (stage: string) => {
    if (!dragId) return;
    setDeals(prev => prev.map(d => d.id === dragId ? {...d, stage} : d));
    setDragId(null);
  };

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 fade-in">
      {STAGES.map(col => (
        <div
          key={col.key}
          className="min-w-[165px] w-[165px] flex-shrink-0"
          onDragOver={e => e.preventDefault()}
          onDrop={() => handleDrop(col.key)}
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b-2" style={{borderColor:col.color}}>
            <span className="text-[11px] font-semibold" style={{color:"var(--text-2)"}}>{col.label}</span>
            <span className="text-[10px] font-mono" style={{color:"var(--text-3)"}}>{getDeals(col.key).length}</span>
          </div>
          <div className="space-y-1.5">
            {getDeals(col.key).map(deal => (
              <div
                key={deal.id}
                draggable
                onDragStart={() => setDragId(deal.id)}
                className={`rounded-[7px] p-2.5 cursor-grab transition-all ${deal.hot ? "deal-hot" : ""}`}
                style={{background:"var(--surface-2)",border:`1px solid ${deal.hot?"rgba(249,115,22,0.35)":"var(--border)"}`}}
              >
                <div className="text-[12px] font-medium mb-0.5" style={{color:"var(--text)"}}>{deal.company}</div>
                <div className="text-[11px] mb-1.5" style={{color:"var(--text-3)"}}>{deal.country}</div>
                <div className="text-[11.5px] font-semibold font-mono" style={{color:"var(--green)"}}>{formatCurrency(deal.value)}</div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {deal.hot && <Flame size={10} style={{color:"#FDBA74"}} />}
                  <div className="h-1 flex-1 rounded-full overflow-hidden" style={{background:"var(--surface-3)"}}>
                    <div className="h-full rounded-full" style={{width:`${deal.score}%`,background:deal.score>70?"var(--green)":deal.score>40?"var(--amber)":"var(--red)"}}/>
                  </div>
                  <span className="text-[10px] font-mono" style={{color:"var(--text-3)"}}>{deal.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
