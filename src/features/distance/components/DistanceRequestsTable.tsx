/**
 * Tabla de solicitudes del tablero de distancias (distance_requests).
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DistanceRequestWithDetails } from '../types/distance.types'

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function formatDuracionAprox(idaSeg: number | null | undefined, vueltaSeg: number | null | undefined): string {
  const ida = idaSeg ?? 0
  const vuelta = vueltaSeg ?? 0
  const total = ida + vuelta
  if (total <= 0) return '—'
  const min = Math.round(total / 60)
  if (min < 60) return `~${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `~${h}h ${m} min` : `~${h}h`
}

export interface DistanceRequestsTableProps {
  rows: DistanceRequestWithDetails[]
  isLoading?: boolean
}

export function DistanceRequestsTable({ rows, isLoading }: DistanceRequestsTableProps) {
  if (isLoading) {
    return (
      <div
        id="distance-requests-table-loading"
        className="distance-requests-table-loading rounded-xl border border-border/50 bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Cargando solicitudes…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div
        id="distance-requests-table-empty"
        className="distance-requests-table-empty rounded-xl border border-border/50 bg-card p-8 text-center text-sm text-muted-foreground"
      >
        No hay solicitudes guardadas. Pulsa «Nueva solicitud» para calcular una ruta y guardarla.
      </div>
    )
  }

  return (
    <div
      id="distance-requests-table-wrapper"
      className="distance-requests-table-wrapper rounded-xl border border-border/50 bg-card overflow-hidden"
    >
      <Table id="distance-requests-table" className="distance-requests-table">
        <TableHeader id="distance-requests-table-header" className="distance-requests-table-header">
          <TableRow className="distance-requests-table-header-row">
            <TableHead id="distance-requests-th-ruta" className="distance-requests-th distance-requests-th-ruta">Ruta</TableHead>
            <TableHead id="distance-requests-th-fecha" className="distance-requests-th distance-requests-th-fecha">Fecha</TableHead>
            <TableHead id="distance-requests-th-hora" className="distance-requests-th distance-requests-th-hora">Hora alta</TableHead>
            <TableHead id="distance-requests-th-origen" className="distance-requests-th distance-requests-th-origen">Origen</TableHead>
            <TableHead id="distance-requests-th-destino" className="distance-requests-th distance-requests-th-destino">Destino</TableHead>
            <TableHead id="distance-requests-th-ida" className="distance-requests-th distance-requests-th-ida text-right tabular-nums">Ida (km)</TableHead>
            <TableHead id="distance-requests-th-vuelta" className="distance-requests-th distance-requests-th-vuelta text-right tabular-nums">Vuelta (km)</TableHead>
            <TableHead id="distance-requests-th-total" className="distance-requests-th distance-requests-th-total text-right tabular-nums">Total (km)</TableHead>
            <TableHead id="distance-requests-th-duracion" className="distance-requests-th distance-requests-th-duracion">Duración aprox.</TableHead>
            <TableHead id="distance-requests-th-created" className="distance-requests-th distance-requests-th-created">Creación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody id="distance-requests-table-body" className="distance-requests-table-body">
          {rows.map((row) => (
            <TableRow key={row.id} id={`distance-request-row-${row.id}`} className="distance-request-row">
              <TableCell id={`distance-request-cell-ruta-${row.id}`} className="distance-request-cell distance-request-cell-ruta font-medium">{row.ruta || '—'}</TableCell>
              <TableCell id={`distance-request-cell-fecha-${row.id}`} className="distance-request-cell distance-request-cell-fecha whitespace-nowrap">{row.fecha}</TableCell>
              <TableCell id={`distance-request-cell-hora-${row.id}`} className="distance-request-cell distance-request-cell-hora whitespace-nowrap">{row.hora_alta}</TableCell>
              <TableCell id={`distance-request-cell-origen-${row.id}`} className="distance-request-cell distance-request-cell-origen">{row.origin?.nombre ?? '—'}</TableCell>
              <TableCell id={`distance-request-cell-destino-${row.id}`} className="distance-request-cell distance-request-cell-destino">{row.destination?.nombre ?? '—'}</TableCell>
              <TableCell id={`distance-request-cell-ida-${row.id}`} className="distance-request-cell distance-request-cell-ida text-right tabular-nums">
                {row.km_ida != null ? Number(row.km_ida).toFixed(2) : '—'}
              </TableCell>
              <TableCell id={`distance-request-cell-vuelta-${row.id}`} className="distance-request-cell distance-request-cell-vuelta text-right tabular-nums">
                {row.km_vuelta != null ? Number(row.km_vuelta).toFixed(2) : '—'}
              </TableCell>
              <TableCell id={`distance-request-cell-total-${row.id}`} className="distance-request-cell distance-request-cell-total text-right tabular-nums">
                {row.km_total != null ? Number(row.km_total).toFixed(2) : '—'}
              </TableCell>
              <TableCell id={`distance-request-cell-duracion-${row.id}`} className="distance-request-cell distance-request-cell-duracion whitespace-nowrap">
                {formatDuracionAprox(row.duracion_ida_segundos, row.duracion_vuelta_segundos)}
              </TableCell>
              <TableCell id={`distance-request-cell-created-${row.id}`} className="distance-request-cell distance-request-cell-created text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
