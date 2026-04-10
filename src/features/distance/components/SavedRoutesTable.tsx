/**
 * Tabla de rutas guardadas (saved_route_requests). Agrupa por par ida+vuelta y muestra Ida, Vuelta, Total.
 */

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RefreshCw, Trash2 } from 'lucide-react'
import type { SavedRouteRequestWithDetails, SavedRoutePairRow } from '../types/distance.types'

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '—'
  const min = Math.round(seconds / 60)
  if (min < 60) return `~${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `~${h}h ${m} min` : `~${h}h`
}

function formatDurationTotal(ida: number | null | undefined, vuelta: number | null | undefined): string {
  const a = ida ?? 0
  const b = vuelta ?? 0
  if (a <= 0 && b <= 0) return '—'
  return formatDuration(a + b)
}

/** Agrupa filas por par (origin_id, destination_id) y devuelve una fila por par con ida, vuelta, total */
function groupRowsIntoPairs(rows: SavedRouteRequestWithDetails[]): SavedRoutePairRow[] {
  const byPair = new Map<string, SavedRouteRequestWithDetails[]>()
  for (const row of rows) {
    const a = row.origin_id
    const b = row.destination_id
    const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`
    if (!byPair.has(pairKey)) byPair.set(pairKey, [])
    byPair.get(pairKey)!.push(row)
  }
  const result: SavedRoutePairRow[] = []
  for (const [, pairRows] of byPair) {
    const idaRow = pairRows.find((r) => r.origin_id < r.destination_id) ?? pairRows[0]
    const vueltaRow = pairRows.find((r) => r.origin_id > r.destination_id) ?? (pairRows.length > 1 ? pairRows[1] : null)
    const kmIda = Number(idaRow.distance_km)
    const kmVuelta = vueltaRow ? Number(vueltaRow.distance_km) : null
    const kmTotal = vueltaRow != null && kmVuelta != null ? Math.round((kmIda + kmVuelta) * 100) / 100 : kmIda
    const originName = idaRow.origin?.nombre ?? idaRow.origin_name_snapshot ?? '—'
    const destinationName = idaRow.destination?.nombre ?? idaRow.destination_name_snapshot ?? '—'
    const updatedAt = vueltaRow && new Date(vueltaRow.updated_at) > new Date(idaRow.updated_at)
      ? vueltaRow.updated_at
      : idaRow.updated_at
    result.push({
      pairKey: idaRow.origin_id + '|' + idaRow.destination_id,
      origin_id: idaRow.origin_id,
      destination_id: idaRow.destination_id,
      route_mode: idaRow.route_mode ?? 'DRIVE',
      originName,
      destinationName,
      origin_location: idaRow.origin_location_snapshot ?? idaRow.origin?.ubicacion ?? '',
      destination_location: idaRow.destination_location_snapshot ?? idaRow.destination?.ubicacion ?? '',
      km_ida: kmIda,
      km_vuelta: vueltaRow ? kmVuelta : null,
      km_total: kmTotal,
      duration_ida_seconds: idaRow.duration_seconds ?? null,
      duration_vuelta_seconds: vueltaRow?.duration_seconds ?? null,
      updated_at: updatedAt,
    })
  }
  result.sort((x, y) => new Date(y.updated_at).getTime() - new Date(x.updated_at).getTime())
  return result
}

export interface SavedRoutesTableProps {
  rows: SavedRouteRequestWithDetails[]
  isLoading?: boolean
  /** Al pulsar Recalcular en una fila: recalcula ida/vuelta y actualiza la ruta guardada */
  onRecalculate?: (row: SavedRoutePairRow) => void | Promise<void>
  /** pairKey de la fila que está recalculando (deshabilita el botón y muestra estado) */
  recalculatingPairKey?: string | null
  /** Tras confirmar: desactiva el par (borrado lógico activo=false) */
  onDeactivate?: (row: SavedRoutePairRow) => void | Promise<void>
  /** pairKey de la fila que se está desactivando */
  deactivatingPairKey?: string | null
}

export function SavedRoutesTable({
  rows,
  isLoading,
  onRecalculate,
  recalculatingPairKey,
  onDeactivate,
  deactivatingPairKey,
}: SavedRoutesTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<SavedRoutePairRow | null>(null)
  const showActions = onRecalculate != null || onDeactivate != null
  if (isLoading) {
    return (
      <div
        id="saved-routes-table-loading"
        className="saved-routes-table-loading rounded-xl border border-border/50 bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Cargando rutas guardadas…
      </div>
    )
  }

  const pairRows = groupRowsIntoPairs(rows)

  if (pairRows.length === 0) {
    return (
      <div
        id="saved-routes-table-empty"
        className="saved-routes-table-empty rounded-xl border border-border/50 bg-card p-8 text-center text-sm text-muted-foreground"
      >
        No hay rutas guardadas. Pulsa «Nueva solicitud» para calcular una ruta y guardarla.
      </div>
    )
  }

  const isDeactivating = deleteTarget != null && deactivatingPairKey === deleteTarget.pairKey

  return (
    <>
      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar esta ruta guardada?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget != null && (
                <>
                  Se ocultará el par <strong>{deleteTarget.originName}</strong> →{' '}
                  <strong>{deleteTarget.destinationName}</strong> del listado (borrado lógico). Podrás volver a
                  guardarla calculando de nuevo.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeactivating || deleteTarget == null || onDeactivate == null}
              onClick={() => {
                const target = deleteTarget
                if (target == null || onDeactivate == null) return
                void Promise.resolve(onDeactivate(target))
                  .then(() => setDeleteTarget(null))
                  .catch(() => {
                    /* el padre muestra toast; mantener diálogo abierto para reintentar */
                  })
              }}
            >
              {isDeactivating ? 'Quitando…' : 'Quitar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        id="saved-routes-table-wrapper"
        className="saved-routes-table-wrapper rounded-xl border border-border/50 bg-card overflow-hidden"
      >
        <Table id="saved-routes-table" className="saved-routes-table">
          <TableHeader>
            <TableRow>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right tabular-nums">Ida (km)</TableHead>
              <TableHead className="text-right tabular-nums">Vuelta (km)</TableHead>
              <TableHead className="text-right tabular-nums">Total (km)</TableHead>
              <TableHead>Duración aprox.</TableHead>
              <TableHead className="text-muted-foreground">Actualizado</TableHead>
              {showActions && <TableHead className="w-[1%] text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairRows.map((row) => {
              const isRecalculating = recalculatingPairKey === row.pairKey
              const rowDeactivating = deactivatingPairKey === row.pairKey
              return (
                <TableRow key={row.pairKey}>
                  <TableCell className="font-medium">{row.originName}</TableCell>
                  <TableCell>{row.destinationName}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.km_ida.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.km_vuelta != null ? row.km_vuelta.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{row.km_total.toFixed(2)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDurationTotal(row.duration_ida_seconds, row.duration_vuelta_seconds)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                    {formatDate(row.updated_at)}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {onRecalculate != null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="saved-route-recalculate-btn"
                            onClick={() => onRecalculate(row)}
                            disabled={isRecalculating || rowDeactivating}
                            aria-busy={isRecalculating}
                          >
                            <RefreshCw
                              className={`h-4 w-4 mr-1.5 ${isRecalculating ? 'animate-spin' : ''}`}
                              aria-hidden
                            />
                            {isRecalculating ? 'Recalculando…' : 'Recalcular'}
                          </Button>
                        )}
                        {onDeactivate != null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="saved-route-delete-btn text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                            disabled={rowDeactivating || isRecalculating}
                            aria-label={`Quitar ruta ${row.originName} a ${row.destinationName}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" aria-hidden />
                            Quitar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
