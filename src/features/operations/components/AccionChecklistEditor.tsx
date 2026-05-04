/**
 * Checklist local al crear acción (antes de existir accion_id).
 * No persiste hasta que el padre llama insertMany tras crear la acción.
 */

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ListChecks, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const MIN_LEN = 3
const MAX_LEN = 400

export type LocalCheckpointDraft = {
  key: string
  texto: string
  obligatorio: boolean
}

export interface AccionChecklistEditorProps {
  items: LocalCheckpointDraft[]
  onChange: (items: LocalCheckpointDraft[]) => void
  disabled?: boolean
}

function newKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random()}`
}

export function AccionChecklistEditor({ items, onChange, disabled }: AccionChecklistEditorProps) {
  const [draft, setDraft] = useState('')

  const addItem = useCallback(() => {
    const t = draft.trim()
    if (t.length < MIN_LEN) return
    if (t.length > MAX_LEN) return
    const lower = t.toLowerCase()
    if (items.some((i) => i.texto.trim().toLowerCase() === lower)) {
      return
    }
    onChange([...items, { key: newKey(), texto: t, obligatorio: true }])
    setDraft('')
  }, [draft, items, onChange])

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[index], next[j]] = [next[j], next[index]]
    onChange(next)
  }

  const draftTrim = draft.trim()
  const draftTooShort = draftTrim.length > 0 && draftTrim.length < MIN_LEN

  return (
    <Card className="border-border/60 bg-muted/5 shadow-none">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3 pt-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <h4 className="text-sm font-semibold leading-tight">Puntos a validar</h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Opcional. Si agregas ítems, deberán completarse todos (en el seguimiento) antes de marcar la acción como
            Hecha. Lista vacía = no hay checklist que bloquee el cierre.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 pb-5">
        <div className="rounded-lg border border-dashed border-border/70 bg-background/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="checkpoint-draft" className="text-xs font-medium text-foreground/80">
                Texto del punto
              </Label>
              <Input
                id="checkpoint-draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ej: Evidencia subida y revisada por el responsable…"
                maxLength={MAX_LEN}
                disabled={disabled}
                className="h-10"
                aria-invalid={draftTooShort}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
              />
              <p className={cn('text-[11px]', draftTooShort ? 'text-destructive' : 'text-muted-foreground')}>
                {draftTooShort
                  ? `Escribe al menos ${MIN_LEN} caracteres o borra el texto.`
                  : `Mínimo ${MIN_LEN} caracteres · ${draftTrim.length}/${MAX_LEN}`}
              </p>
            </div>
            <Button
              type="button"
              className="shrink-0 sm:min-w-[148px]"
              onClick={addItem}
              disabled={disabled || draftTrim.length < MIN_LEN}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar al checklist
            </Button>
          </div>
        </div>

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item, index) => {
              const t = item.texto.trim()
              const rowInvalid = t.length > 0 && t.length < MIN_LEN
              return (
                <li
                  key={item.key}
                  className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/90 px-3 py-3 shadow-sm sm:flex-row sm:items-start sm:gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input
                      value={item.texto}
                      onChange={(e) => {
                        const v = e.target.value.slice(0, MAX_LEN)
                        const next = items.map((it) => (it.key === item.key ? { ...it, texto: v } : it))
                        onChange(next)
                      }}
                      disabled={disabled}
                      className={cn('min-w-0 font-medium', rowInvalid && 'border-destructive/60')}
                      aria-invalid={rowInvalid}
                    />
                    {rowInvalid && (
                      <p className="text-[11px] text-destructive">Mínimo {MIN_LEN} caracteres o elimina la fila.</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-0.5 sm:pt-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      aria-label="Subir"
                      disabled={disabled || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      aria-label="Bajar"
                      disabled={disabled || index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar punto"
                      disabled={disabled}
                      onClick={() => onChange(items.filter((it) => it.key !== item.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
            <p className={cn('text-xs text-muted-foreground', disabled && 'opacity-50')}>
              Aún no agregaste puntos. La acción podrá cerrarse sin checklist si el resto de reglas lo permiten.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
