/**
 * Reportes Históricos (spec §5.8).
 * Filtro por responsable (admin), rango de fechas, métricas, tabla y exportación CSV/Imprimir.
 */

import { useMemo } from 'react'
import { useUsers } from '@/features/users/hooks/useUsers'
import { HistoricalReports } from '@/features/reports'

export function ReportesPage() {
  const { data: users = [] } = useUsers({ activo: true })
  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => { map[u.id] = u.nombre })
    return map
  }, [users])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Analítica</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reportes históricos</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Filtra por rango de fechas y responsable (admin). Métricas, detalle y exportación CSV o impresión.
        </p>
      </header>

      <HistoricalReports responsableNames={responsableNames} />
    </div>
  )
}
