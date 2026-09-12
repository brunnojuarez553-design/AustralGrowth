'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useDashboard } from '@/hooks/useDashboard'
import { Topbar } from '@/components/layout/Topbar'
import { LeadFormModal } from '@/components/crm/LeadFormModal'
import { BoldText } from '@/components/ui/BoldText'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

const stageColors=['#ff7a1a','#a78bfa','#60a5fa','#38bdf8','#34d399','#fbbf24','#fb7185']
const alertIcons={hot:'ti-flame',stale:'ti-clock',insight:'ti-sparkles',empty:'ti-info-circle'}
const greet=(h:number)=>h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches'

function Trend({value}:{value:number|null|undefined}){
  if(value==null)return null
  return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${value>=0?'bg-emerald-400/10 text-emerald-300':'bg-rose-400/10 text-rose-300'}`}>{value>=0?'↑':'↓'} {Math.abs(value).toFixed(1)}%</span>
}

function Kpi({title,value,detail,icon,trend}:{title:string;value:string;detail:string;icon:string;trend?:number|null}){
  return <article className="apple-card group relative min-h-[170px] overflow-hidden p-6">
    <div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-[13px] bg-white/[.065] text-zinc-200 shadow-[inset_0_1px_rgba(255,255,255,.05)]"><i className={`ti ${icon} text-[18px]`}/></div><Trend value={trend}/></div>
    <p className="mt-7 text-[11px] font-medium text-zinc-500">{title}</p><p className="mt-1 font-mono text-[28px] font-semibold tracking-[-.05em] text-white">{value}</p><p className="mt-1 text-[10.5px] text-zinc-600">{detail}</p>
  </article>
}

const Tip=({active,payload,label}:any)=>active&&payload?.length?<div className="rounded-xl border border-white/10 bg-[#1c1c1e]/95 px-3 py-2 shadow-2xl backdrop-blur-xl"><p className="text-[10px] text-zinc-500">{label}</p><p className="mt-1 text-xs text-white">Ingresos · {formatCurrency(payload[0].value)}</p></div>:null

export default function DashboardPage(){
  const {data:m,isLoading,isError,error}=useDashboard()
  const [modalOpen,setModalOpen]=useState(false)
  const [now,setNow]=useState<Date|null>(null)
  useEffect(()=>{setNow(new Date());const t=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(t)},[])
  const progress=Math.min(m?.monthlyGoalProgress??0,100)
  const remaining=Math.max((m?.monthlyGoal??0)-(m?.monthlyRevenue??0),0)
  const insight=(m?.alerts??[])[0]?.text??'Cargá tus primeros leads para activar las recomendaciones comerciales.'

  function exportReport(){if(!m)return;const rows=[['Métrica','Valor'],['Facturación',formatCurrency(m.monthlyRevenue)],['Objetivo',formatCurrency(m.monthlyGoal)],['Leads activos',String(m.activeLeads)],['Tasa de cierre',`${m.closeRate.toFixed(1)}%`],['Ticket promedio',formatCurrency(m.avgTicket)]];const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`austral-growth-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}

  if(isLoading)return <div className="flex flex-1 items-center justify-center"><div className="flex items-center gap-3 text-xs text-zinc-500"><span className="h-2 w-2 animate-pulse rounded-full bg-orange-400"/>Preparando tu espacio…</div></div>

  return <>
    <Topbar title="Overview" subtitle="Austral Growth OS" primaryAction={{label:'Nuevo lead',onClick:()=>setModalOpen(true)}}/>
    <div className="dashboard-scroll flex-1 overflow-y-auto"><div className="mx-auto max-w-[1500px] px-4 pb-16 pt-8 md:px-9 md:pt-11">
      {isError&&<div className="mb-6 rounded-2xl border border-rose-400/15 bg-rose-400/[.06] p-4 text-xs text-rose-300">No se pudo cargar el dashboard: {(error as Error)?.message}</div>}

      <header className="apple-reveal mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-400"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50"/><span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400"/></span>Sistema actualizado</div><h1 className="text-[36px] font-semibold leading-none tracking-[-.055em] text-[#f5f5f7] md:text-[52px]" suppressHydrationWarning>{now?greet(now.getHours()):'Hola'}, Bruno.</h1><p className="mt-3 text-[13px] text-zinc-500">Todo lo importante de Austral, en una sola vista.</p></div>
        <button onClick={exportReport} className="flex w-fit items-center gap-2 rounded-full border border-white/[.085] bg-white/[.045] px-4 py-2.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/[.08]"><i className="ti ti-download"/>Exportar reporte</button>
      </header>

      <section className="apple-reveal apple-delay-1 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_.72fr]">
        <article className="apple-hero relative min-h-[430px] overflow-hidden p-7 md:p-10">
          <div className="apple-orb"/><div className="relative z-10 flex h-full flex-col justify-between">
            <div><div className="mb-7 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.17em] text-zinc-400"><span className="grid h-6 w-6 place-items-center rounded-lg bg-white text-black"><i className="ti ti-sparkles"/></span>Austral Intelligence</div><h2 className="max-w-[760px] text-[38px] font-semibold leading-[1.03] tracking-[-.06em] text-white md:text-[64px]">Este mes generaste <span className="apple-gradient-text">{formatCurrency(m?.monthlyRevenue??0)}</span>.</h2><div className="mt-6 max-w-[650px] text-[13px] leading-6 text-zinc-400"><BoldText text={insight}/></div></div>
            <div className="mt-12"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] text-zinc-500">Progreso del objetivo</p><p className="mt-1 text-sm font-medium text-white">{Math.round(progress)}% completado</p></div><p className="text-[11px] text-zinc-500">Faltan {formatCurrency(remaining)}</p></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.075]"><div className="h-full rounded-full bg-gradient-to-r from-[#ff6a00] to-[#ffad66] shadow-[0_0_18px_rgba(255,122,26,.45)]" style={{width:`${progress}%`}}/></div><div className="mt-7 flex flex-wrap gap-3"><a href="/crm" className="rounded-full bg-white px-5 py-2.5 text-[11px] font-semibold text-black transition hover:scale-[1.02]">Abrir pipeline</a><a href="/metricas" className="rounded-full bg-white/[.065] px-5 py-2.5 text-[11px] font-medium text-white transition hover:bg-white/[.1]">Ver análisis <i className="ti ti-arrow-up-right ml-1"/></a></div></div>
          </div>
        </article>

        <article className="apple-card flex min-h-[430px] flex-col p-7"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-zinc-600">Salud comercial</p><h3 className="mt-2 text-base font-semibold text-white">Performance</h3></div><span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[9px] text-zinc-400">En vivo</span></div><div className="my-auto flex flex-col items-center"><div className="relative grid h-44 w-44 place-items-center rounded-full" style={{background:`conic-gradient(#ff7a1a ${m?.businessScore??0}%,rgba(255,255,255,.065) 0)`}}><div className="absolute inset-[9px] rounded-full bg-[#19191b] shadow-[inset_0_0_35px_rgba(0,0,0,.4)]"/><div className="relative text-center"><strong className="font-mono text-5xl font-semibold tracking-[-.07em] text-white">{Math.round(m?.businessScore??0)}</strong><p className="mt-1 text-[9px] uppercase tracking-widest text-zinc-600">sobre 100</p></div></div></div><div className="space-y-3">{(m?.businessScoreBreakdown??[]).map(x=><div key={x.label}><div className="mb-1.5 flex justify-between text-[10px]"><span className="text-zinc-500">{x.label}</span><span className="font-mono text-zinc-300">{x.value}%</span></div><div className="h-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-zinc-300" style={{width:`${x.value}%`}}/></div></div>)}</div></article>
      </section>

      <section className="apple-reveal apple-delay-2 mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi title="Ingresos del mes" value={formatCurrency(m?.monthlyRevenue??0)} detail={`Objetivo ${formatCurrency(m?.monthlyGoal??0)}`} icon="ti-currency-dollar" trend={m?.revenueDelta}/><Kpi title="Nuevas oportunidades" value={String(m?.newLeadsThisMonth??0)} detail={`${m?.activeLeads??0} leads activos`} icon="ti-users" trend={m?.newLeadsDelta}/><Kpi title="Conversión comercial" value={`${(m?.closeRate??0).toFixed(0)}%`} detail="Tasa de cierre global" icon="ti-chart-dots-3"/><Kpi title="Ticket promedio" value={formatCurrency(m?.avgTicket??0)} detail="Por negocio ganado" icon="ti-receipt"/></section>

      <section className="apple-reveal apple-delay-3 mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <article className="apple-card p-6 md:p-7"><div className="mb-7 flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Facturación</p><h3 className="mt-2 text-base font-semibold text-white">Evolución {new Date().getFullYear()}</h3></div><span className="rounded-full border border-white/[.06] px-3 py-1 text-[9px] text-zinc-500">USD</span></div><div className="h-[235px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={m?.monthlyChart??[]} barCategoryGap="32%"><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:'#6e6e73',fontSize:10}} dy={10}/><Tooltip cursor={{fill:'rgba(255,255,255,.025)'}} content={<Tip/>}/><Bar dataKey="revenue" fill="#f5f5f7" radius={[8,8,8,8]}/></BarChart></ResponsiveContainer></div></article>
        <article className="apple-card p-6 md:p-7"><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Pipeline</p><h3 className="mt-2 text-base font-semibold text-white">Embudo comercial</h3><div className="mt-7 space-y-4">{(m?.funnelData??[]).filter(x=>!['WON','LOST'].includes(x.stage)).slice(0,6).map((x,i)=>{const max=Math.max(...(m?.funnelData??[]).map(y=>y.count),1);return <div key={x.stage}><div className="mb-2 flex justify-between text-[10px]"><span className="text-zinc-400">{x.label}</span><span className="font-mono text-zinc-500">{x.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full" style={{width:`${Math.max(x.count/max*100,3)}%`,background:stageColors[i]}}/></div></div>})}</div></article>
      </section>

      <section className="apple-reveal apple-delay-3 mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="apple-card p-6 md:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Agenda</p><h3 className="mt-2 text-base font-semibold text-white">Próximos seguimientos</h3></div><a href="/crm" className="text-[10px] text-zinc-500 hover:text-white">Ver todos <i className="ti ti-arrow-right"/></a></div><div className="space-y-2">{!(m?.upcomingFollowUps??[]).length&&<div className="rounded-2xl bg-white/[.025] p-6 text-center text-[11px] text-zinc-600">No hay seguimientos próximos.</div>}{(m?.upcomingFollowUps??[]).map(x=><div key={x.id} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-white/[.035]"><div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-[10px] font-semibold text-white">{x.companyName.slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-white">{x.companyName}</p><p className="mt-1 text-[9.5px] text-zinc-600">{x.nextFollowUpAt?formatRelativeTime(x.nextFollowUpAt):'Pendiente'}</p></div>{x.isHot&&<span className="rounded-full bg-orange-400/10 px-2 py-1 text-[9px] text-orange-300">Prioridad</span>}</div>)}</div></article>
        <article className="apple-card relative overflow-hidden p-6 md:p-7"><div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-violet-500/[.08] blur-3xl"/><div className="relative"><div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-[13px] bg-gradient-to-br from-violet-400 to-indigo-600 text-white shadow-lg shadow-violet-900/20"><i className="ti ti-sparkles"/></div><div><p className="text-[10px] uppercase tracking-[.15em] text-zinc-600">Inteligencia comercial</p><h3 className="mt-1 text-base font-semibold text-white">Alertas importantes</h3></div></div><div className="space-y-2">{(m?.alerts??[]).map((x,i)=><div key={i} className="flex gap-3 rounded-2xl border border-white/[.045] bg-white/[.025] p-4"><i className={`ti ${alertIcons[x.type]} mt-0.5 text-sm text-zinc-400`}/><BoldText text={x.text} className="text-[11px] leading-5 text-zinc-400"/></div>)}</div></div></article>
      </section>
    </div></div><LeadFormModal open={modalOpen} onClose={()=>setModalOpen(false)}/>
  </>
}
