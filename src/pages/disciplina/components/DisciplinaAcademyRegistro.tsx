import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, GraduationCap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import { ACADEMY_MODULES, ACADEMY_TOTAL_MODULES, useAcademyProgress } from '@/features/academy'
import {
  academyGlobalProgressPercent,
  countAcademyModuleBuckets,
} from '@/features/academy/utils/academyProgress'

/**
 * Bloque compacto de Academia en Disciplina: progreso visual + conteos; el detalle vive en /academia.
 */
export function DisciplinaAcademyRegistro() {
  const { completedCount, isLoading, isSaving, error, progress, isModuleUnlocked } = useAcademyProgress()
  const percent = academyGlobalProgressPercent(completedCount, ACADEMY_TOTAL_MODULES)

  const buckets = useMemo(
    () => countAcademyModuleBuckets(progress, ACADEMY_MODULES, isModuleUnlocked),
    [progress, isModuleUnlocked]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/50 bg-muted/20 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Formación</p>
              <h3 className="text-base font-semibold tracking-tight text-foreground">Academia O2C</h3>
            </div>
          </div>
          {isSaving ? <span className="shrink-0 text-[11px] text-muted-foreground">Guardando…</span> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando progreso…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {percent}%
                </span>
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{completedCount}</span>
                  {' / '}
                  {ACADEMY_TOTAL_MODULES} módulos completados
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <Link
              to={ROUTES.ACADEMIA}
              className="group block rounded-xl border border-border/60 bg-background/80 px-3 py-3 transition-colors hover:border-primary/30 hover:bg-background"
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Módulos — ver detalle
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{buckets.pendientes}</p>
                  <p className="text-[11px] text-muted-foreground">Pendientes</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                    {buckets.enProgreso}
                  </p>
                  <p className="text-[11px] text-muted-foreground">En progreso</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {buckets.completados}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Completados</p>
                </div>
              </div>
              <p className="mt-2 flex items-center justify-center gap-0.5 text-[11px] font-medium text-primary opacity-90 group-hover:underline">
                Abrir Academia
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </p>
            </Link>

            <Button className="h-10 w-full rounded-xl font-medium shadow-sm" asChild>
              <Link to={ROUTES.ACADEMIA}>Continuar formación</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
