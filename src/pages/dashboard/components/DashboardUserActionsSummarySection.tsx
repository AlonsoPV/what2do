import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Trophy, UsersRound } from 'lucide-react'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AccionDiaria, ActionStatus } from '@/types'
import type { AccionComentario } from '@/types/accionComentario'
import type { UserProfile } from '@/features/users/types/user.types'
import { buildActionGamificationMetrics } from '@/features/disciplina/utils/actionGamification'
import { isEnRetraso } from '@/features/operations/utils/accionUtils'

const CLOSED_STATES = new Set<ActionStatus>(['Completada'])

interface DashboardUserActionsSummarySectionProps {
  users: UserProfile[]
  acciones: AccionDiaria[]
  comentarios: AccionComentario[]
  today: string
  isLoading?: boolean
}

interface UserActionsSummaryRow {
  userId: string
  nombre: string
  area: string | null
  abiertas: number
  retraso: number
  bloqueadas: number
  gamificationPoints: number
}

type SortKey = 'nombre' | 'abiertas' | 'retraso' | 'bloqueadas' | 'gamificationPoints'
type SortDir = 'asc' | 'desc'

function isOpenAction(accion: AccionDiaria) {
  return !CLOSED_STATES.has(accion.estado)
}

function buildRows(
  users: UserProfile[],
  acciones: AccionDiaria[],
  comentarios: AccionComentario[],
  today: string
): UserActionsSummaryRow[] {
  return users
    .map((user) => {
      const assignedOpenActions = acciones.filter(
        (accion) => accion.responsable === user.id && isOpenAction(accion)
      )
      const gamificationPoints = buildActionGamificationMetrics(
        user.id,
        acciones,
        comentarios,
        today
      ).totalPoints

      return {
        userId: user.id,
        nombre: user.nombre,
        area: user.area,
        abiertas: assignedOpenActions.length,
        retraso: assignedOpenActions.filter(
          (accion) => accion.estado === 'Retrasa' || isEnRetraso(accion)
        ).length,
        bloqueadas: assignedOpenActions.filter((accion) => accion.estado === 'En_Pausa').length,
        gamificationPoints,
      }
    })
}

function compareRows(a: UserActionsSummaryRow, b: UserActionsSummaryRow, sortKey: SortKey, sortDir: SortDir) {
  let cmp = 0
  if (sortKey === 'nombre') {
    cmp = a.nombre.localeCompare(b.nombre, 'es')
  } else {
    cmp = a[sortKey] - b[sortKey]
  }

  if (cmp === 0) {
    cmp =
      b.abiertas - a.abiertas ||
      b.retraso - a.retraso ||
      b.bloqueadas - a.bloqueadas ||
      a.nombre.localeCompare(b.nombre, 'es')
  }

  return sortDir === 'asc' ? cmp : -cmp
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  sortDir,
  onSort,
  align = 'right',
  className,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const active = activeKey === sortKey
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <th className={cn('px-4 py-3 font-semibold', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex w-full items-center gap-1.5 rounded-md text-xs font-semibold transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          align === 'right' ? 'justify-end text-right' : 'justify-start text-left',
          active ? 'text-foreground' : 'text-muted-foreground'
        )}
        aria-label={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <Icon className={cn('h-3.5 w-3.5', !active && 'opacity-45')} aria-hidden />
      </button>
    </th>
  )
}

function DashboardUserActionsSkeleton() {
  return (
    <div className="space-y-0" aria-busy="true" aria-label="Cargando resumen por usuario">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="grid grid-cols-5 gap-3 border-b border-border/35 py-3 last:border-b-0">
          <div className="col-span-2 h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export function DashboardUserActionsSummarySection({
  users,
  acciones,
  comentarios,
  today,
  isLoading,
}: DashboardUserActionsSummarySectionProps) {
  const [sortKey, setSortKey] = useState<SortKey>('abiertas')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'nombre' ? 'asc' : 'desc')
  }

  const rows = useMemo(
    () => buildRows(users, acciones, comentarios, today).sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [users, acciones, comentarios, today, sortKey, sortDir]
  )

  return (
    <section id="dashboard-user-actions-summary-section" className="scroll-mt-4">
      <SectionCard>
        <SectionCardHeader
          className="px-3 py-3 sm:px-4 sm:py-4 md:px-6"
          icon={UsersRound}
          eyebrow="Usuarios"
          title="Carga operativa por usuario"
          subtitle="Acciones abiertas, retrasos, bloqueos y total de puntos de gamificacion segun filtros activos."
        />
        <SectionCardBody className="p-0">
          {isLoading ? (
            <div className="p-4 md:p-6">
              <DashboardUserActionsSkeleton />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <UsersRound className="h-9 w-9 text-muted-foreground/40" aria-hidden />
              <p className="text-sm font-medium text-foreground">No hay usuarios activos para mostrar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                    <SortableHead
                      label="Usuario"
                      sortKey="nombre"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      align="left"
                      className="md:px-6"
                    />
                    <SortableHead
                      label="Acciones abiertas"
                      sortKey="abiertas"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label="En retraso"
                      sortKey="retraso"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label="Bloqueadas"
                      sortKey="bloqueadas"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label="Puntos de gamificacion"
                      sortKey="gamificationPoints"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="md:px-6"
                    />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.userId}
                      className="group border-b border-border/35 transition-colors last:border-b-0 hover:bg-muted/25"
                    >
                      <td className="px-4 py-3 align-middle md:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
                            {row.nombre.slice(0, 2).toLocaleUpperCase('es')}
                          </div>
                          <div className="min-w-0">
                          <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                            {row.nombre}
                          </p>
                          {row.area ? (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.area}</p>
                          ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <Badge variant="secondary" className="justify-center tabular-nums">
                          {row.abiertas}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            row.retraso > 0 ? 'text-orange-600' : 'text-muted-foreground'
                          )}
                        >
                          {row.retraso}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            row.bloqueadas > 0 ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {row.bloqueadas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle md:px-6">
                        <span
                          className={cn(
                            'inline-flex items-center justify-end gap-1.5 font-semibold tabular-nums',
                            row.gamificationPoints < 0 ? 'text-destructive' : 'text-foreground'
                          )}
                        >
                          <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                          {row.gamificationPoints}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCardBody>
      </SectionCard>
    </section>
  )
}
