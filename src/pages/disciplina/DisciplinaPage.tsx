import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Flame,
  Gauge,
  MessageSquare,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { useAcciones } from '@/features/operations/hooks'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import { accionComentariosService } from '@/services/accionComentarios.service'
import { calendarNotesService } from '@/services/calendarNotes.service'
import { calendarRemindersService } from '@/services/calendarReminders.service'
import { addCalendarDays, todayWallClockCDMX } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import {
  buildActionGamificationMetrics,
  getUserOwnedActions,
  getUserRelevantComments,
  type ActionGamificationMetrics,
  type ActionGamificationRule,
  type ActionGamificationTone,
} from '@/features/disciplina/utils/actionGamification'
import { DisciplinaOperativoSection } from './components/DisciplinaOperativoSection'

const RECENT_CALENDAR_ITEMS_LIMIT = 6
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
  const personalActions = useMemo(
    () => getUserOwnedActions(currentUser?.id, acciones, comentarios),
    [acciones, comentarios, currentUser?.id]
  )
  const personalComments = useMemo(
    () => getUserRelevantComments(currentUser?.id, comentarios, personalActions),
    [comentarios, currentUser?.id, personalActions]
  )
  const {
    data: recentReminders = [],
    isLoading: remindersLoading,
    isError: remindersError,
  } = useQuery({
    queryKey: ['disciplina', 'calendar-reminders', currentUser?.id ?? ''],
    queryFn: () => calendarRemindersService.listRecentByUser(currentUser!.id, RECENT_CALENDAR_ITEMS_LIMIT),
    enabled: Boolean(currentUser?.id),
    staleTime: 30_000,
  })
  const {
    data: recentNotes = [],
    isLoading: notesLoading,
    isError: notesError,
  } = useQuery({
    queryKey: ['disciplina', 'calendar-notes', currentUser?.id ?? ''],
    queryFn: () => calendarNotesService.listRecentByUser(currentUser!.id, RECENT_CALENDAR_ITEMS_LIMIT),
    enabled: Boolean(currentUser?.id),
    staleTime: 30_000,
  })
  const personalMetrics = useMemo(
    () => buildPersonalMetrics(currentUser?.id, personalActions, personalComments, today),
    [currentUser?.id, personalActions, personalComments, today]
  )
  const positiveRules = useMemo(
    () => personalMetrics.rules.filter((rule) => rule.pointsPerUnit > 0),
    [personalMetrics.rules]
  )
  const consequenceRules = useMemo(
    () => personalMetrics.rules.filter((rule) => rule.pointsPerUnit < 0),
    [personalMetrics.rules]
  )
  const blockedActions = useMemo(
    () => personalActions.filter((action) => action.estado === 'En_Pausa').length,
    [personalActions]
  )
  const todayOwnedActions = useMemo(() => {
    if (!currentUser?.id) return []
    const todayList = acciones.filter((action) => action.fecha === fecha)
    return getUserOwnedActions(currentUser.id, todayList, comentarios)
  }, [acciones, comentarios, currentUser?.id, fecha])
  const todayBlockedActions = useMemo(
    () => todayOwnedActions.filter((action) => action.estado === 'En_Pausa').length,
    [todayOwnedActions]
  )
  const loading = loadingActions || loadingComments
  const hasError = actionsError

  return (
    <div
      id="disciplina-page"
      className="disciplina-page mx-auto w-full max-w-7xl space-y-4 overflow-x-hidden px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6"
    >
      <header
        id="disciplina-header"
        className="disciplina-header overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Disciplina</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Tu dia operativo
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
              {heroAlertCopy(blockedActions, personalMetrics.overdue)}
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-2 lg:min-w-[420px]">
            <HeroMetric label="Puntaje" value={`${formatSignedPoints(personalMetrics.totalPoints)} pts`} tone={personalMetrics.levelTone} />
            <HeroMetric label="Racha" value={`${personalMetrics.participationStreak} dia${personalMetrics.participationStreak === 1 ? '' : 's'}`} />
            <HeroMetric label="Retrasos" value={String(personalMetrics.overdue)} tone={personalMetrics.overdue > 0 ? 'negative' : 'neutral'} />
          </div>
        </div>
      </header>

      {hasError ? (
        <SectionCard>
          <SectionCardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">No se pudo cargar tu información operativa.</p>
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
        <div className="grid gap-4 sm:gap-6">
          <SkeletonBlock className="h-64 sm:h-72" />
          <SkeletonBlock className="h-56 sm:h-72" />
        </div>
      ) : currentUser ? (
        <div className="grid gap-4 sm:gap-6">
          <DisciplinaOperativoSection
            fecha={fecha}
            usuarioId={currentUser.id}
            accionesCount={todayOwnedActions.length}
            accionesBloqueadas={todayBlockedActions}
            reminders={recentReminders}
            notes={recentNotes}
            remindersLoading={remindersLoading}
            notesLoading={notesLoading}
            remindersError={remindersError}
            notesError={notesError}
          />

          <section id="disciplina-indicadores" aria-labelledby="disciplina-acciones-heading">
            <SectionCard className="h-full">
              <SectionCardHeader
                className="px-3 py-3 sm:px-4 sm:py-4 md:px-6"
                titleId="disciplina-acciones-heading"
                eyebrow="Disciplina"
                title="Tu puntaje explicado"
                subtitle="Puntaje actual, balance y detalle por cada actividad."
                icon={Target}
              />
              <SectionCardBody className="space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
                <DisciplinaScoreExplained
                  metrics={personalMetrics}
                  positiveRules={positiveRules}
                  consequenceRules={consequenceRules}
                />
              </SectionCardBody>
            </SectionCard>
          </section>
        </div>
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

type PersonalMetrics = ActionGamificationMetrics

const buildPersonalMetrics = buildActionGamificationMetrics

function HeroMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: ActionGamificationTone
}) {
  return (
    <div className={cn('rounded-lg border px-2.5 py-2.5 text-center', heroMetricTone(tone))}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[10px]">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground sm:text-lg">{value}</p>
    </div>
  )
}

function DisciplinaScoreExplained({
  metrics,
  positiveRules,
  consequenceRules,
}: {
  metrics: PersonalMetrics
  positiveRules: ActionGamificationRule[]
  consequenceRules: ActionGamificationRule[]
}) {
  const activePositive = positiveRules.filter((rule) => rule.count > 0)
  const activeNegative = consequenceRules.filter((rule) => rule.count > 0)
  const inactivePositive = positiveRules.filter((rule) => rule.count === 0)
  const inactiveNegative = consequenceRules.filter((rule) => rule.count === 0)

  return (
    <div className="space-y-3">
      <ScoreHeroPanel metrics={metrics} />
      <ScoreImpactPanel metrics={metrics} />
      <ScoreActivitySection
        activePositive={activePositive}
        activeNegative={activeNegative}
        inactivePositive={inactivePositive}
        inactiveNegative={inactiveNegative}
      />
      <section aria-labelledby="disciplina-score-next" className="pt-1">
        <ScoreSectionLabel step="3" title="Qué conviene mejorar" subtitle="Siguiente acción recomendada" />
        <NextActionPanel metrics={metrics} />
      </section>
    </div>
  )
}

function ScoreSectionLabel({
  step,
  title,
  subtitle,
}: {
  step: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-2 flex items-start gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-[10px] font-bold text-muted-foreground">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function ScoreHeroPanel({ metrics }: { metrics: PersonalMetrics }) {
  const netoTone = scoreToneToMetricTone(metrics.levelTone)
  const penaltyAbs = Math.abs(metrics.penaltyPoints)

  return (
    <section aria-labelledby="disciplina-score-hero">
      <ScoreSectionLabel
        step="1"
        title="Puntaje actual"
        subtitle="Resultado neto del periodo evaluado"
      />
      <div className={cn('overflow-hidden rounded-xl border p-3 sm:p-4', toneSurface(netoTone))}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total acumulado
            </p>
            <p
              className={cn(
                'mt-0.5 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl',
                metrics.totalPoints >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-destructive'
              )}
            >
              {formatSignedPoints(metrics.totalPoints)}
              <span className="ml-1 text-lg font-semibold text-muted-foreground sm:text-xl">pts</span>
            </p>
            <p className="mt-1.5 inline-flex rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground">
              Nivel: {metrics.level}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5 sm:px-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Formula del puntaje</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold tabular-nums sm:text-base">
              <span className="text-emerald-700 dark:text-emerald-300">+{metrics.earnedPoints}</span>
              <span className="text-muted-foreground">−</span>
              <span className="text-destructive">{penaltyAbs}</span>
              <span className="text-muted-foreground">=</span>
              <span
                className={cn(
                  metrics.totalPoints >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-destructive'
                )}
              >
                {formatSignedPoints(metrics.totalPoints)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MiniScoreStat label="Ganados" value={`+${metrics.earnedPoints}`} tone="good" />
              <MiniScoreStat label="Perdidos" value={`-${penaltyAbs}`} tone={penaltyAbs > 0 ? 'risk' : 'neutral'} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniScoreStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: MetricTone
}) {
  return (
    <div className={cn('rounded-lg border px-2.5 py-2', toneSurface(tone))}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-base font-bold tabular-nums',
          tone === 'good' && 'text-emerald-700 dark:text-emerald-300',
          tone === 'risk' && 'text-destructive',
          tone === 'neutral' && 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ScoreImpactPanel({ metrics }: { metrics: PersonalMetrics }) {
  const overdueRule = metrics.rules.find((rule) => rule.key === 'overdue')
  if (!overdueRule || overdueRule.count === 0) return null

  return (
    <section aria-labelledby="disciplina-score-impact">
      <div className="grid gap-2 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-3 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p id="disciplina-score-impact" className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <span className="font-semibold text-foreground">Impacto por retraso:</span> acciones directas en
            Retraso dentro de Kanban.
          </p>
        </div>
        <p className="text-sm font-bold tabular-nums text-destructive sm:text-right">
          {overdueRule.count} x {formatSignedPoints(overdueRule.pointsPerUnit)} = {formatSignedPoints(overdueRule.points)} pts
        </p>
      </div>
    </section>
  )
}

function ScoreActivitySection({
  activePositive,
  activeNegative,
  inactivePositive,
  inactiveNegative,
}: {
  activePositive: ActionGamificationRule[]
  activeNegative: ActionGamificationRule[]
  inactivePositive: ActionGamificationRule[]
  inactiveNegative: ActionGamificationRule[]
}) {
  const activeCount = activePositive.length + activeNegative.length
  const activityRows = useMemo(
    () =>
      [
        ...activePositive.map((rule) => ({ rule, variant: 'positive' as const })),
        ...activeNegative.map((rule) => ({ rule, variant: 'negative' as const })),
      ].sort((a, b) => Math.abs(b.rule.points) - Math.abs(a.rule.points)),
    [activeNegative, activePositive]
  )

  return (
    <section aria-labelledby="disciplina-score-activity">
      <ScoreSectionLabel
        step="2"
        title="Detalle por actividad"
        subtitle={
          activeCount > 0
            ? `${activeCount} conducta${activeCount === 1 ? '' : 's'} que movieron tu puntaje`
            : 'Aún no hay actividades registradas en el periodo'
        }
      />

      {activeCount > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
          <div className="hidden border-b border-border/60 bg-muted/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_4rem] sm:gap-3 sm:px-4">
            <span>Actividad / realizado</span>
            <span className="text-center">Veces</span>
            <span className="text-center">Pts c/u</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-border/50">
            {activityRows.map(({ rule, variant }) => (
              <ActivityScoreRow key={rule.key} rule={rule} variant={variant} />
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 bg-muted/10 px-3 py-3 sm:grid-cols-3 sm:px-4">
            <div className="text-center sm:text-left">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ganados</p>
              <p className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                +{activityRows.filter((row) => row.variant === 'positive').reduce((sum, row) => sum + row.rule.points, 0)}
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Perdidos</p>
              <p className="text-sm font-bold tabular-nums text-destructive">
                {formatSignedPoints(
                  activityRows.filter((row) => row.variant === 'negative').reduce((sum, row) => sum + row.rule.points, 0)
                )}
              </p>
            </div>
            <div className="col-span-2 text-center sm:col-span-1 sm:text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subtotal actividades</p>
              <p className="text-sm font-bold tabular-nums text-foreground">
                {formatSignedPoints(activityRows.reduce((sum, row) => sum + row.rule.points, 0))}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">Sin actividades con puntos todavía</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cierra acciones, comenta o crea tareas para ver el desglose aquí.
          </p>
        </div>
      )}

      {inactivePositive.length > 0 || inactiveNegative.length > 0 ? (
        <div className="mt-3">
          <InactiveRulesPanel positive={inactivePositive} negative={inactiveNegative} />
        </div>
      ) : null}
    </section>
  )
}

function ActivityScoreRow({
  rule,
  variant,
}: {
  rule: ActionGamificationRule
  variant: 'positive' | 'negative'
}) {
  const Icon = ruleIcon(rule.key)
  const pointsTone =
    variant === 'negative' || rule.points < 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-300'

  return (
    <li className="px-3 py-2.5 sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_4rem] sm:items-center sm:gap-3 sm:px-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
            variant === 'positive'
              ? 'border-emerald-500/20 bg-emerald-500/10'
              : 'border-destructive/20 bg-destructive/10'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4',
              variant === 'positive' ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'
            )}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{rule.label}</p>
          <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-foreground/80">
            Realizado: {activityDoneText(rule)}
          </p>
          <p className="line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">{rule.helper}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:hidden">
            <span>
              {rule.count} × {formatSignedPoints(rule.pointsPerUnit)} pts
            </span>
            <span className={cn('font-bold', pointsTone)}>{formatSignedPoints(rule.points)} pts</span>
          </div>
        </div>
      </div>
      <p className="mt-2 hidden text-center text-sm font-semibold tabular-nums text-foreground sm:mt-0 sm:block">{rule.count}</p>
      <p className="hidden text-center text-sm font-medium tabular-nums text-muted-foreground sm:block">
        {formatSignedPoints(rule.pointsPerUnit)}
      </p>
      <p className={cn('hidden text-right text-base font-bold tabular-nums sm:block sm:text-lg', pointsTone)}>
        {formatSignedPoints(rule.points)}
      </p>
    </li>
  )
}

function activityDoneText(rule: ActionGamificationRule) {
  if (rule.count === 0) return 'sin registro en el periodo'
  if (rule.key === 'onTimeClosed') return `${rule.count} cierre${rule.count === 1 ? '' : 's'} en tiempo`
  if (rule.key === 'overdue') return `${rule.count} accion${rule.count === 1 ? '' : 'es'} directa${rule.count === 1 ? '' : 's'} en retraso`
  if (rule.key === 'commentsMade') return `${rule.count} comentario${rule.count === 1 ? '' : 's'} de seguimiento`
  if (rule.key === 'created') return `${rule.count} accion${rule.count === 1 ? '' : 'es'} creada${rule.count === 1 ? '' : 's'}`
  if (rule.key === 'assigned') return `${rule.count} accion${rule.count === 1 ? '' : 'es'} asignada${rule.count === 1 ? '' : 's'}`
  if (rule.key === 'participationStreak') return `${rule.count} dia${rule.count === 1 ? '' : 's'} de racha`
  return `${rule.count} actividad${rule.count === 1 ? '' : 'es'}`
}

function InactiveRulesPanel({
  positive,
  negative,
}: {
  positive: ActionGamificationRule[]
  negative: ActionGamificationRule[]
}) {
  return (
    <details className="group/inactive overflow-hidden rounded-xl border border-border/60 bg-background">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/20 sm:px-4 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-xs font-semibold text-foreground sm:text-sm">Cómo sumar o perder puntos</p>
          <p className="text-[11px] text-muted-foreground">Conductas que aún no se registran en tu periodo</p>
        </div>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open/inactive:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-border/50 px-3 py-3 sm:px-4">
        {positive.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Oportunidades a tu favor
            </p>
            <ul className="space-y-1.5">
              {positive.map((rule) => (
                <li
                  key={rule.key}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/15 px-2.5 py-2 text-xs"
                >
                  <span className="min-w-0 text-foreground">{rule.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatSignedPoints(rule.pointsPerUnit)} pts c/u
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {negative.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              Riesgos a evitar
            </p>
            <ul className="space-y-1.5">
              {negative.map((rule) => (
                <li
                  key={rule.key}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/15 px-2.5 py-2 text-xs"
                >
                  <span className="min-w-0 text-foreground">{rule.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-destructive">
                    {formatSignedPoints(rule.pointsPerUnit)} pts c/u
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  )
}

function NextActionPanel({ metrics }: { metrics: PersonalMetrics }) {
  const next = nextAction(metrics)
  const Icon = next.icon
  const accentBorder =
    next.tone === 'risk'
      ? 'border-l-destructive'
      : next.tone === 'warn'
        ? 'border-l-amber-500'
        : next.tone === 'good'
          ? 'border-l-emerald-500'
          : 'border-l-border'

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border/60 border-l-4 bg-background shadow-sm', accentBorder)}>
      <div className={cn('px-3 py-3 sm:px-4 sm:py-3.5', toneSurface(next.tone))}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background shadow-sm">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold leading-snug text-foreground sm:text-base">{next.title}</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{next.text}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('h-64 animate-pulse rounded-xl border border-border bg-muted/20', className)} />
}

function toneSurface(tone: MetricTone) {
  if (tone === 'good') return 'border-emerald-500/30 bg-emerald-500/5'
  if (tone === 'warn') return 'border-amber-500/30 bg-amber-500/5'
  if (tone === 'risk') return 'border-destructive/30 bg-destructive/5'
  return 'border-border/70 bg-muted/10'
}

function heroMetricTone(tone: ActionGamificationTone) {
  if (tone === 'positive') return 'border-emerald-500/30 bg-emerald-500/5'
  if (tone === 'warning') return 'border-amber-500/30 bg-amber-500/5'
  if (tone === 'negative') return 'border-destructive/30 bg-destructive/5'
  return 'border-border/70 bg-muted/10'
}

function heroAlertCopy(blocked: number, overdue: number) {
  if (blocked > 0) return `${blocked} accion bloqueada${blocked === 1 ? '' : 's'} requiere${blocked === 1 ? '' : 'n'} atencion.`
  if (overdue > 0) return `${overdue} accion${overdue === 1 ? '' : 'es'} en retraso requiere${overdue === 1 ? '' : 'n'} atencion.`
  return 'Sin bloqueos visibles. Entra a tus acciones y protege el cierre del dia.'
}

function nextAction(metrics: PersonalMetrics): {
  title: string
  text: string
  tone: MetricTone
  icon: typeof CheckCircle2
} {
  if (metrics.overdue > 0) {
    return {
      title: 'Recupera retrasos primero',
      text: 'Cada accion atrasada resta puntos y ensucia la lectura del tablero. Limpia esas acciones antes de abrir mas carga.',
      tone: 'risk',
      icon: AlertTriangle,
    }
  }
  if (metrics.onTimeClosed === 0 && metrics.assigned > 0) {
    return {
      title: 'Convierte una asignada en cierre',
      text: 'Tienes responsabilidad visible; el salto mas claro viene de cerrar una accion en tiempo con evidencia.',
      tone: 'warn',
      icon: CheckCircle2,
    }
  }
  if (metrics.commentsMade === 0 && metrics.userActions > 0) {
    return {
      title: 'Deja rastro de seguimiento',
      text: 'Un comentario oportuno mantiene contexto, mueve participacion y evita que el avance dependa de memoria.',
      tone: 'warn',
      icon: MessageSquare,
    }
  }
  if (metrics.participationStreak === 0) {
    return {
      title: 'Activa la racha de hoy',
      text: 'Crea, comenta o cierra una accion para que el dia cuente dentro de tu disciplina operativa.',
      tone: 'neutral',
      icon: Flame,
    }
  }
  return {
    title: 'Protege la cadencia',
    text: 'El balance esta estable. Mantener la racha y cerrar en tiempo vale mas que generar actividad sin cierre.',
    tone: 'good',
    icon: ShieldCheck,
  }
}

function scoreToneToMetricTone(tone: ActionGamificationTone): MetricTone {
  if (tone === 'positive') return 'good'
  if (tone === 'warning') return 'warn'
  if (tone === 'negative') return 'risk'
  return 'neutral'
}

function formatSignedPoints(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

function ruleIcon(key: ActionGamificationRule['key']) {
  if (key === 'onTimeClosed') return CheckCircle2
  if (key === 'overdue') return AlertTriangle
  if (key === 'commentsMade') return MessageSquare
  if (key === 'created') return PenLine
  if (key === 'assigned') return Users
  if (key === 'participationStreak') return Flame
  return Gauge
}
