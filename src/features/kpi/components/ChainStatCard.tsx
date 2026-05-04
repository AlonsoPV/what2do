import { InfoHint } from '@/components/InfoHint'
import { cn } from '@/lib/utils'

type ChainStatCardProps = {
  label: string
  value: string | number
  hint?: string
  color?: 'primary' | 'emerald' | 'amber' | 'muted'
  /** Muestra esqueleto en lugar del valor */
  isLoading?: boolean
}

const COLOR_VALUE: Record<NonNullable<ChainStatCardProps['color']>, string> = {
  primary: 'text-primary',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  muted: 'text-foreground',
}

export function ChainStatCard({ label, value, hint, color = 'muted', isLoading }: ChainStatCardProps) {
  const valueStr = isLoading ? '' : String(value)
  return (
    <div className="flex min-h-[80px] flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {hint && !isLoading ? <InfoHint text={hint} className="ml-1" /> : null}
      </p>
      {isLoading ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-muted" aria-hidden />
      ) : (
        <p
          className={cn(
            'mt-1.5 font-semibold tabular-nums',
            valueStr.length > 8 ? 'text-xl' : 'text-2xl',
            COLOR_VALUE[color]
          )}
        >
          {value}
        </p>
      )}
    </div>
  )
}
