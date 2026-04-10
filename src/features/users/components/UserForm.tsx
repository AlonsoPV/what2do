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
import { useAreas } from '@/features/catalogs/hooks/useAreas'

interface UserFormProps {
  defaultValues?: Partial<UserFormValues> | null
  onSubmit: (values: UserFormValues) => void
  onCancel: () => void
  isSubmitting?: boolean
  /** true = invitar usuario por correo */
  isCreate?: boolean
}

export function UserForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isCreate = false,
}: UserFormProps) {
  const { data: roles = [], isLoading: loadingRoles } = useRoles({ activo: true })
  const { data: areas = [], isLoading: loadingAreas } = useAreas({ activo: true })
  const formSchema = useMemo(
    () => (isCreate ? createUserFormSchema : updateUserFormSchema),
    [isCreate]
  )

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? {
      email: '',
      nombre: '',
      rol: '',
      area: undefined,
      activo: true,
      onboarding_completed: false,
    },
  })

  useEffect(() => {
    form.reset(
      defaultValues ?? {
        email: '',
        nombre: '',
        rol: '',
        area: undefined,
        activo: true,
        onboarding_completed: false,
      }
    )
  }, [defaultValues, form, isCreate])

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {isCreate && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Cómo funciona la invitación</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>Indicas correo, nombre y rol (el área es opcional).</li>
            <li>Esa persona recibe un correo para elegir su contraseña de acceso.</li>
            <li>Al completar el paso, su ficha queda lista y puede entrar al tablero con ese rol.</li>
          </ol>
        </div>
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
            El mismo que usará para iniciar sesión. Si ese correo ya tiene cuenta, te lo indicamos.
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
        {form.formState.errors.rol && (
          <p className="text-sm text-destructive">{form.formState.errors.rol.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="area">Área</Label>
        <Select
          value={form.watch('area') ?? '__none__'}
          onValueChange={(v) => form.setValue('area', v === '__none__' ? undefined : v)}
          disabled={loadingAreas}
        >
          <SelectTrigger id="area">
            <SelectValue placeholder={loadingAreas ? 'Cargando áreas…' : 'Área (opcional)'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin área</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.nombre}>
                {a.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Opcional. Viene del catálogo de áreas.</p>
        {form.formState.errors.area && (
          <p className="text-sm text-destructive">{form.formState.errors.area.message}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...form.register('activo')}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm font-medium">Usuario activo</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...form.register('onboarding_completed')}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm font-medium">Registro de bienvenida completado</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : isCreate ? 'Enviar invitación' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
