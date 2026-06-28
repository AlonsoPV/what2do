import { useMemo, useState, useCallback } from 'react'
import { ClipboardList, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AccionFormDialog, useAcciones } from '@/features/operations'
import { AccionPriorityBadge } from '@/features/operations/components/AccionPriorityBadge'
import {
  accionEstadoBadgeClass,
  accionEstadoLabel,
  getAccionDisplayEstado,
} from '@/features/operations/utils/accionEstadoDisplay'
import { resolveInstruccionesFromAccion } from '@/features/operations/utils/descripcionAccionTriada'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { isAnalystByRole } from '@/features/auth/lib/permissions'
import type { AccionDiaria, ActionStatus } from '@/types'
import { ACTION_STATUS } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'
import { cn } from '@/lib/utils'
import { todayWallClockCDMX } from '@/lib/dateUtils'

const ALL_FILTER = '__all__'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return value
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function compact(value: string | null | undefined): string {
  return value?.trim() || '—'
}

function ClampedText({
  text,
  className,
  lines = 2,
}: {
  text: string
  className?: string
  lines?: 1 | 2 | 3
}) {
  const lineClass =
    lines === 1 ? 'line-clamp-1' : lines === 3 ? 'line-clamp-3' : 'line-clamp-2'
  return (
    <p className={cn(lineClass, className)} title={text}>
      {text}
    </p>
  )
}

function TaskpoolEstadoBadge({ accion }: { accion: AccionDiaria }) {
  const estado = getAccionDisplayEstado(accion)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold',
        accionEstadoBadgeClass(estado)
      )}
    >
      {accionEstadoLabel(estado)}
    </span>
  )
}

function TaskpoolCard({
  accion,
  responsableName,
  onOpen,
}: {
  accion: AccionDiaria
  responsableName: string
  onOpen: () => void
}) {
  const instrucciones = resolveInstruccionesFromAccion(accion)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {compact(accion.no_actividad)}
          </p>
          <p className="mt-1 font-semibold text-foreground">{compact(accion.titulo_accion)}</p>
        </div>
        <TaskpoolEstadoBadge accion={accion} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <AccionPriorityBadge prioridad={accion.prioridad} compact />
        {accion.area ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {accion.area}
          </span>
        ) : null}
      </div>
      {instrucciones.trim() ? (
        <ClampedText text={instrucciones} className="mt-3 text-sm text-muted-foreground" lines={3} />
      ) : null}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Responsable</dt>
          <dd className="font-medium text-foreground">{responsableName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Término</dt>
          <dd className="font-medium tabular-nums text-foreground">{formatDate(accion.fecha)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Objetivo</dt>
          <dd className="font-medium text-foreground">{compact(accion.objetivo)}</dd>
        </div>
      </dl>
    </button>
  )
}

export function TaskpoolPage() {
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState(ALL_FILTER)
  const [responsableFilter, setResponsableFilter] = useState(ALL_FILTER)
  const [estadoFilter, setEstadoFilter] = useState(ALL_FILTER)
  const [editingAccion, setEditingAccion] = useState<AccionDiaria | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: currentUser } = useCurrentUser()
  const isAnalyst = isAnalystByRole(currentUser?.rol)

  const filter = useMemo<AccionesFilter>(() => {
    const base: AccionesFilter = {}
    if (search.trim()) base.search = search.trim()
    if (isAnalyst && currentUser?.id) {
      base.responsable = currentUser.id
    } else if (responsableFilter !== ALL_FILTER) {
      base.responsable = responsableFilter
    }
    if (areaFilter !== ALL_FILTER) base.area = areaFilter
    if (estadoFilter !== ALL_FILTER) base.estado = estadoFilter as ActionStatus
    return base
  }, [areaFilter, currentUser?.id, estadoFilter, isAnalyst, responsableFilter, search])

  const { data: acciones = [], isLoading, isError, error, refetch } = useAcciones(filter)
  const { data: users = [] } = useUsers({ activo: true })
  const { data: areas = [] } = useAreas({ activo: true })

  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => {
      map[u.id] = u.nombre
    })
    return map
  }, [users])

  const rows = useMemo(
    () =>
      [...acciones].sort(
        (a, b) =>
          (a.fecha_inicio ?? a.created_at ?? '').localeCompare(b.fecha_inicio ?? b.created_at ?? '') ||
          a.fecha.localeCompare(b.fecha) ||
          (a.no_actividad ?? '').localeCompare(b.no_actividad ?? '', 'es')
      ),
    [acciones]
  )

  const hasActiveFilters =
    search.trim() !== '' ||
    areaFilter !== ALL_FILTER ||
    responsableFilter !== ALL_FILTER ||
    estadoFilter !== ALL_FILTER

  const clearFilters = useCallback(() => {
    setSearch('')
    setAreaFilter(ALL_FILTER)
    setResponsableFilter(ALL_FILTER)
    setEstadoFilter(ALL_FILTER)
  }, [])

  const openEditAction = useCallback((accion: AccionDiaria) => {
    setEditingAccion(accion)
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setEditingAccion(null)
    setDialogOpen(false)
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-5 px-3 py-5 sm:px-6 sm:py-6">
      <header className="rounded-xl border border-border/60 bg-card px-4 py-4 shadow-sm sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Operaciones
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Pool de actividades
              </h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Vista tabular de actividades con instrucciones, responsables y fechas clave.
          </p>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="space-y-3 border-b border-border/50 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm font-semibold text-foreground">
              <span className="tabular-nums">{rows.length}</span>{' '}
              {rows.length === 1 ? 'actividad' : 'actividades'}
            </p>
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, instrucciones u objetivo"
                className="h-10 pl-9 pr-9"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {!isAnalyst ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Select value={responsableFilter} onValueChange={setResponsableFilter}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Todos los responsables</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Todas las áreas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.nombre}>
                      {area.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Todos los estados</SelectItem>
                  {ACTION_STATUS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {accionEstadoLabel(estado)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters ? (
                <Button type="button" variant="outline" className="h-10" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <div className="hidden xl:block" aria-hidden />
              )}
            </div>
          ) : null}
        </div>

        {isError ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">No se pudo cargar taskpool.</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Revisa la conexión o permisos e intenta nuevamente.'}
            </p>
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-3 p-4 md:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/50" aria-hidden />
            <p className="text-sm font-semibold text-foreground">Sin actividades para mostrar</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'Prueba con otros filtros o limpia la búsqueda.'
                : 'Aún no hay actividades registradas en el pool.'}
            </p>
            {hasActiveFilters ? (
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {rows.map((accion) => (
                <TaskpoolCard
                  key={accion.id}
                  accion={accion}
                  responsableName={responsableNames[accion.responsable] ?? '—'}
                  onOpen={() => openEditAction(accion)}
                />
              ))}
            </div>

            <div className="hidden overflow-auto md:block">
              <Table className="min-w-[920px] border-separate border-spacing-0">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 top-0 z-20 w-[88px] border-b border-r border-border/70 bg-muted/90 px-3 py-3 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                      No.
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 min-w-[200px] border-b border-r border-border/70 bg-muted/90 px-3 py-3 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                      Actividad
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 min-w-[240px] border-b border-r border-border/70 bg-muted/90 px-3 py-3 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                      Instrucciones
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 min-w-[180px] border-b border-r border-border/70 bg-muted/90 px-3 py-3 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                      Objetivo
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 w-[140px] border-b border-r border-border/70 bg-muted/90 px-3 py-3 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                      Área / Resp.
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 w-[170px] border-b border-r border-border/70 bg-muted/90 px-3 py-3 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                      Fechas
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 min-w-[160px] border-b border-border/70 bg-muted/90 px-3 py-3 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                      Evidencia
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((accion, rowIndex) => {
                    const instrucciones = resolveInstruccionesFromAccion(accion)
                    const responsableName = responsableNames[accion.responsable] ?? '—'
                    return (
                      <TableRow
                        key={accion.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-primary/[0.04]',
                          rowIndex % 2 === 1 && 'bg-muted/[0.14]'
                        )}
                        onClick={() => openEditAction(accion)}
                      >
                        <TableCell
                          className={cn(
                            'sticky left-0 z-[1] border-b border-r border-border/50 px-3 py-3 align-top font-semibold tabular-nums text-foreground',
                            rowIndex % 2 === 1 ? 'bg-muted/[0.14]' : 'bg-card'
                          )}
                        >
                          {compact(accion.no_actividad)}
                        </TableCell>
                        <TableCell className="border-b border-r border-border/50 px-3 py-3 align-top">
                          <p className="font-medium text-foreground">{compact(accion.titulo_accion)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <TaskpoolEstadoBadge accion={accion} />
                            <AccionPriorityBadge prioridad={accion.prioridad} compact />
                          </div>
                        </TableCell>
                        <TableCell className="border-b border-r border-border/50 px-3 py-3 align-top text-sm text-muted-foreground">
                          <ClampedText text={instrucciones} lines={3} />
                        </TableCell>
                        <TableCell className="border-b border-r border-border/50 px-3 py-3 align-top text-sm text-foreground">
                          <ClampedText text={compact(accion.objetivo)} lines={2} />
                        </TableCell>
                        <TableCell className="border-b border-r border-border/50 px-3 py-3 align-top text-sm">
                          <p className="font-medium text-foreground">{compact(accion.area)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{responsableName}</p>
                        </TableCell>
                        <TableCell className="border-b border-r border-border/50 px-3 py-3 align-top text-sm tabular-nums">
                          <p>
                            <span className="text-muted-foreground">Inicio: </span>
                            {formatDate(accion.fecha_inicio ?? accion.created_at)}
                          </p>
                          <p className="mt-1">
                            <span className="text-muted-foreground">Término: </span>
                            {formatDate(accion.fecha)}
                          </p>
                        </TableCell>
                        <TableCell className="border-b border-border/50 px-3 py-3 align-top text-sm text-muted-foreground">
                          <ClampedText text={compact(accion.evidencia_esperada)} lines={2} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <AccionFormDialog
        dialogId="taskpool-accion-dialog"
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        accion={editingAccion}
        defaultFecha={todayWallClockCDMX()}
        onSuccess={closeDialog}
        responsableNames={responsableNames}
      />
    </div>
  )
}
