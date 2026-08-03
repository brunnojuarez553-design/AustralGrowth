'use client'

interface GoalRingProps {
  percent: number
  size?: number
  strokeWidth?: number
}

export function GoalRing({ percent, size = 152, strokeWidth = 12 }: GoalRingProps) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  const center = size / 2

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Resplandor suave detrás del anillo */}
      <div
        className="absolute inset-[10%] rounded-full blur-2xl opacity-40"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
        <defs>
          <linearGradient id="goalRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="55%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-hover)" />
          </linearGradient>
        </defs>
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="url(#goalRingGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-bold font-mono text-[var(--text)] tracking-tight leading-none">
          {Math.round(clamped)}%
        </span>
        <span className="text-[10px] text-[var(--text-3)] mt-1">del objetivo</span>
      </div>
    </div>
  )
}
