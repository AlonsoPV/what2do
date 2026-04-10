import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Columns3, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/constants'
import { useAcciones } from '@/features/operations'
import { todayCDMX } from '@/lib/dateUtils'

function isCerrada(estado: string): boolean {
  return estado === 'Hecho' || estado === 'Verificado'
}

interface DisciplinaAccionesCardProps {
  fecha: string
  usuarioId: string | undefined
}

/**
 * Resumen de acciones asignadas al usuario para la misma fecha de referencia que las métricas de disciplina.
 */
export function DisciplinaAccionesCard({ fecha, usuarioId }: DisciplinaAccionesCardProps) {
  const today = todayCDMX()
  const { data: acciones = [], isLoading, isError } = useAcciones(
    {
      fecha_creacion: fecha,
      responsable: usuarioId ?? '',
    },
    { enabled: !!usuarioId }
  )

  const stats = useMemo(() => {
    let abiertas = 0
    let cerradas = 0
    let sinEvidencia = 0
    for (const a of acciones) {
      const done = isCerrada(a.estado)
      if (done) {
        cerradas++
        if (!a.evidencia_cargada) sinEvidencia++
      } else {
        abiertas++
      }
    }
    return {
      total: acciones.length,
      abiertas,
      cerradas,
      sinEvidencia,
    }
  }, [acciones])

  const fechaRel =
    fecha === today
      ? 'hoy'
      : new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { dateStyle: 'medium' })

  if (!usuarioId) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Acciones asignadas</CardTitle>
          <CardDescription>Inicia sesión para ver el seguimiento de tus acciones.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">Acciones asignadas</CardTitle>
            <CardDescription>
              Mismas reglas que las métricas de abajo: acciones con tu responsable y fecha de creación hasta{' '}
              <span className="font-medium text-foreground">{fechaRel}</span>.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <p className="text-sm text-destructive">No se pudieron cargar las acciones.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando acciones…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold tabular-nums">{stats.total}</p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-center">
                <p className="text-xs text-amber-800 dark:text-amber-200">En curso</p>
                <p className="text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                  {stats.abiertas}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-center">
                <p className="text-xs text-emerald-800 dark:text-emerald-200">Cerradas</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                  {stats.cerradas}
                </p>
              </div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-center">
                <p className="text-xs text-destructive/90">Sin evidencia</p>
                <p className="text-lg font-semibold tabular-nums text-destructive">{stats.sinEvidencia}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={ROUTES.KANBAN}>
                  <Columns3 className="mr-1.5 h-4 w-4" />
                  Kanban
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={ROUTES.DASHBOARD}>
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />
                  Tablero
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
