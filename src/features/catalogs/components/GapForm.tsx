import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { cn } from '@/lib/utils'
import { useUsers } from '@/features/users/hooks/useUsers'
import {
  gapFormSchema,
  type GapFormInputValues,
  type GapFormValues,
} from '../schemas/gap.schema'

const STATUS_LABEL: Record<GapFormInputValues['status'], string> = {
  open: 'Abierto',
  in_progress: 'En curso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

interface GapFormProps {
  defaultValues?: Partial<GapFormInputValues> | null
  onSubmit: (values: GapFormValues) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function GapForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: GapFormProps) {
  const { data: users = [] } = useUsers({ activo: true })

  const form = useForm<GapFormInputValues>({
    resolver: zodResolver(gapFormSchema),
    defaultValues: defaultValues ?? {
      nombre: '',
      descripcion: undefined,
      prioridad: undefined,
      status: 'open',
      area: undefined,
      owner_usuario: '__none__',
      total_story_points: 0,
      activo: true,
    },
  })

  return (
    <form
      onSubmit={form.handleSubmit((raw) => {
        onSubmit(gapFormSchema.parse(raw))
      })}
      className="max-h-[min(85vh,720px)] space-y-6 overflow-y-auto pr-1"
    >
      <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">Identidad</h3>
        <div className="space-y-2">
          <Label htmlFor="gap-nombre">Nombre *</Label>
          <Input id="gap-nombre" {...form.register('nombre')} placeholder="Ej. O2C — Cumplimiento y entrega" />
          {form.formState.errors.nombre && (
            <p className="text-sm text-destructive">{form.formState.errors.nombre.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="gap-desc">Descripción</Label>
          <textarea
            id="gap-desc"
            {...form.register('descripcion')}
            placeholder="Contexto de la brecha"
            rows={3}
            className={cn(
              'flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gap-prioridad">Prioridad</Label>
            <Input id="gap-prioridad" {...form.register('prioridad')} placeholder="Opcional (texto libre)" />
          </div>
          <div className="space-y-2">
            <Label>Estado del gap</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as GapFormInputValues['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as GapFormInputValues['status'][]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {STATUS_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">Contexto</h3>
        <div className="space-y-2">
          <Label htmlFor="gap-area">Área</Label>
          <Input id="gap-area" {...form.register('area')} placeholder="Ej. Operaciones, Finanzas…" />
          <p className="text-xs text-muted-foreground">
            Debe alinearse con el catálogo de áreas cuando aplique.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Responsable (usuario)</Label>
          <Select
            value={
              !form.watch('owner_usuario') || form.watch('owner_usuario') === '__none__'
                ? '__none__'
                : String(form.watch('owner_usuario'))
            }
            onValueChange={(v) => form.setValue('owner_usuario', v as GapFormInputValues['owner_usuario'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin asignar</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gap-sp">Total story points (referencia)</Label>
          <Input
            id="gap-sp"
            type="number"
            min={0}
            step={0.5}
            {...form.register('total_story_points', { valueAsNumber: true })}
          />
          {form.formState.errors.total_story_points && (
            <p className="text-sm text-destructive">{form.formState.errors.total_story_points.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Denominador opcional si las acciones del gap no suman puntos propios.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" {...form.register('activo')} className="h-4 w-4 rounded border-input" />
          <span className="text-sm font-medium">Activo</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
