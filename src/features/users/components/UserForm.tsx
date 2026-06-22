import { useEffect, useMemo } from 'react'
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
import {
  createUserFormSchema,
  updateUserFormSchema,
  type UserFormValues,
} from '../schemas/user.schema'
import { useRoles } from '@/features/catalogs/hooks/useRoles'

interface UserFormProps {
  defaultValues?: Partial<UserFormValues> | null
  onSubmit: (values: UserFormValues) => void
  onCancel: () => void
  isSubmitting?: boolean
  /** true = crear usuario y enviar invitacion por correo */
  isCreate?: boolean
  /** Oculta acciones; usar con `formId` y botones externos. */
  hideActions?: boolean
  formId?: string
}

const EMPTY_USER_FORM: UserFormValues = {
  email: '',
  nombre: '',
  rol: '',
  area: undefined,
  activo: true,
}

export function UserForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isCreate = false,
  hideActions = false,
  formId,
}: UserFormProps) {
  const { data: roles = [], isLoading: loadingRoles } = useRoles({ activo: true })
  const formSchema = useMemo(
    () => (isCreate ? createUserFormSchema : updateUserFormSchema),
    [isCreate]
  )

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? EMPTY_USER_FORM,
  })

  useEffect(() => {
    form.reset(defaultValues ?? EMPTY_USER_FORM)
  }, [defaultValues, form])

  return (
    <form
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {isCreate ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Campos al invitar</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><strong className="text-foreground">Correo</strong> — acceso al tablero (obligatorio).</li>
            <li><strong className="text-foreground">Nombre</strong> — cómo aparece en kanban y acciones.</li>
            <li><strong className="text-foreground">Rol</strong> — permisos del usuario (obligatorio).</li>
            <li><strong className="text-foreground">Área</strong> — etiqueta opcional de equipo o departamento.</li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Puedes cambiar nombre, rol, área y si la cuenta está activa. El correo solo se modifica desde Auth.
        </p>
      )}

      {isCreate && (
        <div className="space-y-2">
          <Label htmlFor="email">Correo *</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            placeholder="correo@empresa.com"
            autoComplete="email"
          />
          <p className="text-xs text-muted-foreground">
            Será su usuario de acceso. Si ya existe, te lo indicamos al guardar.
          </p>
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre *</Label>
        <Input
          id="nombre"
          {...form.register('nombre')}
          placeholder="Nombre en el tablero"
          autoComplete="name"
        />
        <p className="text-xs text-muted-foreground">
          Nombre visible en acciones, asignaciones y notificaciones.
        </p>
        {form.formState.errors.nombre && (
          <p className="text-sm text-destructive">{form.formState.errors.nombre.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rol">Rol *</Label>
        <Select
          value={form.watch('rol')}
          onValueChange={(v) => form.setValue('rol', v)}
          disabled={loadingRoles}
        >
          <SelectTrigger id="rol">
            <SelectValue placeholder={loadingRoles ? 'Cargando roles…' : 'Elige un rol'} />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.nombre}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controla permisos en el tablero. Adminístralo en Configuración → Roles.
        </p>
        {form.formState.errors.rol && (
          <p className="text-sm text-destructive">{form.formState.errors.rol.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="area">Área</Label>
        <Input
          id="area"
          {...form.register('area')}
          placeholder="Ej. Operaciones, Finanzas…"
        />
        <p className="text-xs text-muted-foreground">
          Opcional. Texto libre para agrupar o filtrar usuarios.
        </p>
        {form.formState.errors.area && (
          <p className="text-sm text-destructive">{form.formState.errors.area.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            {...form.register('activo')}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="text-sm font-medium">Usuario activo</span>
            <p className="text-xs text-muted-foreground">
              Desactivado = no puede iniciar sesión hasta que lo reactives.
            </p>
          </span>
        </label>
      </div>

      {!hideActions ? (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : isCreate ? 'Crear y enviar invitación' : 'Guardar cambios'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}
