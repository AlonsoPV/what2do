/**
 * Métricas de Disciplina (spec §5.4, §12).
 * DisciplinaCard: % cumplimiento, acciones sin evidencia, racha días verde, reincidencias.
 * TODO: cálculo automático de medicion_disciplina en BD (spec §16.8); mientras tanto se calcula desde acciones.
 */

import { useState } from 'react'
import { DisciplinaCard, useDisciplinaMetrics } from '@/features/metrics'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { todayCDMX } from '@/lib/dateUtils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DisciplinaAcademyRegistro } from './components/DisciplinaAcademyRegistro'
import { DisciplinaAccionesCard } from './components/DisciplinaAccionesCard'

const DISCIPLINA_INFO =
  'Métricas de tu desempeño operativo: porcentaje de acciones cerradas con evidencia, acciones en estado Hecho/Verificado sin evidencia cargada, racha de días con cumplimiento ≥90% y reincidencias. Se calculan a partir de las acciones asignadas a tu usuario en la fecha seleccionada.'

export function DisciplinaPage() {
  const today = todayCDMX()
  const [fecha, setFecha] = useState(today)
  const { data: currentUser } = useCurrentUser()
  const { data: metrics, isLoading, isError } = useDisciplinaMetrics(currentUser?.id, fecha)

  const fechaLabel =
    fecha === today ? 'Hoy' : new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { dateStyle: 'medium' })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Métricas de disciplina</h2>
          <div className="group relative shrink-0">
            <button
              type="button"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
              )}
              title="Ver descripción"
              aria-label={DISCIPLINA_INFO}
            >
              <Info className="h-4 w-4" />
            </button>
            <div
              role="tooltip"
              className={cn(
                'pointer-events-none absolute left-0 top-full z-50 mt-1.5 max-w-[320px] rounded-lg border border-border/80 bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-lg',
                'opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
                'border-l-4 border-l-primary'
              )}
            >
              <p className="leading-snug text-muted-foreground">{DISCIPLINA_INFO}</p>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-0.5">
          Seguimiento de formación (Academia), acciones del día y métricas de cumplimiento (spec §5.4).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="disciplina-fecha">Fecha de referencia</Label>
          <Input
            id="disciplina-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="disciplina-seguimiento-heading">
        <h3 id="disciplina-seguimiento-heading" className="text-lg font-semibold tracking-tight">
          Seguimiento: registro de Academia y acciones
        </h3>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <DisciplinaAcademyRegistro />
          <DisciplinaAccionesCard fecha={fecha} usuarioId={currentUser?.id} />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="disciplina-metricas-heading">
        <h3 id="disciplina-metricas-heading" className="text-lg font-semibold tracking-tight">
          Indicadores de disciplina
        </h3>
        {!currentUser ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
            Inicia sesión para ver tus métricas de disciplina.
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudieron cargar las métricas.
          </div>
        ) : isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <p className="text-sm text-muted-foreground">Cargando…</p>
          </div>
        ) : metrics ? (
          <DisciplinaCard metrics={metrics} fechaLabel={fechaLabel} />
        ) : null}
      </section>
    </div>
  )
}
