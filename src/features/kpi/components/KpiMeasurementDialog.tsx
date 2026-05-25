import { useEffect, useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, History, Save, Target, TrendingUp } from 'lucide-react'
import type { CatalogKpiCalcType } from '@/features/catalogs/types/catalogs.types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useCatalogKpiMeasurements } from '../hooks/useCatalogKpiMeasurements'
import { useInsertCatalogKpiMeasurement } from '../hooks/useInsertCatalogKpiMeasurement'
import type { CatalogKpi } from '@/features/catalogs/types/catalogs.types'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { getAppNow } from '@/lib/clock'
import { formatDateTimeCDMX } from '@/lib/dateUtils'
import {
  buildKpiMetricFromCatalogRow,
  calculateCompliance,
  DEFAULT_O2C_TARGET_HORIZON,
  getKpiStatusForMetric,
  resolveEffectiveStatusThresholds,
  resolveTarget,
} from '../utils/kpiCalculations'
import type { CatalogKpiO2cRow } from '../types/kpi.types'
import { cn } from '@/lib/utils'

function horizonShortLabel(): string {
  switch (DEFAULT_O2C_TARGET_HORIZON) {
    case 'm6':
      return 'M6'
    case 'm12':
      return 'M12'
    case 'm18':
    default:
      return 'M18'
  }
}

function formatRefNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '-'
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  const abs = Math.abs(n)
  const digits = abs >= 100 ? 1 : abs >= 1 ? 2 : 4
  return n.toLocaleString('es-MX', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

function directionHint(calc: CatalogKpiCalcType | null | undefined, dir: string | null | undefined): string {
  const t = calc ?? (dir === 'maximize' ? 'maximize' : dir === 'minimize' ? 'minimize' : null)
  if (t === 'maximize') return 'Mayor valor es mejor'
  if (t === 'minimize') return 'Menor valor es mejor'
  if (t === 'binary') return 'Debe igualar la meta'
  return 'Revisar tipo de calculo'
}

function statusLabel(status: ReturnType<typeof getKpiStatusForMetric>): string {
  if (status === 'on_track') return 'En meta'
  if (status === 'at_risk') return 'En riesgo'
  if (status === 'off_track') return 'Fuera de meta'
  return 'Sin lectura'
}

function statusClass(status: ReturnType<typeof getKpiStatusForMetric>): string {
  if (status === 'on_track') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
  if (status === 'at_risk') return 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100'
  if (status === 'off_track') return 'border-destructive/35 bg-destructive/10 text-destructive'
  return 'border-border bg-muted/30 text-muted-foreground'
}

type FormValues = {
  valor: string
  notes: string
  medido_en: string
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(local: string): string {
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? getAppNow().toISOString() : d.toISOString()
}

export function KpiMeasurementDialog({
  kpi,
  open,
  onOpenChange,
}: {
  kpi: CatalogKpi | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const kpiId = kpi?.id
  const { data: users = [] } = useUsers({ activo: true })
  const userById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.nombre)
    return m
  }, [users])

  const { data: history = [], isLoading: histLoading } = useCatalogKpiMeasurements(kpiId, {
    limit: 25,
    enabled: open && !!kpiId,
  })
  const historyWithDelta = useMemo(
    () =>
      history.map((m, index) => {
        const prev = history[index + 1]
        const delta = prev ? m.valor - prev.valor : null
        return { ...m, delta }
      }),
    [history]
  )

  const insertM = useInsertCatalogKpiMeasurement()
  const form = useForm<FormValues>({
    defaultValues: { valor: '', notes: '', medido_en: toLocalInputValue(getAppNow().toISOString()) },
    mode: 'onChange',
  })

  useEffect(() => {
    if (!open) return
    form.reset({ valor: '', notes: '', medido_en: toLocalInputValue(getAppNow().toISOString()) })
  }, [form, kpiId, open])

  const reference = useMemo(() => {
    if (!kpi) return null
    const row = kpi as CatalogKpiO2cRow
    const metric = buildKpiMetricFromCatalogRow(row, null)
    const eff = resolveTarget(metric, DEFAULT_O2C_TARGET_HORIZON)
    const th = resolveEffectiveStatusThresholds(metric)
    return {
      row,
      baseline: row.baseline,
      meta: eff,
      unit: row.unidad ?? '-',
      thGreen: th.greenMin,
      thYellow: th.yellowMin,
      directionText: directionHint(row.calc_type, row.direction),
    }
  }, [kpi])

  const latestMeasurement = history[0]
  const watchedValue = form.watch('valor')
  const preview = useMemo(() => {
    if (!reference) return null
    const num = Number(watchedValue)
    if (!Number.isFinite(num)) return null
    const metric = buildKpiMetricFromCatalogRow(reference.row, num)
    const compliance = calculateCompliance(metric, { targetHorizon: DEFAULT_O2C_TARGET_HORIZON })
    const status = getKpiStatusForMetric(compliance, metric)
    return { value: num, compliance, status }
  }, [reference, watchedValue])

  const onSubmit = form.handleSubmit((vals) => {
    if (!kpi) return
    const num = Number(vals.valor)
    if (!Number.isFinite(num)) {
      toast.error('Indica un valor numerico valido.')
      return
    }
    if (vals.medido_en && Number.isNaN(new Date(vals.medido_en).getTime())) {
      toast.error('La fecha de medicion no es valida.')
      return
    }

    insertM.mutate(
      {
        catalog_kpi_id: kpi.id,
        valor: num,
        medido_en: vals.medido_en ? fromLocalInputValue(vals.medido_en) : undefined,
        notes: vals.notes.trim() || null,
        gapId: kpi.gap_id,
      },
      {
        onSuccess: () => {
          toast.success('Medicion registrada. El KPI se actualizo con este valor.')
          form.reset({ valor: '', notes: '', medido_en: toLocalInputValue(getAppNow().toISOString()) })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al guardar la medicion'),
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,860px)] max-w-[min(96vw,980px)] grid-rows-none flex-col overflow-hidden p-0"
        aria-describedby="kpi-measurement-desc"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-4 pt-5 text-left sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Target className="h-3.5 w-3.5" aria-hidden />
              Nueva medicion
            </Badge>
            {reference ? <Badge variant="outline">{reference.directionText}</Badge> : null}
          </div>
          <DialogTitle className="pt-2 text-xl leading-tight">Registrar medicion</DialogTitle>
          <DialogDescription id="kpi-measurement-desc" className="max-w-3xl">
            {kpi?.nombre ?? 'KPI'}: captura el valor real observado. Al guardar, este dato queda en el historial y se
            convierte en el valor actual del KPI.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {kpi && reference ? (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <aside className="space-y-4">
                <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
                  <p className="text-sm font-semibold text-foreground">Referencia para capturar</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Usa la misma escala de linea base y meta. Si el KPI esta en porcentaje, captura el porcentaje; si
                    esta en conteo, captura el conteo.
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Unidad</dt>
                      <dd className="mt-1 font-semibold text-foreground">{reference.unit}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Criterio</dt>
                      <dd className="mt-1 font-semibold text-foreground">{reference.directionText}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Linea base</dt>
                      <dd className="mt-1 tabular-nums font-semibold text-foreground">
                        {formatRefNumber(reference.baseline)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Meta {horizonShortLabel()}</dt>
                      <dd className="mt-1 tabular-nums font-semibold text-foreground">
                        {formatRefNumber(reference.meta)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    Semaforo: verde desde {(reference.thGreen * 100).toFixed(0)}%, amarillo desde{' '}
                    {(reference.thYellow * 100).toFixed(0)}%.
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-card p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock3 className="h-4 w-4 text-primary" aria-hidden />
                    Ultima lectura
                  </p>
                  {latestMeasurement ? (
                    <div className="mt-3 space-y-1 text-sm">
                      <p className="text-2xl font-semibold tabular-nums text-foreground">
                        {formatRefNumber(latestMeasurement.valor)}
                        <span className="ml-1 text-base font-medium text-muted-foreground">{reference.unit}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registrada el {formatDateTimeCDMX(latestMeasurement.medido_en)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Aun no hay mediciones. La primera captura sera el valor actual del KPI.
                    </p>
                  )}
                </div>
              </aside>

              <main className="space-y-4">
                <form onSubmit={onSubmit} className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <p>
                      Verifica escala, periodo y fuente antes de guardar. Este valor recalcula la lectura del KPI en el
                      tablero.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="medicion-valor">Valor medido *</Label>
                      <Input
                        id="medicion-valor"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder={`Ej. ${formatRefNumber(reference.meta)}`}
                        aria-invalid={!!form.formState.errors.valor}
                        {...form.register('valor', {
                          required: 'Captura el valor medido.',
                          validate: (v) => Number.isFinite(Number(v)) || 'El valor debe ser numerico.',
                        })}
                      />
                      {form.formState.errors.valor ? (
                        <p className="text-xs text-destructive">{form.formState.errors.valor.message}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Debe estar en unidad: {reference.unit}.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="medicion-fecha">Fecha / hora de medicion</Label>
                      <Input
                        id="medicion-fecha"
                        type="datetime-local"
                        {...form.register('medido_en', {
                          validate: (v) => !v || !Number.isNaN(new Date(v).getTime()) || 'Fecha invalida.',
                        })}
                      />
                      {form.formState.errors.medido_en ? (
                        <p className="text-xs text-destructive">{form.formState.errors.medido_en.message}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Por defecto usa la fecha y hora actual.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="medicion-notas">Notas de soporte</Label>
                    <textarea
                      id="medicion-notas"
                      rows={3}
                      placeholder="Fuente del dato, corte, observacion o criterio usado."
                      {...form.register('notes')}
                      className="flex min-h-[84px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
                      Vista previa del impacto
                    </p>
                    {preview ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="tabular-nums font-semibold text-foreground">
                          Avance estimado: {preview.compliance == null ? '-' : `${Math.round(preview.compliance * 100)}%`}
                        </span>
                        <span className={cn('rounded-md border px-2 py-1 text-xs font-semibold', statusClass(preview.status))}>
                          {statusLabel(preview.status)}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Captura un valor numerico para ver el avance y semaforo estimado antes de guardar.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={insertM.isPending || !kpi}>
                      {insertM.isPending ? (
                        'Guardando...'
                      ) : (
                        <>
                          <Save className="h-4 w-4" aria-hidden />
                          Guardar medicion
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <div className="rounded-lg border border-border/70 bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <History className="h-4 w-4 text-primary" aria-hidden />
                      Historial reciente
                    </h4>
                    <span className="text-xs text-muted-foreground">{history.length} registros</span>
                  </div>
                  {histLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin mediciones aun.</p>
                  ) : (
                    <div className="max-h-64 overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Tendencia</TableHead>
                            <TableHead>Registro</TableHead>
                            <TableHead>Notas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyWithDelta.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="min-w-[140px] text-xs text-muted-foreground">
                                {formatDateTimeCDMX(m.medido_en)}
                              </TableCell>
                              <TableCell className="tabular-nums font-medium">{formatRefNumber(m.valor)}</TableCell>
                              <TableCell
                                className={
                                  m.delta == null
                                    ? 'text-xs text-muted-foreground'
                                    : m.delta > 0
                                      ? 'text-xs tabular-nums text-emerald-700 dark:text-emerald-300'
                                      : m.delta < 0
                                        ? 'text-xs tabular-nums text-rose-700 dark:text-rose-300'
                                        : 'text-xs tabular-nums text-muted-foreground'
                                }
                              >
                                {m.delta == null ? '-' : `${m.delta > 0 ? '+' : ''}${formatRefNumber(m.delta)}`}
                              </TableCell>
                              <TableCell className="max-w-[130px] truncate text-xs text-muted-foreground">
                                {m.measured_by ? userById.get(m.measured_by) ?? m.measured_by.slice(0, 8) : '-'}
                              </TableCell>
                              <TableCell className="max-w-[180px] truncate text-xs">
                                {m.notes ?? '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </main>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
              Selecciona un KPI para registrar una medicion.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 bg-muted/20 px-5 py-3 text-xs text-muted-foreground sm:px-6">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            El registro queda en historial, actualiza el valor actual del KPI y refresca el dashboard.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
