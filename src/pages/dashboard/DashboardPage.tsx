/**
 * Dashboard operativo: cola de atencion, patrones y desempeno por area.
 */

import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AccionFormDialog,
  useAcciones,
} from '@/features/operations'
import { isEnRetraso } from '@/features/operations/utils/accionUtils'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { AccionDiaria } from '@/types'
import type { AccionesFilter } from '@/services/acciones.service'
import {
  dropdownOptionsByCatalogKeyQueryKey,
  fetchDropdownOptionsByCatalogKey,
} from '@/features/catalogs/hooks/useDropdownOptions'
import { DashboardHeader } from './components/DashboardHeader'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, BarChart3, BrainCircuit, ClipboardList, Target } from 'lucide-react'
import { todayWallClockCDMX } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'

const DEFAULT_FILTER: AccionesFilter = {}
const CLOSED_STATUS = 'Completada'

type PatternTone = 'danger' | 'warning' | 'success' | 'neutral'

type PatternInsight = {
  title: string
  value: string
  detail: string
  tone: PatternTone
}

type AreaPerformanceRow = {
  area: string
  total: number
  completed: number
  delayed: number
  open: number
  completionRate: number
  delayRate: number
  avgDaysLate: number
  focus: string
  recommendation: string
}

type AttentionRow = {
  accion: AccionDiaria
  reason: string
  recommendation: string
  severity: 'alta' | 'media' | 'baja'
  score: number
}

function areaName(accion: AccionDiaria): string {
  return accion.area?.trim() || 'Sin area'
}

function responsableName(
  accion: AccionDiaria,
  responsableNames: Record<string, string>
): string {
  return (
    (accion.responsable ? responsableNames[accion.responsable] : undefined) ??
    'Sin responsable'
  )
}

function isClosed(accion: AccionDiaria): boolean {
  return accion.estado === CLOSED_STATUS
}

function isDelayed(accion: AccionDiaria): boolean {
  return accion.estado === 'Retrasa' || isEnRetraso(accion)
}

function toDateMs(ymd: string | null | undefined): number | null {
  if (!ymd) return null
  const [year, month, day] = ymd.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day).getTime()
}

function daysLate(accion: AccionDiaria, today: string): number {
  if (!isDelayed(accion)) return 0
  const dueMs = toDateMs(accion.fecha)
  const todayMs = toDateMs(today)
  if (dueMs == null || todayMs == null || dueMs >= todayMs) return 0
  return Math.floor((todayMs - dueMs) / 86_400_000)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const ms = toDateMs(value)
  if (ms == null) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ms))
}

function countBy(items: AccionDiaria[], getKey: (accion: AccionDiaria) => string): Map<string, number> {
  const counts = new Map<string, number>()
  items.forEach((item) => {
    const key = getKey(item).trim() || 'Sin dato'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return counts
}

function topCount(counts: Map<string, number>): { key: string; count: number } | null {
  let top: { key: string; count: number } | null = null
  counts.forEach((count, key) => {
    if (!top || count > top.count) top = { key, count }
  })
  return top
}

function isDueTodayOrSoon(accion: AccionDiaria, today: string): boolean {
  if (isClosed(accion)) return false
  const dueMs = toDateMs(accion.fecha)
  const todayMs = toDateMs(today)
  return dueMs != null && todayMs != null && dueMs >= todayMs && dueMs <= todayMs + 86_400_000
}

function lacksEvidenceDefinition(accion: AccionDiaria): boolean {
  return !accion.evidencia_esperada?.trim()
}

function lacksResponsible(accion: AccionDiaria): boolean {
  return !accion.responsable?.trim()
}

function getAttentionQueue(acciones: AccionDiaria[], today: string): AttentionRow[] {
  return acciones
    .filter((accion) => !isClosed(accion))
    .map((accion): AttentionRow | null => {
      const lateDays = daysLate(accion, today)
      if (isDelayed(accion)) {
        return {
          accion,
          reason: lateDays > 0 ? `${lateDays} dias de atraso` : 'Marcada como retrasada',
          recommendation:
            lateDays >= 3
              ? 'Replanear fecha compromiso, confirmar bloqueo y reasignar apoyo si aplica.'
              : 'Confirmar avance hoy y cerrar evidencia pendiente.',
          severity: 'alta',
          score: 300 + lateDays,
        }
      }

      if (isDueTodayOrSoon(accion, today)) {
        return {
          accion,
          reason: 'Vence hoy o manana',
          recommendation: 'Pedir confirmacion de entrega y evidencia antes del cierre del dia.',
          severity: 'media',
          score: 200,
        }
      }

      if (lacksResponsible(accion)) {
        return {
          accion,
          reason: 'Sin responsable asignado',
          recommendation: 'Asignar responsable para evitar que quede fuera del seguimiento diario.',
          severity: 'media',
          score: 150,
        }
      }

      if (lacksEvidenceDefinition(accion)) {
        return {
          accion,
          reason: 'Sin evidencia definida',
          recommendation: 'Definir evidencia esperada para poder validar cierre sin ambiguedad.',
          severity: 'baja',
          score: 100,
        }
      }

      return null
    })
    .filter((row): row is AttentionRow => row != null)
    .sort((a, b) => b.score - a.score || a.accion.fecha.localeCompare(b.accion.fecha))
    .slice(0, 10)
}

function getPatternInsights(
  acciones: AccionDiaria[],
  responsableNames: Record<string, string>,
  today: string
): PatternInsight[] {
  const delayed = acciones.filter(isDelayed)
  const open = acciones.filter((accion) => !isClosed(accion))
  const dueSoon = open.filter((accion) => isDueTodayOrSoon(accion, today))

  const delayedArea = topCount(countBy(delayed, areaName))
  const delayedEvidence = topCount(
    countBy(delayed, (accion) => accion.evidencia_esperada?.trim() || 'Sin evidencia definida')
  )
  const delayedOwner = topCount(
    countBy(delayed, (accion) => responsableName(accion, responsableNames))
  )
  const openArea = topCount(countBy(open, areaName))
  const avgLate =
    delayed.length > 0
      ? Math.round(
          delayed.reduce((sum, accion) => sum + daysLate(accion, today), 0) / delayed.length
        )
      : 0

  return [
    {
      title: 'Patron por area',
      value: delayedArea ? delayedArea.key : 'Sin retrasos',
      detail: delayedArea
        ? `Atender primero esta area: concentra ${delayedArea.count} retrasos.`
        : 'No hay concentracion de retrasos con los filtros actuales.',
      tone: delayedArea ? 'danger' : 'success',
    },
    {
      title: 'Evidencia repetida',
      value: delayedEvidence ? delayedEvidence.key : 'Sin friccion visible',
      detail: delayedEvidence
        ? `Revisar si esta evidencia requiere aprobacion, sistema o insumo externo.`
        : 'Las evidencias no muestran un patron critico de bloqueo.',
      tone: delayedEvidence ? 'warning' : 'success',
    },
    {
      title: 'Carga responsable',
      value: delayedOwner ? delayedOwner.key : 'Balanceada',
      detail: delayedOwner
        ? `Redistribuir o desbloquear: ${delayedOwner.count} retrasos estan asignados aqui.`
        : 'No hay un responsable con retrasos acumulados.',
      tone: delayedOwner ? 'danger' : 'success',
    },
    {
      title: 'Riesgo inmediato',
      value: dueSoon.length > 0 ? `${dueSoon.length} por vencer` : openArea?.key ?? 'Sin riesgo',
      detail:
        dueSoon.length > 0
          ? `Vencen hoy o manana. Promedio de atraso actual: ${avgLate} dias.`
          : openArea
            ? `${openArea.count} actividades abiertas se concentran en esta area.`
            : 'No hay actividades abiertas en el alcance filtrado.',
      tone: dueSoon.length > 0 ? 'warning' : openArea ? 'neutral' : 'success',
    },
  ]
}

function getAreaPerformance(
  acciones: AccionDiaria[],
  today: string,
  responsableNames: Record<string, string>
): AreaPerformanceRow[] {
  const rows = new Map<
    string,
    AreaPerformanceRow & { totalLateDays: number; delayedByOwner: Map<string, number> }
  >()

  acciones.forEach((accion) => {
    const key = areaName(accion)
    const row =
      rows.get(key) ??
      ({
        area: key,
        total: 0,
        completed: 0,
        delayed: 0,
        open: 0,
        completionRate: 0,
        delayRate: 0,
        avgDaysLate: 0,
        focus: 'Mantener ritmo',
        recommendation: 'Seguimiento normal.',
        totalLateDays: 0,
        delayedByOwner: new Map<string, number>(),
      } satisfies AreaPerformanceRow & { totalLateDays: number; delayedByOwner: Map<string, number> })

    row.total += 1
    if (isClosed(accion)) row.completed += 1
    else row.open += 1
    if (isDelayed(accion)) {
      row.delayed += 1
      row.totalLateDays += daysLate(accion, today)
      const owner = responsableName(accion, responsableNames)
      row.delayedByOwner.set(owner, (row.delayedByOwner.get(owner) ?? 0) + 1)
    }
    rows.set(key, row)
  })

  return [...rows.values()]
    .map(({ totalLateDays, delayedByOwner, ...row }) => {
      const completionRate = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0
      const delayRate = row.total > 0 ? Math.round((row.delayed / row.total) * 100) : 0
      const avgDaysLate = row.delayed > 0 ? Math.round(totalLateDays / row.delayed) : 0
      const ownerFocus = topCount(delayedByOwner)
      const focus =
        row.delayed > 0 && ownerFocus
          ? `${ownerFocus.key}: ${ownerFocus.count} retrasos`
          : row.open > 0
            ? `${row.open} abiertas sin retraso`
            : 'Sin pendientes abiertos'
      const recommendation =
        delayRate >= 50
          ? 'Intervenir hoy: limpiar atrasos, redefinir fechas y desbloquear responsables.'
          : row.delayed > 0
            ? 'Dar seguimiento puntual a retrasos y pedir evidencia de avance.'
            : row.open > row.completed && row.open >= 3
              ? 'Balancear carga y validar compromisos proximos.'
              : 'Mantener seguimiento normal.'

      return {
        ...row,
        completionRate,
        delayRate,
        avgDaysLate,
        focus,
        recommendation,
      }
    })
    .sort((a, b) => b.delayed - a.delayed || b.delayRate - a.delayRate || a.area.localeCompare(b.area))
}

function LoadingRows({ columns }: { columns: number }) {
  return (
    <>
      {[1, 2, 3, 4].map((row) => (
        <TableRow key={row}>
          {Array.from({ length: columns }, (_, index) => (
            <TableCell key={index}>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function DashboardPage() {
  const qc = useQueryClient()
  const today = todayWallClockCDMX()
  const prefetchEvidenceCatalog = useCallback(async () => {
    await qc.prefetchQuery({
      queryKey: dropdownOptionsByCatalogKeyQueryKey('evidencia_esperada'),
      queryFn: () => fetchDropdownOptionsByCatalogKey('evidencia_esperada'),
      staleTime: 10 * 60_000,
    })
  }, [qc])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccion, setEditingAccion] = useState<AccionDiaria | null>(null)

  const {
    data: acciones = [],
    isLoading,
    isError: accionesError,
    error: accionesErrorObj,
    refetch: retryAcciones,
  } = useAcciones(DEFAULT_FILTER)
  const { data: users = [] } = useUsers({ activo: true })

  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => {
      map[u.id] = u.nombre
    })
    return map
  }, [users])

  const delayedActions = useMemo(
    () =>
      acciones
        .filter(isDelayed)
        .sort((a, b) => daysLate(b, today) - daysLate(a, today) || a.fecha.localeCompare(b.fecha)),
    [acciones, today]
  )

  const insights = useMemo(
    () => getPatternInsights(acciones, responsableNames, today),
    [acciones, responsableNames, today]
  )

  const areaPerformance = useMemo(
    () => getAreaPerformance(acciones, today, responsableNames),
    [acciones, responsableNames, today]
  )

  const attentionQueue = useMemo(
    () => getAttentionQueue(acciones, today),
    [acciones, today]
  )

  const dueSoonCount = useMemo(
    () => acciones.filter((accion) => isDueTodayOrSoon(accion, today)).length,
    [acciones, today]
  )

  const missingEvidenceCount = useMemo(
    () => acciones.filter((accion) => !isClosed(accion) && lacksEvidenceDefinition(accion)).length,
    [acciones]
  )

  const criticalArea = areaPerformance[0]

  const handleSelectAccion = useCallback(
    (accion: AccionDiaria) => {
      void prefetchEvidenceCatalog()
      setEditingAccion(accion)
      setDialogOpen(true)
    },
    [prefetchEvidenceCatalog]
  )

  const handleDialogSuccess = useCallback(() => {
    setEditingAccion(null)
  }, [])

  return (
    <div id="dashboard-page" className="dashboard-page min-h-0">
      <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-3 py-5 sm:space-y-8 sm:px-6 sm:py-6">
        <section
          className="dashboard-control-center space-y-5 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm ring-1 ring-black/5 dark:bg-card/20 dark:ring-white/10 sm:p-6"
          aria-labelledby="dashboard-title"
        >
          <DashboardHeader
            title="Dashboard de actividades"
            eyebrow="Operacion diaria"
          />
        </section>

        {accionesError ? (
          <SectionCard>
            <SectionCardHeader
              icon={AlertTriangle}
              eyebrow="Dashboard"
              title="No se pudieron cargar las actividades"
              subtitle={
                accionesErrorObj instanceof Error
                  ? accionesErrorObj.message
                  : 'Revisa tu conexion o permisos e intenta nuevamente.'
              }
              action={
                <Button type="button" variant="outline" onClick={() => void retryAcciones()}>
                  Reintentar
                </Button>
              }
            />
          </SectionCard>
        ) : (
          <>
            <section id="dashboard-operational-priorities" className="scroll-mt-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SectionCard>
                  <SectionCardHeader
                    icon={Target}
                    eyebrow="Atender primero"
                    title={isLoading ? '...' : `${attentionQueue.length}`}
                    subtitle="Actividades que requieren accion o definicion hoy."
                  />
                </SectionCard>
                <SectionCard>
                  <SectionCardHeader
                    icon={AlertTriangle}
                    eyebrow="Retrasadas"
                    title={isLoading ? '...' : `${delayedActions.length}`}
                    subtitle="Prioridad para recuperacion de compromiso."
                  />
                </SectionCard>
                <SectionCard>
                  <SectionCardHeader
                    icon={ClipboardList}
                    eyebrow="Vencen pronto"
                    title={isLoading ? '...' : `${dueSoonCount}`}
                    subtitle="Vencen hoy o manana; conviene confirmar entrega."
                  />
                </SectionCard>
                <SectionCard>
                  <SectionCardHeader
                    icon={BarChart3}
                    eyebrow="Area critica"
                    title={isLoading ? '...' : criticalArea?.area ?? 'Sin datos'}
                    subtitle={
                      criticalArea
                        ? `${criticalArea.delayed} retrasos, ${criticalArea.delayRate}% de retraso.`
                        : 'Sin actividad suficiente para calcular.'
                    }
                  />
                </SectionCard>
              </div>
            </section>

            <section id="dashboard-attention-queue" className="scroll-mt-4">
              <SectionCard>
                <SectionCardHeader
                  icon={Target}
                  eyebrow="Decision"
                  title="Cola de atencion operativa"
                  subtitle="Lista priorizada para decidir que mover, desbloquear o redefinir primero."
                  action={
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
                      {missingEvidenceCount} sin evidencia definida
                    </div>
                  }
                />
                <SectionCardBody>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[960px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Prioridad</TableHead>
                          <TableHead>Actividad</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Siguiente accion sugerida</TableHead>
                          <TableHead>Fecha termino</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <LoadingRows columns={7} />
                        ) : attentionQueue.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              No hay focos de atencion inmediata. Mantener seguimiento normal.
                            </TableCell>
                          </TableRow>
                        ) : (
                          attentionQueue.map((row) => (
                            <TableRow
                              key={row.accion.id}
                              className="cursor-pointer hover:bg-muted/40"
                              onClick={() => handleSelectAccion(row.accion)}
                            >
                              <TableCell>
                                <span
                                  className={cn(
                                    'inline-flex rounded-md px-2 py-1 text-xs font-semibold',
                                    row.severity === 'alta' &&
                                      'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200',
                                    row.severity === 'media' &&
                                      'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
                                    row.severity === 'baja' &&
                                      'bg-muted text-muted-foreground'
                                  )}
                                >
                                  {row.severity}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-[260px]">
                                <span className="block truncate font-medium">
                                  {row.accion.titulo_accion}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {row.accion.no_actividad || 'Sin folio'}
                                </span>
                              </TableCell>
                              <TableCell>{areaName(row.accion)}</TableCell>
                              <TableCell>{responsableName(row.accion, responsableNames)}</TableCell>
                              <TableCell>{row.reason}</TableCell>
                              <TableCell className="max-w-[320px] text-sm text-muted-foreground">
                                {row.recommendation}
                              </TableCell>
                              <TableCell>{formatDate(row.accion.fecha)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </SectionCardBody>
              </SectionCard>
            </section>

            <section id="dashboard-pattern-insights" className="scroll-mt-4">
              <SectionCard>
                <SectionCardHeader
                  icon={BrainCircuit}
                  eyebrow="Insights"
                  title="Que esta generando friccion"
                  subtitle="Patrones que explican donde conviene intervenir para mejorar la operacion."
                />
                <SectionCardBody>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(isLoading ? insights.slice(0, 4) : insights).map((insight) => (
                      <article
                        key={insight.title}
                        className={cn(
                          'rounded-lg border p-4 shadow-sm',
                          insight.tone === 'danger' &&
                            'border-red-200 bg-red-50/80 text-red-950 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-100',
                          insight.tone === 'warning' &&
                            'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100',
                          insight.tone === 'success' &&
                            'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100',
                          insight.tone === 'neutral' &&
                            'border-border bg-muted/20 text-foreground'
                        )}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                          {insight.title}
                        </p>
                        {isLoading ? (
                          <div className="mt-3 h-7 w-32 animate-pulse rounded bg-current/10" />
                        ) : (
                          <p className="mt-2 text-xl font-semibold tracking-tight">{insight.value}</p>
                        )}
                        <p className="mt-2 text-sm leading-relaxed opacity-80">{insight.detail}</p>
                      </article>
                    ))}
                  </div>
                </SectionCardBody>
              </SectionCard>
            </section>

            <section id="dashboard-delayed-actions" className="scroll-mt-4">
              <SectionCard>
                <SectionCardHeader
                  icon={ClipboardList}
                  eyebrow="Taskpool"
                  title="Actividades retrasadas"
                  subtitle="Actividades vencidas o marcadas como Retrasa, ordenadas por dias de atraso."
                  action={
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-200">
                      {delayedActions.length} retrasadas
                    </div>
                  }
                />
                <SectionCardBody>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[860px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>No.</TableHead>
                          <TableHead>Titulo actividad</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead>Fecha termino</TableHead>
                          <TableHead className="text-right">Dias atraso</TableHead>
                          <TableHead>Evidencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <LoadingRows columns={7} />
                        ) : delayedActions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              No hay actividades retrasadas con los filtros actuales.
                            </TableCell>
                          </TableRow>
                        ) : (
                          delayedActions.slice(0, 12).map((accion) => (
                            <TableRow
                              key={accion.id}
                              className="cursor-pointer hover:bg-muted/40"
                              onClick={() => handleSelectAccion(accion)}
                            >
                              <TableCell className="font-medium">
                                {accion.no_actividad || '-'}
                              </TableCell>
                              <TableCell className="max-w-[260px]">
                                <span className="block truncate font-medium">
                                  {accion.titulo_accion}
                                </span>
                              </TableCell>
                              <TableCell>{areaName(accion)}</TableCell>
                              <TableCell>{responsableName(accion, responsableNames)}</TableCell>
                              <TableCell>{formatDate(accion.fecha)}</TableCell>
                              <TableCell className="text-right font-semibold tabular-nums text-red-600 dark:text-red-300">
                                {daysLate(accion, today)}
                              </TableCell>
                              <TableCell className="max-w-[220px] truncate">
                                {accion.evidencia_esperada || '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </SectionCardBody>
              </SectionCard>
            </section>

            <section id="dashboard-area-performance" className="scroll-mt-4">
              <SectionCard>
                <SectionCardHeader
                  icon={BarChart3}
                  eyebrow="Desempeno"
                  title="Estadistica por area"
                  subtitle="Comparativo operativo por volumen, cumplimiento y retraso acumulado."
                />
                <SectionCardBody>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead>
                          <TableHead className="text-right">Actividades</TableHead>
                          <TableHead className="text-right">Completadas</TableHead>
                          <TableHead className="text-right">Abiertas</TableHead>
                          <TableHead className="text-right">Retrasadas</TableHead>
                          <TableHead className="text-right">Cumplimiento</TableHead>
                          <TableHead className="text-right">Retraso</TableHead>
                          <TableHead className="text-right">Prom. dias tarde</TableHead>
                          <TableHead>Foco</TableHead>
                          <TableHead>Accion sugerida</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <LoadingRows columns={10} />
                        ) : areaPerformance.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                              No hay actividades para calcular desempeno por area.
                            </TableCell>
                          </TableRow>
                        ) : (
                          areaPerformance.map((row) => (
                            <TableRow key={row.area}>
                              <TableCell className="font-medium">{row.area}</TableCell>
                              <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                              <TableCell className="text-right tabular-nums">{row.completed}</TableCell>
                              <TableCell className="text-right tabular-nums">{row.open}</TableCell>
                              <TableCell className="text-right tabular-nums text-red-600 dark:text-red-300">
                                {row.delayed}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.completionRate}%
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.delayRate}%
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.avgDaysLate}
                              </TableCell>
                              <TableCell className="max-w-[180px] text-sm text-muted-foreground">
                                {row.focus}
                              </TableCell>
                              <TableCell className="max-w-[300px] text-sm text-muted-foreground">
                                {row.recommendation}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </SectionCardBody>
              </SectionCard>
            </section>
          </>
        )}
      </div>

      <AccionFormDialog
        dialogId="dashboard-accion-dialog"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accion={editingAccion}
        defaultFecha={today}
        onSuccess={handleDialogSuccess}
        responsableNames={responsableNames}
      />
    </div>
  )
}
