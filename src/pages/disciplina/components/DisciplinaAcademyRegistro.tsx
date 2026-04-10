import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/constants'
import { ACADEMY_MODULES, ACADEMY_TOTAL_MODULES, useAcademyProgress } from '@/features/academy'
import { academyGlobalProgressPercent } from '@/features/academy/utils/academyProgress'

function formatUltimaActualizacion(iso: string | null): string {
  if (!iso) return 'Aún no hay registro guardado (entra a Academia para iniciar).'
  try {
    return new Date(iso).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

/**
 * Registro del avance en Academia O2C dentro del seguimiento de Disciplina.
 * Misma fuente de datos que la pantalla Academia (`academy_progress` por usuario).
 */
export function DisciplinaAcademyRegistro() {
  const { completedCount, isLoading, isSaving, error, updatedAt, isModuleCompleted } = useAcademyProgress()
  const percent = academyGlobalProgressPercent(completedCount, ACADEMY_TOTAL_MODULES)

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">Registro de avance — Academia O2C</CardTitle>
              <CardDescription>
                Tu progreso (módulos, pasos y quizzes) se guarda en tu cuenta y se muestra aquí como parte del
                seguimiento de disciplina formativa.
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 sm:mt-0.5" asChild>
            <Link to={ROUTES.ACADEMIA}>Ir a Academia</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar el registro: {error}</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando registro de academia…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{completedCount}</span> de {ACADEMY_TOTAL_MODULES}{' '}
                módulos completados
              </span>
              <span className="text-muted-foreground">{percent}% de avance</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Última actualización del registro:{' '}
              <span className="font-medium text-foreground">{formatUltimaActualizacion(updatedAt)}</span>
              {isSaving ? <span className="ml-2 text-primary">Guardando…</span> : null}
            </p>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Detalle por módulo
              </p>
              <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border/60 bg-background/80 p-2 text-sm">
                {ACADEMY_MODULES.map((m) => {
                  const done = isModuleCompleted(m.id)
                  return (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-muted/50"
                    >
                      <span className="min-w-0 leading-snug">
                        <span className="text-muted-foreground">M{m.id}</span>{' '}
                        <span className="text-foreground">{m.title}</span>
                      </span>
                      {done ? (
                        <Badge variant="success" className="shrink-0 text-[10px]">
                          Completado
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="shrink-0 text-[10px]">
                          Pendiente
                        </Badge>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
