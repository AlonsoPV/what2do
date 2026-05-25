/**
 * Panel de ceremonias Scrum: planning, review y retro integrados al kanban.
 */

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react'
import {
  Target,
  CheckCircle,
  MessageSquare,
  Plus,
  Trash2,
  Zap,
  ChevronDown,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { addCalendarDays, todayWallClockCDMX } from '@/lib/dateUtils'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { accionStoryPoints, isAccionEstadoDone } from '@/features/kpi/utils/gapProgress'
import type { RetroTipo, AccionDiaria, Sprint, SprintRetroItem } from '@/types'
import { useAcciones } from '../hooks/useAcciones'
import {
  useSprintActivo,
  useSprints,
  useCrearSprint,
  useCerrarSprint,
  useActualizarSprint,
  useSprintRetro,
  useAgregarRetroItem,
  useEliminarRetroItem,
} from '../hooks/useSprint'

type CeremonyTab = 'planning' | 'review' | 'retro'
type SprintDraft = Pick<Sprint, 'nombre' | 'objetivo' | 'fecha_inicio' | 'fecha_fin'>
type SprintOrNull = ReturnType<typeof useSprintActivo>['data']

const CEREMONY_TABS: { id: CeremonyTab; label: string; icon: ElementType }[] = [
  { id: 'planning', label: 'Planning', icon: Target },
  { id: 'review', label: 'Review', icon: CheckCircle },
  { id: 'retro', label: 'Retro', icon: MessageSquare },
]

const RETRO_CONFIG: Record<
  RetroTipo,
  { short: string; color: string; placeholder: string }
> = {
  bien: {
    short: 'Bien',
    color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300',
    placeholder: 'Algo que funciono...',
  },
  mejorar: {
    short: 'Mejorar',
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300',
    placeholder: 'Algo que no funciono...',
  },
  accion: {
    short: 'Accion',
    color: 'bg-primary/10 border-primary/30 text-primary',
    placeholder: 'Que haremos distinto...',
  },
}

function StatPill(props: { label: string; value: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  const { label, value, tone = 'neutral' } = props
  return (
    <div className="rounded-md border border-border/50 bg-muted/25 px-2.5 py-1.5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-sm font-semibold tabular-nums',
          tone === 'ok' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'warn' && 'text-amber-600 dark:text-amber-400',
          tone === 'bad' && 'text-destructive',
          tone === 'neutral' && 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function avanceBarClass(pct: number) {
  if (pct >= 85) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-destructive'
}

function sprintDurationDays(start: string, end: string) {
  if (!start || !end) return 0
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
}

function nextSprintNumber(sprints: Sprint[]) {
  const maxNumber = sprints.reduce((max, sprint) => {
    const match = sprint.nombre.match(/\d+/)
    return match ? Math.max(max, Number(match[0])) : max
  }, 0)
  return maxNumber + 1
}

function buildSprintDraft(index = 1, start = todayWallClockCDMX(), days = 14): SprintDraft {
  return {
    nombre: `Sprint ${index}`,
    objetivo: '',
    fecha_inicio: start,
    fecha_fin: addCalendarDays(start, days - 1),
  }
}

function validateSprintDraft(draft: SprintDraft) {
  if (!draft.nombre.trim()) return 'Agrega un nombre para identificar el sprint.'
  if (!draft.fecha_inicio || !draft.fecha_fin) return 'Define fecha de inicio y fecha de fin.'
  if (draft.fecha_fin < draft.fecha_inicio) return 'La fecha de fin no puede ser anterior al inicio.'
  return null
}

export function SprintPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { data: sprint, isLoading } = useSprintActivo()
  const { data: sprints = [] } = useSprints()
  const [open, setOpen] = useState(defaultOpen)
  const { data: acciones = [] } = useAcciones({}, { enabled: !!sprint })
  const { data: currentUser } = useCurrentUser()
  const crearSprint = useCrearSprint()
  const actualizarSprint = useActualizarSprint()
  const cerrarSprint = useCerrarSprint()
  const agregarRetro = useAgregarRetroItem()
  const eliminarRetro = useEliminarRetroItem()
  const { data: retroItems = [] } = useSprintRetro(open && sprint?.id ? sprint.id : null)

  const [tab, setTab] = useState<CeremonyTab>('planning')
  const [nuevoObjetivo, setNuevoObjetivo] = useState('')
  const [nuevoSprint, setNuevoSprint] = useState<SprintDraft>(() => buildSprintDraft())
  const [draftTouched, setDraftTouched] = useState(false)
  const [retroTextos, setRetroTextos] = useState<Record<RetroTipo, string>>({
    bien: '',
    mejorar: '',
    accion: '',
  })

  const accionesDelSprint = useMemo(
    () => (sprint ? acciones.filter((a) => a.sprint_id === sprint.id && a.tipo_accion !== 'operativa') : []),
    [acciones, sprint]
  )

  const ptsDone = useMemo(
    () =>
      accionesDelSprint
        .filter((a) => isAccionEstadoDone(a.estado))
        .reduce((s, a) => s + accionStoryPoints(a), 0),
    [accionesDelSprint]
  )

  const ptsTotal = useMemo(
    () => accionesDelSprint.reduce((s, a) => s + accionStoryPoints(a), 0),
    [accionesDelSprint]
  )

  const ptsComprometidos = sprint?.velocidad_planificada ?? ptsTotal
  const avancePct =
    ptsComprometidos > 0 ? Math.min(100, Math.round((ptsDone / ptsComprometidos) * 100)) : 0

  const diasRestantes = sprint
    ? Math.max(0, Math.ceil((new Date(sprint.fecha_fin).getTime() - Date.now()) / 86400000))
    : 0

  const accionesCompletadas = accionesDelSprint.filter((a) => isAccionEstadoDone(a.estado))
  const suggestedSprint = useMemo(() => buildSprintDraft(nextSprintNumber(sprints)), [sprints])

  useEffect(() => {
    if (!sprint && !draftTouched) setNuevoSprint(suggestedSprint)
  }, [draftTouched, sprint, suggestedSprint])

  useEffect(() => {
    setNuevoObjetivo(sprint?.objetivo ?? '')
  }, [sprint?.id, sprint?.objetivo])

  if (isLoading) return null

  const goalLine = sprint?.objetivo?.trim() || 'Sin objetivo definido'

  return (
    <section
      id="kanban-sprint-panel"
      className="mb-4 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
    >
      <button
        type="button"
        className="flex w-full flex-col gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:gap-4 sm:px-4"
        aria-expanded={open}
        aria-controls="kanban-sprint-panel-body"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Scrum
              </span>
              <span className="hidden text-border sm:inline">-</span>
              <span className="truncate text-sm font-semibold text-foreground">
                {sprint ? sprint.nombre : 'Sin sprint activo'}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {sprint ? goalLine : 'Abrir para generar el siguiente sprint'}
            </p>
          </div>
        </div>

        {sprint ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md sm:flex-none">
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="tabular-nums">
                {diasRestantes}d - {ptsDone}/{ptsComprometidos} pts
              </span>
              <span className="font-medium tabular-nums text-foreground">{avancePct}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all duration-500', avanceBarClass(avancePct))}
                style={{ width: `${avancePct}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">Generar</span>
        )}

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          {sprint && !open ? (
            <span className="hidden text-[10px] tabular-nums text-muted-foreground sm:inline">
              {accionesDelSprint.length} acc.
            </span>
          ) : null}
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <div id="kanban-sprint-panel-body" className="border-t border-border/50">
          <div className="flex gap-0.5 overflow-x-auto px-3 py-2 sm:px-4">
            {CEREMONY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setTab(t.id)
                }}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <t.icon className="size-3" aria-hidden />
                {t.label}
              </button>
            ))}
          </div>

          <div className="border-t border-border/40 bg-muted/10 px-3 py-3 sm:px-4 sm:py-4">
            {tab === 'planning' ? (
              <PlanningTab
                sprint={sprint}
                nuevoSprint={nuevoSprint}
                setNuevoSprint={setNuevoSprint}
                setDraftTouched={setDraftTouched}
                nuevoObjetivo={nuevoObjetivo}
                setNuevoObjetivo={setNuevoObjetivo}
                accionesDelSprint={accionesDelSprint}
                ptsTotal={ptsTotal}
                diasRestantes={diasRestantes}
                crearSprint={crearSprint}
                actualizarSprint={actualizarSprint}
                currentUserId={currentUser?.id ?? null}
              />
            ) : null}

            {tab === 'review' ? (
              <ReviewTab
                sprint={sprint}
                accionesCompletadas={accionesCompletadas}
                ptsDone={ptsDone}
                ptsTotal={ptsTotal}
                avancePct={avancePct}
                cerrarSprint={cerrarSprint}
              />
            ) : null}

            {tab === 'retro' ? (
              <RetroTab
                sprint={sprint}
                retroItems={retroItems}
                retroTextos={retroTextos}
                setRetroTextos={setRetroTextos}
                agregarRetro={agregarRetro}
                eliminarRetro={eliminarRetro}
                currentUserId={currentUser?.id ?? null}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function PlanningTab(props: {
  sprint: SprintOrNull
  nuevoSprint: SprintDraft
  setNuevoSprint: React.Dispatch<React.SetStateAction<SprintDraft>>
  setDraftTouched: React.Dispatch<React.SetStateAction<boolean>>
  nuevoObjetivo: string
  setNuevoObjetivo: (v: string) => void
  accionesDelSprint: AccionDiaria[]
  ptsTotal: number
  diasRestantes: number
  crearSprint: ReturnType<typeof useCrearSprint>
  actualizarSprint: ReturnType<typeof useActualizarSprint>
  currentUserId: string | null
}) {
  const {
    sprint,
    nuevoSprint,
    setNuevoSprint,
    setDraftTouched,
    nuevoObjetivo,
    setNuevoObjetivo,
    accionesDelSprint,
    ptsTotal,
    diasRestantes,
    crearSprint,
    actualizarSprint,
    currentUserId,
  } = props

  const sprintError = !sprint ? validateSprintDraft(nuevoSprint) : null
  const duration = sprintDurationDays(nuevoSprint.fecha_inicio, nuevoSprint.fecha_fin)

  function updateDraft(patch: Partial<SprintDraft>) {
    setDraftTouched(true)
    setNuevoSprint((p) => ({ ...p, ...patch }))
  }

  function applyCadence(days: number) {
    const start = nuevoSprint.fecha_inicio || todayWallClockCDMX()
    updateDraft({ fecha_inicio: start, fecha_fin: addCalendarDays(start, days - 1) })
  }

  if (!sprint) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/80 p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Genera el contenedor del sprint</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              El sistema propone nombre y dos semanas; despues vincula acciones desde el formulario del kanban.
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button type="button" variant="secondary" size="sm" onClick={() => applyCadence(14)}>
              <CalendarDays className="size-3.5" />
              2 sem.
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyCadence(28)}>
              4 sem.
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Nombre *">
            <Input
              className="h-9"
              placeholder="Sprint 1"
              value={nuevoSprint.nombre}
              onChange={(e) => updateDraft({ nombre: e.target.value })}
            />
          </Field>
          <Field label="Sprint Goal">
            <Input
              className="h-9"
              placeholder="Resultado observable del sprint"
              value={nuevoSprint.objetivo ?? ''}
              onChange={(e) => updateDraft({ objetivo: e.target.value })}
            />
          </Field>
          <Field label="Inicio *">
            <Input
              className="h-9"
              type="date"
              value={nuevoSprint.fecha_inicio}
              onChange={(e) => updateDraft({ fecha_inicio: e.target.value })}
            />
          </Field>
          <Field label="Fin *">
            <Input
              className="h-9"
              type="date"
              value={nuevoSprint.fecha_fin}
              onChange={(e) => updateDraft({ fecha_fin: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-6 px-2 text-[10px]">
            {duration || '-'} dias
          </Badge>
          {sprintError ? <span className="text-[11px] text-destructive">{sprintError}</span> : null}
        </div>

        <Button
          size="sm"
          className="h-8"
          disabled={crearSprint.isPending}
          onClick={() => {
            const error = validateSprintDraft(nuevoSprint)
            if (error) {
              toast.error(error)
              return
            }
            crearSprint.mutate(
              { ...nuevoSprint, estado: 'activo', created_by: currentUserId },
              {
                onSuccess: () => {
                  toast.success('Sprint generado. Ahora agrega acciones al compromiso.')
                  setDraftTouched(false)
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al crear sprint'),
              }
            )
          }}
        >
          <Plus className="size-3.5" />
          Generar sprint
        </Button>
      </div>
    )
  }

  const objectiveChanged = nuevoObjetivo.trim() !== (sprint.objetivo ?? '').trim()

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="h-9 flex-1"
          value={nuevoObjetivo}
          onChange={(e) => setNuevoObjetivo(e.target.value)}
          placeholder="Sprint Goal..."
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          disabled={actualizarSprint.isPending || !objectiveChanged}
          onClick={() => {
            actualizarSprint.mutate(
              { id: sprint.id, payload: { objetivo: nuevoObjetivo.trim() || null } },
              { onSuccess: () => toast.success('Objetivo actualizado') }
            )
          }}
        >
          Guardar goal
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
        <StatPill label="Acciones" value={accionesDelSprint.length} />
        <StatPill label="Story pts" value={ptsTotal} />
        <StatPill label="Dias" value={diasRestantes} />
      </div>

      {ptsTotal > 0 && sprint.velocidad_planificada == null ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={actualizarSprint.isPending}
          onClick={() => {
            actualizarSprint.mutate(
              { id: sprint.id, payload: { velocidad_planificada: ptsTotal } },
              { onSuccess: () => toast.success(`Compromiso: ${ptsTotal} pts`) }
            )
          }}
        >
          Registrar compromiso ({ptsTotal} pts)
        </Button>
      ) : sprint.velocidad_planificada != null ? (
        <p className="text-[11px] text-muted-foreground">
          Compromiso congelado: {sprint.velocidad_planificada} pts. Los cambios posteriores se comparan contra esa base.
        </p>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Vincula acciones desde el formulario del kanban: marca "Incluir en {sprint.nombre}".
      </p>
    </div>
  )
}

function ReviewTab(props: {
  sprint: SprintOrNull
  accionesCompletadas: AccionDiaria[]
  ptsDone: number
  ptsTotal: number
  avancePct: number
  cerrarSprint: ReturnType<typeof useCerrarSprint>
}) {
  const { sprint, accionesCompletadas, ptsDone, ptsTotal, avancePct, cerrarSprint } = props

  if (!sprint) {
    return <EmptyCeremony hint="Crea un sprint en Planning." />
  }

  const velocityTone = avancePct >= 85 ? 'ok' : avancePct >= 50 ? 'warn' : 'bad'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill label="Hechas" value={accionesCompletadas.length} />
        <StatPill label="Pts done" value={ptsDone} tone="ok" />
        <StatPill label="Pts total" value={ptsTotal} />
        <StatPill label="Avance" value={`${avancePct}%`} tone={velocityTone} />
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Completadas
        </p>
        {accionesCompletadas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin acciones completadas aun.</p>
        ) : (
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {accionesCompletadas.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-emerald-200/80 bg-emerald-50/80 px-2 py-1.5 dark:border-emerald-900/60 dark:bg-emerald-950/40"
              >
                <CheckCircle className="size-3 shrink-0 text-emerald-600" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {a.titulo_accion || a.descripcion_accion}
                </span>
                <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[9px]">
                  {accionStoryPoints(a)} pts
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={cerrarSprint.isPending}
          onClick={() => {
            cerrarSprint.mutate(
              { id: sprint.id, velocidadReal: ptsDone },
              {
                onSuccess: () => toast.success(`Sprint cerrado - ${ptsDone} pts`),
                onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al cerrar'),
              }
            )
          }}
        >
          Cerrar sprint
        </Button>
        <span className="text-[11px] text-muted-foreground">Velocity real: {ptsDone} pts</span>
      </div>
    </div>
  )
}

function RetroTab(props: {
  sprint: SprintOrNull
  retroItems: SprintRetroItem[]
  retroTextos: Record<RetroTipo, string>
  setRetroTextos: React.Dispatch<React.SetStateAction<Record<RetroTipo, string>>>
  agregarRetro: ReturnType<typeof useAgregarRetroItem>
  eliminarRetro: ReturnType<typeof useEliminarRetroItem>
  currentUserId: string | null
}) {
  const {
    sprint,
    retroItems,
    retroTextos,
    setRetroTextos,
    agregarRetro,
    eliminarRetro,
    currentUserId,
  } = props

  if (!sprint) {
    return <EmptyCeremony hint="Crea un sprint en Planning." />
  }

  function submitRetro(tipo: RetroTipo) {
    const texto = retroTextos[tipo].trim()
    if (!texto) return
    agregarRetro.mutate(
      { sprint_id: sprint!.id, tipo, texto, autor_id: currentUserId },
      { onSuccess: () => setRetroTextos((p) => ({ ...p, [tipo]: '' })) }
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {(['bien', 'mejorar', 'accion'] as RetroTipo[]).map((tipo) => (
        <div key={tipo} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/50 bg-card/80 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {RETRO_CONFIG[tipo].short}
          </p>
          <ul className="min-h-[2rem] max-h-28 space-y-1 overflow-y-auto">
            {retroItems
              .filter((r) => r.tipo === tipo)
              .map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'flex items-start gap-1.5 rounded border px-2 py-1 text-xs',
                    RETRO_CONFIG[tipo].color
                  )}
                >
                  <span className="min-w-0 flex-1 leading-snug">{item.texto}</span>
                  <button
                    type="button"
                    onClick={() => eliminarRetro.mutate({ id: item.id, sprintId: sprint.id })}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
          </ul>
          <div className="mt-auto flex gap-1">
            <Input
              className="h-8 text-xs"
              placeholder={RETRO_CONFIG[tipo].placeholder}
              value={retroTextos[tipo]}
              onChange={(e) => setRetroTextos((p) => ({ ...p, [tipo]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRetro(tipo)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              disabled={!retroTextos[tipo].trim() || agregarRetro.isPending}
              onClick={() => submitRetro(tipo)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

function EmptyCeremony({ hint }: { hint: string }) {
  return <p className="text-xs text-muted-foreground">{hint}</p>
}
