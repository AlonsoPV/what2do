/**
 * Reportes Históricos (spec §5.8).
 * Filtro por responsable (admin), rango de fechas, métricas, tabla y exportación CSV/Imprimir.
 */

import { useMemo } from 'react'
import { AcademyTrackingCard } from '@/features/academy'
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes históricos</h2>
        <p className="text-muted-foreground">
          Filtra por rango de fechas y responsable (admin). Métricas, detalle y exportación CSV o impresión.
        </p>
      </div>

      <AcademyTrackingCard />

      <HistoricalReports responsableNames={responsableNames} />
    </div>
  )
}
