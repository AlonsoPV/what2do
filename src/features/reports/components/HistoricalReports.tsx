/**
 * Reportes históricos (spec §5.8).
 * Filtros por rango de fechas y responsable (admin), métricas, tabla y exportación CSV/Imprimir.
 */

import { useMemo, useState, useCallback } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isAdminByRole } from '@/features/auth/lib/permissions'
import { useReportesHistorico } from '../hooks/useReportesHistorico'
import { useUsers } from '@/features/users/hooks/useUsers'
import { metricasFromAcciones, type MetricasAcciones } from '@/features/operations/utils/metricas'
import { ACTION_STATUS } from '@/types'
import { cn } from '@/lib/utils'
import {
  Download,
  Printer,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle,
  FileWarning,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function defaultRango(): { desde: string; hasta: string } {
  const h = new Date()
  const hasta = h.toISOString().slice(0, 10)
  const d = new Date(h)
  d.setDate(d.getDate() - 29)
  const desde = d.toISOString().slice(0, 10)
  return { desde, hasta }
}

export interface HistoricalReportsProps {
  responsableNames?: Record<string, string>
}

export function HistoricalReports({ responsableNames = {} }: HistoricalReportsProps) {
  const { profile } = useAuth()
  const [rango, setRango] = useState(defaultRango)
  const [responsableId, setResponsableId] = useState<string | null>(null)
  const showResponsableFilter = isAdminByRole(profile?.rol ?? '')

  const { data: users = [] } = useUsers({ activo: true })
  const { data: acciones = [], isLoading, isError } = useReportesHistorico(
    rango.desde,
    rango.hasta,
    showResponsableFilter ? responsableId : undefined
  )

  const metricas = useMemo<MetricasAcciones>(() => metricasFromAcciones(acciones), [acciones])
  const byEstado = useMemo(() => {
    const map: Record<string, number> = {}
    ACTION_STATUS.forEach((s) => { map[s] = 0 })
    acciones.forEach((a) => { map[a.estado] = (map[a.estado] ?? 0) + 1 })
    return map
  }, [acciones])

  const handleExportCSV = useCallback(() => {
    const headers = ['Fecha', 'Hora límite', 'Descripción', 'Responsable', 'Estado', 'Evidencia']
    const rows = acciones.map((a) => [
      a.fecha,
      a.hora_limite?.slice(0, 5) ?? '',
      `"${(a.descripcion_accion ?? '').replace(/"/g, '""')}"`,
      a.responsable ? (responsableNames[a.responsable] ?? a.responsable) : '',
      a.estado,
      a.evidencia_cargada ? 'Sí' : 'No',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${rango.desde}_${rango.hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [acciones, rango, responsableNames])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="space-y-6 print:space-y-4">
      <Card className="print:shadow-none print:hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-sm font-semibold">Filtros</h3>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="reportes-desde">Desde</Label>
            <Input
              id="reportes-desde"
              type="date"
              value={rango.desde}
              onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportes-hasta">Hasta</Label>
            <Input
              id="reportes-hasta"
              type="date"
              value={rango.hasta}
              onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
            />
          </div>
          {showResponsableFilter && (
            <div className="space-y-2 min-w-[180px]">
              <Label htmlFor="reportes-responsable">Responsable</Label>
              <Select
                value={responsableId ?? '__todos__'}
                onValueChange={(v) => setResponsableId(v === '__todos__' ? null : v)}
              >
                <SelectTrigger id="reportes-responsable">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          No se pudieron cargar los datos del reporte.
        </div>
      )}

      {!isError && !isLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
            <MetricCard
              icon={FileText}
              label="Total acciones"
              value={metricas.total}
            />
            <MetricCard
              icon={CheckCircle}
              label="Completadas"
              value={metricas.completadas}
              sub={`${metricas.eficienciaPorcentaje}% cumplimiento`}
              valueClassName="text-emerald-600"
            />
            <MetricCard
              icon={FileWarning}
              label="Retraso"
              value={metricas.retraso}
              valueClassName={metricas.retraso > 0 ? 'text-orange-600' : undefined}
            />
            <MetricCard
              icon={AlertCircle}
              label="Bloqueadas"
              value={metricas.bloqueadas}
              valueClassName={metricas.bloqueadas > 0 ? 'text-red-600' : undefined}
            />
          </div>

          <Card className="print:shadow-none">
            <CardHeader className="pb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Acciones por estado
              </h3>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {ACTION_STATUS.map((estado) => (
                  <span
                    key={estado}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium text-foreground">{estado}</span>
                    <span className="tabular-nums text-muted-foreground">{byEstado[estado] ?? 0}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="print:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-semibold">Detalle de acciones</h3>
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {acciones.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay acciones en el rango seleccionado.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left p-2 font-medium">Fecha</th>
                        <th className="text-left p-2 font-medium">Hora</th>
                        <th className="text-left p-2 font-medium min-w-[200px]">Descripción</th>
                        <th className="text-left p-2 font-medium">Responsable</th>
                        <th className="text-left p-2 font-medium">Estado</th>
                        <th className="text-left p-2 font-medium">Evidencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acciones.slice(0, 500).map((a) => (
                        <tr key={a.id} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="p-2">{a.fecha}</td>
                          <td className="p-2">{a.hora_limite?.slice(0, 5) ?? '—'}</td>
                          <td className="p-2 max-w-[280px] truncate" title={a.descripcion_accion}>
                            {a.descripcion_accion}
                          </td>
                          <td className="p-2">
                            {a.responsable
                              ? (responsableNames[a.responsable] ?? a.responsable)
                              : '—'}
                          </td>
                          <td className="p-2">{a.estado}</td>
                          <td className="p-2">{a.evidencia_cargada ? 'Sí' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {acciones.length > 500 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Mostrando las primeras 500 de {acciones.length} acciones. Ajusta el rango o el filtro de responsable.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  sub?: string
  valueClassName?: string
}) {
  return (
    <Card className="print:shadow-none">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn('text-xl font-semibold tabular-nums', valueClassName)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
