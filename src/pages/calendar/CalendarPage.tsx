import { useCallback, useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAreas } from '@/features/catalogs/hooks/useAreas'
import { CalendarView, type CalendarFilters } from '@/features/calendar'
import { AccionFormDialog } from '@/features/operations'
import { useUsers } from '@/features/users/hooks/useUsers'
import { ACTION_STATUS, type AccionDiaria, type ActionStatus } from '@/types'

export function CalendarPage() {
  const { data: users = [] } = useUsers({ activo: true })
  const { data: areas = [] } = useAreas({ activo: true })
  const [filters, setFilters] = useState<CalendarFilters>({})
  const [editingAccion, setEditingAccion] = useState<AccionDiaria | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const responsableNames = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((user) => {
      map[user.id] = user.nombre
    })
    return map
  }, [users])

  const handleSelectAccion = useCallback((accion: AccionDiaria) => {
    setEditingAccion(accion)
    setDialogOpen(true)
  }, [])

  const hasFilters = Boolean(filters.area || filters.responsable || filters.estado || (filters.itemType && filters.itemType !== 'todos'))

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Planificacion</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendario de acciones</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Acciones por fecha. Filtra el calendario y selecciona un dia para ver acciones o crear notas privadas.
        </p>
      </header>

      <SectionCard>
        <SectionCardHeader title="Vista mensual" subtitle="Navega por mes, filtra acciones y agrega minutas privadas por dia." />
        <SectionCardBody className="p-0 sm:p-0">
          <div className="border-b border-border/60 bg-muted/10 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">Filtros del calendario</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajusta la vista mensual sin salir del calendario.
                </p>
              </div>
              <div className="flex flex-1 flex-wrap items-end gap-3 xl:justify-end">
              <div className="w-full space-y-1.5 sm:w-[180px]">
                <Label className="text-xs">Mostrar</Label>
                <Select
                  value={filters.itemType ?? 'todos'}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      itemType: value as CalendarFilters['itemType'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="acciones">Acciones</SelectItem>
                    <SelectItem value="recordatorios">Recordatorios</SelectItem>
                    <SelectItem value="minutas">Minutas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full space-y-1.5 sm:w-[190px]">
                <Label className="text-xs">Area</Label>
                <Select
                  value={filters.area ?? 'all'}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      area: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.nombre}>
                        {area.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full space-y-1.5 sm:w-[220px]">
                <Label className="text-xs">Responsable</Label>
                <Select
                  value={filters.responsable ?? 'all'}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      responsable: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full space-y-1.5 sm:w-[170px]">
                <Label className="text-xs">Estado</Label>
                <Select
                  value={filters.estado ?? 'all'}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      estado: value === 'all' ? undefined : (value as ActionStatus),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ACTION_STATUS.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasFilters ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setFilters({})}>
                  <X className="h-4 w-4" aria-hidden />
                  Limpiar
                </Button>
              ) : null}
              </div>
            </div>
          </div>
          <CalendarView
            responsableNames={responsableNames}
            onSelectAccion={handleSelectAccion}
            filters={filters}
          />
        </SectionCardBody>
      </SectionCard>

      <AccionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accion={editingAccion}
        onSuccess={() => setDialogOpen(false)}
        responsableNames={responsableNames}
      />
    </div>
  )
}
