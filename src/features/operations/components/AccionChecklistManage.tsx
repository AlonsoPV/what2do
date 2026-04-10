/**
 * Checklist en edición/seguimiento: datos en servidor; cada cambio persiste al instante.
 * Puntos completados: no se editan ni eliminan (trazabilidad); solo se puede desmarcar el check.
 */

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ListChecks, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTimeCDMX } from '@/lib/dateUtils'
import type { AccionCheckpoint } from '@/types'
import { useAccionCheckpoints } from '../hooks/useAccionCheckpoints'
import {
  useDeleteAccionCheckpoint,
  useInsertAccionCheckpoint,
  useToggleAccionCheckpoint,
  useUpdateAccionCheckpoint,
} from '../hooks/useAccionCheckpointMutations'
import { AccionChecklistProgress } from './AccionChecklistProgress'
import { cn } from '@/lib/utils'

const MAX_LEN = 400
const MIN_LEN = 3

function auditSummary(
  c: AccionCheckpoint,
  responsableNames: Record<string, string>
): { line: string; title: string } | null {
  if (!c.completado || !c.checked_at) return null
  const who = c.checked_by
    ? responsableNames[c.checked_by] ?? `Usuario (${c.checked_by.slice(0, 8)}…)`
    : 'Usuario no registrado'
  const when = formatDateTimeCDMX(c.checked_at)
  return {
    line: `Validado por ${who} · ${when}`,
    title: `checked_by: ${c.checked_by ?? '—'}\nchecked_at: ${c.checked_at}`,
  }
}

export interface AccionChecklistManageProps {
  accionId: string
  /** usuarios.id del usuario actual (marca checked_by al completar). */
  currentUsuarioId: string | null
  disabled?: boolean
  /** Nombres para mostrar auditoría de `checked_by` (mismo mapa que responsables del diálogo). */
  responsableNames?: Record<string, string>
}

export function AccionChecklistManage({
  accionId,
  currentUsuarioId,
  disabled,
  responsableNames = {},
}: AccionChecklistManageProps) {
  const { data: checkpoints = [], isLoading } = useAccionCheckpoints(accionId)
  const insertCp = useInsertAccionCheckpoint()
  const deleteCp = useDeleteAccionCheckpoint()
  const updateCp = useUpdateAccionCheckpoint()
  const toggleCp = useToggleAccionCheckpoint()

  const [draft, setDraft] = useState('')

  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at)),
    [checkpoints]
  )

  const completados = sorted.filter((c) => c.completado).length
  const total = sorted.length
  const pendientes = total - completados

  const maxOrden = sorted.length ? Math.max(...sorted.map((c) => c.orden)) : -1

  const addPoint = useCallback(async () => {
    const t = draft.trim()
    if (t.length < 3) {
      toast.error('El punto debe tener al menos 3 caracteres.')
      return
    }
    if (t.length > MAX_LEN) return
    const lower = t.toLowerCase()
    if (sorted.some((c) => c.texto.trim().toLowerCase() === lower)) {
      toast.error('Ya existe un punto con el mismo texto.')
      return
    }
    try {
      await insertCp.mutateAsync({
        accion_id: accionId,
        texto: t,
        orden: maxOrden + 1,
        obligatorio: true,
      })
      setDraft('')
      toast.success('Punto agregado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo agregar el punto')
    }
  }, [draft, accionId, maxOrden, insertCp, sorted])

  const removePoint = async (c: AccionCheckpoint) => {
    if (c.completado) {
      toast.error('No se puede eliminar un punto ya validado (trazabilidad).')
      return
    }
    try {
      await deleteCp.mutateAsync({ id: c.id, accionId: accionId })
      toast.success('Punto eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  const swapOrden = async (c: AccionCheckpoint, dir: -1 | 1) => {
    const idx = sorted.findIndex((x) => x.id === c.id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= sorted.length) return
    const other = sorted[j]
    try {
      await Promise.all([
        updateCp.mutateAsync({ id: c.id, patch: { orden: other.orden } }),
        updateCp.mutateAsync({ id: other.id, patch: { orden: c.orden } }),
      ])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo reordenar')
    }
  }

  const saveTexto = async (c: AccionCheckpoint, texto: string) => {
    if (c.completado) return
    const t = texto.trim()
    if (t.length < 3) {
      toast.error('Mínimo 3 caracteres')
      return
    }
    if (t === c.texto.trim()) return
    try {
      await updateCp.mutateAsync({ id: c.id, patch: { texto: t } })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  const onToggle = async (c: AccionCheckpoint, checked: boolean) => {
    try {
      await toggleCp.mutateAsync({
        id: c.id,
        completado: checked,
        checkedByUsuarioId: checked ? currentUsuarioId : null,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar')
    }
  }

  const busy =
    disabled ||
    insertCp.isPending ||
    deleteCp.isPending ||
    updateCp.isPending ||
    toggleCp.isPending

  return (
    <Card className="border-border/60 bg-muted/5 shadow-none">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3 pt-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-sm font-semibold leading-tight">Checklist de validación</h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Marca cada ítem al cumplirse. Los textos ya validados no se editan (trazabilidad). Reordena o elimina solo
            ítems pendientes.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0 pb-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando puntos…</p>
        ) : (
          <>
            <AccionChecklistProgress completados={completados} total={total} />
            {pendientes > 0 && total > 0 && (
              <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs leading-snug text-amber-950 dark:text-amber-100">
                Faltan <span className="font-semibold tabular-nums">{pendientes}</span> punto
                {pendientes !== 1 ? 's' : ''} para poder marcar la acción como <strong>Hecha</strong> (además de la
                evidencia cargada).
              </p>
            )}

            <div className="rounded-lg border border-dashed border-border/70 bg-background/50 p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="checkpoint-add-edit" className="text-xs font-medium text-foreground/80">
                    Nuevo punto del checklist
                  </Label>
                  <Input
                    id="checkpoint-add-edit"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Describe qué debe validarse…"
                    maxLength={MAX_LEN}
                    disabled={busy}
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void addPoint()
                      }
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Mínimo {MIN_LEN} caracteres. Enter o el botón para agregar.
                  </p>
                </div>
                <Button
                  type="button"
                  className="shrink-0 sm:min-w-[140px]"
                  disabled={busy || draft.trim().length < MIN_LEN}
                  onClick={() => void addPoint()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar al checklist
                </Button>
              </div>
            </div>

            {sorted.length > 0 ? (
              <ul className="space-y-2.5">
                {sorted.map((c, index) => {
                  const audit = auditSummary(c, responsableNames)
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        'rounded-xl border bg-background/90 px-3.5 py-3.5 shadow-sm transition-colors',
                        c.completado
                          ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                          : 'border-border/60 hover:border-border'
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={c.completado}
                            disabled={busy}
                            onChange={(e) => void onToggle(c, e.target.checked)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                            aria-label={c.completado ? 'Desmarcar validación' : 'Marcar como validado'}
                          />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {c.completado ? (
                              <p className="text-sm font-medium leading-snug text-foreground">{c.texto}</p>
                            ) : (
                              <>
                                <Input
                                  key={`${c.id}-${c.updated_at}`}
                                  defaultValue={c.texto}
                                  disabled={busy}
                                  maxLength={MAX_LEN}
                                  className="font-medium"
                                  aria-describedby={`cp-hint-${c.id}`}
                                  onBlur={(e) => void saveTexto(c, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                  }}
                                />
                                <p id={`cp-hint-${c.id}`} className="text-[11px] text-muted-foreground">
                                  Guarda al salir del campo (mín. {MIN_LEN} caracteres). Flechas: reordenar · papelera:
                                  eliminar.
                                </p>
                              </>
                            )}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 font-medium',
                                  c.completado
                                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                                    : 'bg-muted text-foreground/70'
                                )}
                              >
                                {c.completado ? 'Validado' : 'Pendiente'}
                              </span>
                              {audit && (
                                <span className="text-muted-foreground/90" title={audit.title}>
                                  {audit.line}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                        {!c.completado && (
                          <div className="flex shrink-0 items-center justify-end gap-0.5 border-t border-border/40 pt-2 sm:border-t-0 sm:pt-0 sm:pl-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-foreground"
                              aria-label="Subir en la lista"
                              disabled={busy || index === 0}
                              onClick={() => void swapOrden(c, -1)}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-foreground"
                              aria-label="Bajar en la lista"
                              disabled={busy || index === sorted.length - 1}
                              onClick={() => void swapOrden(c, 1)}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Eliminar punto pendiente"
                              disabled={busy}
                              onClick={() => void removePoint(c)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground/80">Sin puntos en el checklist</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Agrega ítems arriba cuando quieras. Si dejas la lista vacía, solo se exige evidencia para cerrar la
                  acción.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
