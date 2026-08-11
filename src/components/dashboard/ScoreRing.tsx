'use client'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  showBadge?: boolean
}

export function statusFor(score: number) {
  if (score >= 90) return { label: 'Excelente', color: 'var(--green)', bg: 'rgba(16,185,129,0.15)' }
  if (score >= 75) return { label: 'Muy bueno', color: '#FDBA74', bg: 'rgba(249,115,22,0.15)' }
  if (score >= 50) return { label: 'Bueno', color: 'var(--amber)', bg: 'rgba(245,158,11,0.15)' }
  return { label: 'Necesita atención', color: '#FCA5A5', bg: 'rgba(239,68,68,0.15)' }
}

export function ScoreRing({ score, size = 140, strokeWidth = 11, showBadge = true }: ScoreRingProps) {
  const clamped = Math.min(Math.max(score, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  const center = size / 2
  const status = statusFor(clamped)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-[8%] rounded-full blur-2xl opacity-40"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
        <defs>
          <linearGradient id="scoreRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="45%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-hover)" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="url(#scoreRingGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-bold text-white tracking-tight leading-none">
          {Math.round(clamped)}<span className="text-[16px] text-white/50 font-medium">/100</span>
        </span>
      </div>
      {showBadge && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9.5px] font-semibold px-2 py-[3px] rounded-full whitespace-nowrap"
          style={{ background: status.bg, color: status.color }}
        >
          {status.label}
        </div>
      )}
    </div>
  )
}
