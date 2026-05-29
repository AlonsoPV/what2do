import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileWarning,
  Flame,
  MessageSquare,
  PenLine,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { useDisciplinaMetrics, type DisciplinaMetrics } from '@/features/metrics'
import { useAcciones } from '@/features/operations/hooks'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { accionComentariosService } from '@/services/accionComentarios.service'
import { addCalendarDays, todayWallClockCDMX } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import type { AccionDiaria } from '@/types'
import type { AccionComentario } from '@/types/accionComentario'
import { DisciplinaAcademyRegistro } from './components/DisciplinaAcademyRegistro'
import { DisciplinaAccionesCard } from './components/DisciplinaAccionesCard'

const DONE_STATES = new Set(['Hecho', 'Verificado'])
type MetricTone = 'neutral' | 'good' | 'warn' | 'risk'

export function DisciplinaPage() {
  const today = todayWallClockCDMX()
  const [fecha] = useState(today)
  const { data: currentUser } = useCurrentUser()
  const historyStart = useMemo(() => addCalendarDays(today, -90), [today])
  const {
    data: acciones = [],
    isLoading: loadingActions,
    isError: actionsError,
    refetch: retryActions,
  } = useAcciones({ fecha_min: historyStart })
  const actionIds = useMemo(() => acciones.map((action) => action.id), [acciones])
  const {
    data: comentarios = [],
    isLoading: loadingComments,
    isError: commentsError,
    refetch: retryComments,
  } = useQuery({
    queryKey: ['disciplina', 'comentarios', actionIds],
    queryFn: () => accionComentariosService.listByAccionIds(actionIds),
    enabled: actionIds.length > 0,
    staleTime: 30_000,
    retry: 1,
  })
  const { data: dailyMetrics } = useDisciplinaMetrics(currentUser?.id, fecha)
  const personalActions = useMemo(
    () => getUserOwnedActions(currentUser?.id, acciones, comentarios),
    [acciones, comentarios, currentUser?.id]
  )
  const personalComments = useMemo(
    () => getUserRelevantComments(currentUser?.id, comentarios, personalActions),
    [comentarios, currentUser?.id, personalActions]
  )

  const personalMetrics = useMemo(
    () => buildPersonalMetrics(currentUser?.id, personalActions, personalComments, today),
    [currentUser?.id, personalActions, personalComments, today]
  )
  const loading = loadingActions
  const hasError = actionsError

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disciplina</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Tu día operativo</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Revisa acciones, formación y métricas en un solo lugar. Empieza por{' '}
              <span className="font-medium text-foreground">Acciones del día</span> y cierra pendientes con evidencia.
            </p>
          </div>
          <div className="grid min-w-[17rem] grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/20 text-center">
            <HeaderStat label="Mis acciones" value={String(personalActions.length)} />
            <HeaderStat label="Asignadas" value={String(personalMetrics.assigned)} />
            <HeaderStat label="Comentarios" value={loadingComments ? '...' : String(personalComments.length)} />
          </div>
        </div>
      </header>

      {hasError ? (
        <SectionCard>
          <SectionCardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">No se pudo cargar tu informacion operativa.</p>
              <p className="text-sm text-muted-foreground">Puedes reintentar sin salir de Disciplina.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void retryActions()
                if (commentsError) void retryComments()
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reintentar
            </Button>
          </SectionCardBody>
        </SectionCard>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonBlock className="lg:col-span-2" />
          <SkeletonBlock />
        </div>
      ) : currentUser ? (
        <>
          <section aria-labelledby="disciplina-seguimiento-heading">
            <SectionCard>
              <SectionCardHeader
                titleId="disciplina-seguimiento-heading"
                eyebrow="Paso 1"
                title="Seguimiento operativo"
                subtitle="Acciones de hoy y progreso en Academia."
                icon={CalendarCheck}
              />
              <SectionCardBody className="space-y-6">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                  <DisciplinaAccionesCard fecha={fecha} usuarioId={currentUser.id} />
                  <DisciplinaAcademyRegistro />
                </div>
              </SectionCardBody>
            </SectionCard>
          </section>

          {dailyMetrics ? <DisciplineMetricsSection metrics={dailyMetrics} /> : null}

          <section aria-labelledby="disciplina-acciones-heading">
            <SectionCard>
              <SectionCardHeader
                titleId="disciplina-acciones-heading"
                eyebrow="Paso 2"
                title="Tus indicadores de acciones"
                subtitle="Creadas, asignadas o donde fuiste etiquetado en los ultimos 90 dias."
                icon={Target}
              />
              <SectionCardBody className="space-y-5">
                <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
                  <ActionSummaryPanel metrics={personalMetrics} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ActionMetricCard
                      icon={Clock3}
                      label="Cerradas en tiempo"
                      value={`${personalMetrics.onTimeClosed}/${personalMetrics.closedUserActions}`}
                      helper={`${personalMetrics.onTimeRate}% dentro de fecha`}
                      tone={personalMetrics.onTimeRate >= 80 ? 'good' : personalMetrics.onTimeRate >= 50 ? 'warn' : 'neutral'}
                    />
                    <ActionMetricCard
                      icon={PenLine}
                      label="Generadas por ti"
                      value={String(personalMetrics.created)}
                      helper="Acciones creadas en el periodo"
                    />
                    <ActionMetricCard
                      icon={MessageSquare}
                      label="Comentarios hechos"
                      value={String(personalMetrics.commentsMade)}
                      helper="Participacion en conversaciones"
                    />
                    <ActionMetricCard
                      icon={Users}
                      label="Etiquetado en comentarios"
                      value={String(personalMetrics.taggedComments)}
                      helper={`${personalMetrics.taggedActions} accion(es) donde te involucraron`}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  <ParticipationCard metrics={personalMetrics} />
                </div>
              </SectionCardBody>
            </SectionCard>
          </section>
        </>
      ) : (
        <SectionCard>
          <SectionCardBody>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
              Inicia sesion para ver tu disciplina operativa.
            </div>
          </SectionCardBody>
        </SectionCard>
      )}
    </div>
  )
}

interface PersonalMetrics {
  assigned: number
  closedAssigned: number
  userActions: number
  closedUserActions: number
  closeRate: number
  onTimeClosed: number
  onTimeRate: number
  created: number
  taggedActions: number
  commentsMade: number
  taggedComments: number
  participationStreak: number
  participationDays: string[]
}

function DisciplineMetricsSection({ metrics }: { metrics: DisciplinaMetrics }) {
  const completionTone = getTone(metrics.porcentaje_cumplimiento)
  const evidenceTone = metrics.acciones_sin_evidencia > 0 ? 'warn' : 'good'
  const relapseTone = metrics.reincidencias > 0 ? 'risk' : 'good'

  return (
    <section aria-labelledby="disciplina-metricas-heading">
      <SectionCard>
        <SectionCardHeader
          titleId="disciplina-metricas-heading"
          eyebrow="Salud del día"
          title="Métricas de disciplina"
          subtitle="Cumplimiento, evidencia, racha y reincidencias."
          icon={Target}
          className="py-3 sm:px-5"
        />
        <SectionCardBody className="space-y-3 p-4 sm:p-5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
            <div
              className={cn(
                'rounded-lg border px-3 py-3 sm:col-span-2 xl:col-span-1',
                toneSurface(completionTone)
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Cumplimiento de hoy
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-3xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
                      {metrics.porcentaje_cumplimiento}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {metrics.acciones_cerradas_en_tiempo}/{metrics.acciones_asignadas} cerradas a tiempo
                    </span>
                  </div>
                </div>
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background/80">
                <div
                  className={cn('h-full rounded-full transition-[width]', toneBar(completionTone))}
                  style={{ width: `${metrics.porcentaje_cumplimiento}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-snug text-muted-foreground">
                {completionCopy(metrics.porcentaje_cumplimiento)}
              </p>
            </div>

            <CompactDisciplineStat
              icon={FileWarning}
              label="Sin evidencia"
              value={String(metrics.acciones_sin_evidencia)}
              tone={evidenceTone}
            />
            <CompactDisciplineStat
              icon={Flame}
              label="Racha en verde"
              value={String(metrics.dias_consecutivos_en_verde)}
              tone={metrics.dias_consecutivos_en_verde > 0 ? 'good' : 'neutral'}
            />
            <CompactDisciplineStat
              icon={AlertTriangle}
              label="Reincidencias"
              value={String(metrics.reincidencias)}
              tone={relapseTone}
            />
          </div>
          {metrics.fromFallback ? (
            <p className="rounded-md border border-border/50 bg-muted/10 px-3 py-1.5 text-[11px] leading-snug text-muted-foreground">
              Calculado desde acciones; la medición diaria aún no se persiste automáticamente.
            </p>
          ) : null}
        </SectionCardBody>
      </SectionCard>
    </section>
  )
}

function buildPersonalMetrics(
  userId: string | undefined,
  actions: AccionDiaria[],
  comments: AccionComentario[],
  today: string
): PersonalMetrics {
  if (!userId) {
    return {
      assigned: 0,
      closedAssigned: 0,
      userActions: 0,
      closedUserActions: 0,
      closeRate: 0,
      onTimeClosed: 0,
      onTimeRate: 0,
      created: 0,
      taggedActions: 0,
      commentsMade: 0,
      taggedComments: 0,
      participationStreak: 0,
      participationDays: [],
    }
  }

  const assigned = actions.filter((action) => action.responsable === userId)
  const closedAssigned = assigned.filter(isDone)
  const created = actions.filter((action) => action.created_by === userId)
  const commentsMade = comments.filter((comment) => comment.created_by === userId)
  const taggedComments = comments.filter((comment) => isTaggedInComment(comment, userId))
  const taggedActionIds = new Set(taggedComments.map((comment) => comment.accion_id))
  const taggedActions = actions.filter((action) => taggedActionIds.has(action.id))
  const userActions = uniqueActions([...assigned, ...created, ...taggedActions])
  const closedUserActions = userActions.filter(isDone)
  const onTimeClosed = closedUserActions.filter(isClosedOnTime)
  const participationDays = new Set<string>()

  created.forEach((action) => participationDays.add(toDayKey(action.created_at)))
  closedUserActions.forEach((action) => participationDays.add(toDayKey(action.verified_at || action.completed_at || action.updated_at)))
  commentsMade.forEach((comment) => participationDays.add(toDayKey(comment.created_at)))

  return {
    assigned: assigned.length,
    closedAssigned: closedAssigned.length,
    userActions: userActions.length,
    closedUserActions: closedUserActions.length,
    closeRate: percentage(closedUserActions.length, userActions.length),
    onTimeClosed: onTimeClosed.length,
    onTimeRate: percentage(onTimeClosed.length, closedUserActions.length),
    created: created.length,
    taggedActions: taggedActions.length,
    commentsMade: commentsMade.length,
    taggedComments: taggedComments.length,
    participationStreak: calculateParticipationStreak(participationDays, today),
    participationDays: [...participationDays].sort().reverse(),
  }
}

function ParticipationCard({ metrics }: { metrics: PersonalMetrics }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Racha de participacion</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Cuenta dias seguidos donde cerraste acciones, generaste acciones o comentaste.
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums text-foreground">{metrics.participationStreak}</p>
          <p className="text-xs text-muted-foreground">dias</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Involucradas" value={String(metrics.userActions)} />
        <MiniStat label="Creadas" value={String(metrics.created)} />
        <MiniStat label="Dias con actividad" value={String(metrics.participationDays.length)} />
      </div>
    </div>
  )
}

function ActionSummaryPanel({ metrics }: { metrics: PersonalMetrics }) {
  const tone = getTone(metrics.closeRate)
  return (
    <div className={cn('rounded-xl border p-5', toneSurface(tone))}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cumplimiento de acciones</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl font-semibold tracking-tight text-foreground">{metrics.closeRate}%</span>
            <span className="pb-2 text-sm text-muted-foreground">
              {metrics.closedUserActions}/{metrics.userActions}
            </span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background">
          <CheckCircle2 className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-background">
        <div className={cn('h-full rounded-full', toneBar(tone))} style={{ width: `${metrics.closeRate}%` }} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Asignadas" value={String(metrics.assigned)} />
        <MiniStat label="Creadas" value={String(metrics.created)} />
        <MiniStat label="Pendientes" value={String(Math.max(metrics.userActions - metrics.closedUserActions, 0))} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{actionCopy(metrics)}</p>
    </div>
  )
}

function ActionMetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  icon: typeof CheckCircle2
  label: string
  value: string
  helper: string
  tone?: MetricTone
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        toneSurface(tone)
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{helper}</p>
    </div>
  )
}

function CompactDisciplineStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2
  label: string
  value: string
  tone: MetricTone
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border px-3 py-3', toneSurface(tone))}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background/70">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums leading-tight text-foreground">{value}</p>
      </div>
    </div>
  )
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('h-64 animate-pulse rounded-xl border border-border bg-muted/20', className)} />
}

function isDone(action: AccionDiaria) {
  return DONE_STATES.has(action.estado)
}

function isTaggedInComment(comment: AccionComentario, userId: string): boolean {
  return comment.asignado === userId || comment.etiquetas?.includes(userId)
}

function uniqueActions(actions: AccionDiaria[]): AccionDiaria[] {
  return [...new Map(actions.map((action) => [action.id, action])).values()]
}

function getUserOwnedActions(
  userId: string | undefined,
  actions: AccionDiaria[],
  comments: AccionComentario[]
): AccionDiaria[] {
  if (!userId) return []
  const taggedActionIds = new Set(
    comments.filter((comment) => isTaggedInComment(comment, userId)).map((comment) => comment.accion_id)
  )
  return uniqueActions(
    actions.filter(
      (action) => action.created_by === userId || action.responsable === userId || taggedActionIds.has(action.id)
    )
  )
}

function getUserRelevantComments(
  userId: string | undefined,
  comments: AccionComentario[],
  personalActions: AccionDiaria[]
): AccionComentario[] {
  if (!userId) return []
  const personalActionIds = new Set(personalActions.map((action) => action.id))
  return comments.filter(
    (comment) => isTaggedInComment(comment, userId) || personalActionIds.has(comment.accion_id)
  )
}

function isClosedOnTime(action: AccionDiaria) {
  const closedAt = action.verified_at || action.completed_at || action.updated_at
  const dueAt = new Date(`${action.fecha}T${action.hora_limite || '23:59'}`)
  return new Date(closedAt).getTime() <= dueAt.getTime()
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function getTone(value: number): MetricTone {
  if (value >= 80) return 'good'
  if (value >= 50) return 'warn'
  return 'neutral'
}

function toneSurface(tone: MetricTone) {
  if (tone === 'good') return 'border-emerald-500/30 bg-emerald-500/5'
  if (tone === 'warn') return 'border-amber-500/30 bg-amber-500/5'
  if (tone === 'risk') return 'border-destructive/30 bg-destructive/5'
  return 'border-border/70 bg-muted/10'
}

function toneBar(tone: MetricTone) {
  if (tone === 'good') return 'bg-emerald-500'
  if (tone === 'warn') return 'bg-amber-500'
  if (tone === 'risk') return 'bg-destructive'
  return 'bg-primary'
}

function completionCopy(value: number) {
  if (value >= 90) return 'Buen ritmo: el dia esta controlado y con cierre consistente.'
  if (value >= 60) return 'Hay avance, pero todavia conviene cerrar pendientes antes del corte.'
  return 'Prioridad: enfocar el dia en cerrar acciones y documentar evidencia.'
}

function actionCopy(metrics: PersonalMetrics) {
  if (metrics.userActions === 0) return 'Sin acciones creadas, asignadas o etiquetadas en el periodo; tu participacion se mide por comentarios.'
  if (metrics.closeRate >= 80) return 'Tus acciones visibles van bien encaminadas; manten el cierre en fecha.'
  if (metrics.closeRate >= 50) return 'Tienes avance parcial; revisa pendientes y fechas comprometidas.'
  return 'Conviene priorizar cierres antes de generar mas carga operativa.'
}

function toDayKey(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function calculateParticipationStreak(days: Set<string>, today: string) {
  let streak = 0
  let cursor = today
  while (days.has(cursor)) {
    streak += 1
    cursor = addCalendarDays(cursor, -1)
  }
  return streak
}


