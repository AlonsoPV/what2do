import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm', className)}>
      {children}
    </div>
  )
}

export function SectionCardHeader({
  eyebrow,
  title,
  titleId,
  subtitle,
  icon: Icon,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  /** Para `aria-labelledby` en la sección contenedora. */
  titleId?: string
  subtitle?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border/50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h2 id={titleId} className="text-[15px] font-semibold leading-snug text-foreground sm:text-base">
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {action ? (
        <div className="w-full min-w-0 shrink-0 sm:w-auto sm:max-w-[min(100%,28rem)]">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export function SectionCardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('p-4 sm:p-6', className)}>{children}</div>
}
