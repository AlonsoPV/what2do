import type { AccionDiaria, Sprint, Usuario, ActionStatus } from '@/types'

export type ExecutionStatus = 'Bajo desempeno' | 'En desarrollo' | 'High Performer' | 'Execution Champion'
export type TrendDirection = 'up' | 'down' | 'flat'

export interface ScoreBreakdownItem {
  key: 'quality' | 'timeliness' | 'accountability' | 'impact' | 'consistency'
  label: string
  value: number
  max: number
  description: string
}

export interface ExecutionScoreResult {
  userId: string
  score: number
  status: ExecutionStatus
  trend: TrendDirection
  weeklyDelta: number
  completedActions: number
  verifiedActions: number
  overdueActions: number
  blockedActions: number
  sprintActions: number
  gapActions: number
  evidenceRate: number
  onTimeRate: number
  breakdown: ScoreBreakdownItem[]
}

export interface StreakResult {
  type: 'daily_execution' | 'no_overdue' | 'high_score' | 'sprint_delivery'
  label: string
  currentValue: number
  bestValue: number
  startedAt: string | null
  description: string
}

export interface BadgeResult {
  name: string
  description: string
  unlockRule: string
  icon: string
  unlockedAt: string | null
  unlocked: boolean
}

export interface AchievementResult {
  name: string
  description: string
  category: 'score' | 'sprint' | 'gap' | 'quality' | 'consistency'
  icon: string
  unlockedAt: string | null
  unlocked: boolean
}

export interface UserLevelResult {
  currentLevel: number
  title: string
  xp: number
  progressToNext: number
  nextTitle: string | null
  requirements: string[]
}

export interface TeamHealthResult {
  teamId: string
  teamName: string
  score: number
  trend: TrendDirection
  ranking: number
  members: number
  overdueActions: number
  openGaps: number
  sprintCompletion: number
}

export interface UserExecutionProfile {
  user: Pick<Usuario, 'id' | 'nombre' | 'area' | 'rol'>
  score: ExecutionScoreResult
  streaks: StreakResult[]
  badges: BadgeResult[]
  achievements: AchievementResult[]
  level: UserLevelResult
}

const DONE_STATES = new Set<ActionStatus>(['Completada'])
const MS_PER_DAY = 24 * 60 * 60 * 1000

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number) {
  return Math.round(value)
}

function safeRate(part: number, total: number) {
  return total > 0 ? part / total : 0
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function parseActionDate(action: AccionDiaria) {
  const time = action.hora_limite || '23:59'
  return new Date(`${action.fecha}T${time}`)
}

function isDone(action: AccionDiaria) {
  return DONE_STATES.has(action.estado)
}

function isVerified(action: AccionDiaria) {
  return action.estado === 'Completada'
}

function isOverdue(action: AccionDiaria, now = new Date()) {
  return !isDone(action) && parseActionDate(action).getTime() < now.getTime()
}

function isCompletedOnTime(action: AccionDiaria) {
  if (!isDone(action)) return false
  const completedAt = action.verified_at || action.completed_at || action.updated_at
  if (!completedAt) return true
  return new Date(completedAt).getTime() <= parseActionDate(action).getTime()
}

function storyPoints(action: AccionDiaria) {
  const points = Number(action.story_points)
  return Number.isFinite(points) && points > 0 ? points : 1
}

function getStatus(score: number): ExecutionStatus {
  if (score >= 92) return 'Execution Champion'
  if (score >= 80) return 'High Performer'
  if (score >= 60) return 'En desarrollo'
  return 'Bajo desempeno'
}

function compareRecentScore(actions: AccionDiaria[], userId: string, currentScore: number) {
  const now = new Date()
  const previousStart = new Date(now.getTime() - 14 * MS_PER_DAY)
  const previousEnd = new Date(now.getTime() - 7 * MS_PER_DAY)
  const previousActions = actions.filter((action) => {
    if (action.responsable !== userId) return false
    const date = parseActionDate(action)
    return date >= previousStart && date < previousEnd
  })
  if (previousActions.length === 0) return { weeklyDelta: 0, trend: 'flat' as TrendDirection }
  const previous = calculateExecutionScore(userId, previousActions, { includeTrend: false })
  const weeklyDelta = round(currentScore - previous.score)
  return {
    weeklyDelta,
    trend: weeklyDelta > 2 ? 'up' : weeklyDelta < -2 ? 'down' : ('flat' as TrendDirection),
  }
}

export function calculateExecutionScore(
  userId: string,
  actions: AccionDiaria[],
  options: { now?: Date; includeTrend?: boolean } = {}
): ExecutionScoreResult {
  const now = options.now ?? new Date()
  const userActions = actions.filter((action) => action.responsable === userId)
  const total = userActions.length
  const completed = userActions.filter(isDone)
  const verified = userActions.filter(isVerified)
  const overdue = userActions.filter((action) => isOverdue(action, now))
  const blocked = userActions.filter((action) => action.estado === 'En_Pausa')
  const repeated = userActions.filter((action) => action.repeticion)
  const withEvidence = completed.filter((action) => action.evidencia_cargada)
  const onTime = completed.filter(isCompletedOnTime)
  const sprintActions = userActions.filter((action) => action.tipo_accion === 'sprint' && action.sprint_id)
  const gapActions = userActions.filter((action) => action.gap_id)
  const completedPoints = completed.reduce((sum, action) => sum + storyPoints(action), 0)
  const totalPoints = userActions.reduce((sum, action) => sum + storyPoints(action), 0)

  const completionRate = safeRate(completed.length, total)
  const verifiedRate = safeRate(verified.length, Math.max(completed.length, 1))
  const evidenceRate = safeRate(withEvidence.length, Math.max(completed.length, 1))
  const onTimeRate = safeRate(onTime.length, Math.max(completed.length, 1))
  const overdueRate = safeRate(overdue.length, Math.max(total, 1))
  const blockedRate = safeRate(blocked.length, Math.max(total, 1))
  const repeatedRate = safeRate(repeated.length, Math.max(total, 1))
  const impactRate = safeRate(completedPoints, Math.max(totalPoints, 1))
  const activeDays = new Set(userActions.map((action) => action.fecha)).size
  const cleanRecentDays = new Set(
    userActions
      .filter((action) => !isOverdue(action, now))
      .map((action) => action.fecha)
  ).size

  const quality = clamp((completionRate * 0.45 + verifiedRate * 0.35 + evidenceRate * 0.2) * 30)
  const timeliness = clamp(onTimeRate * 20 - overdueRate * 12)
  const accountability = clamp(15 - blockedRate * 8 - repeatedRate * 7 + evidenceRate * 5, 0, 15)
  const impact = clamp(impactRate * 12 + Math.min(gapActions.length, 6) + Math.min(sprintActions.length, 4), 0, 20)
  const consistency = clamp(Math.min(activeDays, 12) * 0.75 + Math.min(cleanRecentDays, 10) * 0.6, 0, 15)

  const score = round(clamp(quality + timeliness + accountability + impact + consistency))
  const trend = options.includeTrend === false ? { weeklyDelta: 0, trend: 'flat' as TrendDirection } : compareRecentScore(actions, userId, score)

  return {
    userId,
    score,
    status: getStatus(score),
    trend: trend.trend,
    weeklyDelta: trend.weeklyDelta,
    completedActions: completed.length,
    verifiedActions: verified.length,
    overdueActions: overdue.length,
    blockedActions: blocked.length,
    sprintActions: sprintActions.length,
    gapActions: gapActions.length,
    evidenceRate: round(evidenceRate * 100),
    onTimeRate: round(onTimeRate * 100),
    breakdown: [
      {
        key: 'quality',
        label: 'Calidad de cierre',
        value: round(quality),
        max: 30,
        description: 'Cierre real, verificacion y evidencia.',
      },
      {
        key: 'timeliness',
        label: 'Cumplimiento de fechas',
        value: round(timeliness),
        max: 20,
        description: 'Entrega a tiempo con penalizacion por vencidas.',
      },
      {
        key: 'accountability',
        label: 'Accountability',
        value: round(accountability),
        max: 15,
        description: 'Bloqueos, reincidencias y claridad de evidencia.',
      },
      {
        key: 'impact',
        label: 'Impacto operativo',
        value: round(impact),
        max: 20,
        description: 'Puntos cerrados, gaps y contribucion en sprints.',
      },
      {
        key: 'consistency',
        label: 'Consistencia',
        value: round(consistency),
        max: 15,
        description: 'Cadencia reciente sin depender del volumen.',
      },
    ],
  }
}

export function calculateStreaks(userId: string, actions: AccionDiaria[], now = new Date()): StreakResult[] {
  const userActions = actions.filter((action) => action.responsable === userId)
  const actionDays = new Map<string, AccionDiaria[]>()
  userActions.forEach((action) => {
    actionDays.set(action.fecha, [...(actionDays.get(action.fecha) ?? []), action])
  })

  const countBackwards = (condition: (dayActions: AccionDiaria[]) => boolean) => {
    let current = 0
    let start: string | null = null
    for (let offset = 0; offset < 90; offset += 1) {
      const key = dateKey(new Date(now.getTime() - offset * MS_PER_DAY))
      const dayActions = actionDays.get(key) ?? []
      if (dayActions.length > 0 && condition(dayActions)) {
        current += 1
        start = key
      } else if (offset > 0) {
        break
      }
    }
    return { current, start }
  }

  const bestWindow = (condition: (dayActions: AccionDiaria[]) => boolean) => {
    const sortedDays = [...actionDays.keys()].sort()
    let best = 0
    let running = 0
    let previous: string | null = null
    sortedDays.forEach((day) => {
      const expectedPrevious = previous ? dateKey(new Date(new Date(previous).getTime() + MS_PER_DAY)) : null
      running = previous && expectedPrevious === day && condition(actionDays.get(day) ?? []) ? running + 1 : condition(actionDays.get(day) ?? []) ? 1 : 0
      best = Math.max(best, running)
      previous = day
    })
    return best
  }

  const dailyExecution = countBackwards((dayActions) => dayActions.some(isDone))
  const noOverdue = countBackwards((dayActions) => dayActions.every((action) => !isOverdue(action, now)))
  const highScore = calculateExecutionScore(userId, userActions, { now, includeTrend: false }).score >= 80 ? 1 : 0
  const sprintDelivered = new Set(userActions.filter((action) => action.tipo_accion === 'sprint' && isDone(action)).map((action) => action.sprint_id).filter(Boolean)).size

  return [
    {
      type: 'daily_execution',
      label: 'Cadencia de cierre',
      currentValue: dailyExecution.current,
      bestValue: Math.max(bestWindow((dayActions) => dayActions.some(isDone)), dailyExecution.current),
      startedAt: dailyExecution.start,
      description: 'Dias consecutivos con al menos una accion cerrada.',
    },
    {
      type: 'no_overdue',
      label: 'Sin vencidas',
      currentValue: noOverdue.current,
      bestValue: Math.max(bestWindow((dayActions) => dayActions.every((action) => !isOverdue(action, now))), noOverdue.current),
      startedAt: noOverdue.start,
      description: 'Dias consecutivos sin acciones vencidas asignadas.',
    },
    {
      type: 'high_score',
      label: 'Score superior a 80',
      currentValue: highScore,
      bestValue: highScore,
      startedAt: highScore ? dateKey(now) : null,
      description: 'Semana operando en zona High Performer.',
    },
    {
      type: 'sprint_delivery',
      label: 'Sprints contribuidos',
      currentValue: sprintDelivered,
      bestValue: sprintDelivered,
      startedAt: sprintDelivered ? userActions.find((action) => action.tipo_accion === 'sprint')?.fecha ?? null : null,
      description: 'Sprints con acciones cerradas por el usuario.',
    },
  ]
}

export function evaluateBadges(profile: Pick<UserExecutionProfile, 'score' | 'streaks'>): BadgeResult[] {
  const { score, streaks } = profile
  const dailyStreak = streaks.find((streak) => streak.type === 'daily_execution')?.currentValue ?? 0
  const noOverdueStreak = streaks.find((streak) => streak.type === 'no_overdue')?.currentValue ?? 0
  const sprintStreak = streaks.find((streak) => streak.type === 'sprint_delivery')?.currentValue ?? 0
  const today = dateKey(new Date())

  const definitions = [
    {
      name: 'Execution Driver',
      description: 'Sostiene ejecucion confiable y verificable.',
      unlockRule: 'Score mayor a 85.',
      icon: 'target',
      unlocked: score.score >= 85,
    },
    {
      name: 'Gap Closer',
      description: 'Convierte brechas en acciones cerradas.',
      unlockRule: 'Cerrar acciones vinculadas a 5 gaps.',
      icon: 'gap',
      unlocked: score.gapActions >= 5,
    },
    {
      name: 'Data Champion',
      description: 'Cierra con evidencia y trazabilidad.',
      unlockRule: 'Evidencia en al menos 90% de cierres.',
      icon: 'data',
      unlocked: score.evidenceRate >= 90 && score.completedActions >= 5,
    },
    {
      name: 'Sprint Leader',
      description: 'Aporta al avance de esfuerzos CHANGE.',
      unlockRule: 'Contribuir en 3 sprints.',
      icon: 'sprint',
      unlocked: sprintStreak >= 3,
    },
    {
      name: 'Lean Operator',
      description: 'Mantiene flujo operativo sin vencidas.',
      unlockRule: '10 dias consecutivos sin vencidas.',
      icon: 'flow',
      unlocked: noOverdueStreak >= 10,
    },
    {
      name: 'Process Optimizer',
      description: 'Eleva calidad sin premiar volumen vacio.',
      unlockRule: 'Score mayor a 80 y 10 cierres verificados.',
      icon: 'process',
      unlocked: score.score >= 80 && score.verifiedActions >= 10,
    },
    {
      name: 'High Performer',
      description: 'Ejecucion consistente de alto estandar.',
      unlockRule: 'Score mayor a 80 con cadencia activa.',
      icon: 'performance',
      unlocked: score.score >= 80 && dailyStreak >= 3,
    },
    {
      name: 'Transformation Leader',
      description: 'Impacta gaps, sprints y accountability.',
      unlockRule: 'Score mayor a 90, gaps y sprints activos.',
      icon: 'transformation',
      unlocked: score.score >= 90 && score.gapActions >= 3 && score.sprintActions >= 3,
    },
  ]

  return definitions.map((badge) => ({
    ...badge,
    unlockedAt: badge.unlocked ? today : null,
  }))
}

export function evaluateAchievements(profile: Pick<UserExecutionProfile, 'score' | 'streaks' | 'badges'>): AchievementResult[] {
  const { score, streaks, badges } = profile
  const noOverdueStreak = streaks.find((streak) => streak.type === 'no_overdue')?.currentValue ?? 0
  const sprintContributions = streaks.find((streak) => streak.type === 'sprint_delivery')?.currentValue ?? 0
  const unlockedBadges = badges.filter((badge) => badge.unlocked).length
  const today = dateKey(new Date())

  const definitions = [
    {
      name: 'Primer sprint completado',
      description: 'Primera contribucion cerrada dentro de un sprint.',
      category: 'sprint' as const,
      icon: 'sprint',
      unlocked: sprintContributions >= 1,
    },
    {
      name: 'Primer gap critico resuelto',
      description: 'Primer cierre con trazabilidad hacia una brecha.',
      category: 'gap' as const,
      icon: 'gap',
      unlocked: score.gapActions >= 1,
    },
    {
      name: '30 dias sin acciones vencidas',
      description: 'Consistencia operativa sin atrasos visibles.',
      category: 'consistency' as const,
      icon: 'calendar',
      unlocked: noOverdueStreak >= 30,
    },
    {
      name: '100 acciones verificadas',
      description: 'Volumen relevante solo cuando existe verificacion.',
      category: 'quality' as const,
      icon: 'check',
      unlocked: score.verifiedActions >= 100,
    },
    {
      name: 'Primer sprint estrategico liderado',
      description: 'Contribucion CHANGE con impacto verificable.',
      category: 'sprint' as const,
      icon: 'leader',
      unlocked: score.sprintActions >= 5 && score.score >= 80,
    },
    {
      name: 'Cultura de ejecucion',
      description: 'Tres reconocimientos estrategicos desbloqueados.',
      category: 'score' as const,
      icon: 'culture',
      unlocked: unlockedBadges >= 3,
    },
  ]

  return definitions.map((achievement) => ({
    ...achievement,
    unlockedAt: achievement.unlocked ? today : null,
  }))
}

export function calculateUserLevel(profile: Pick<UserExecutionProfile, 'score' | 'streaks' | 'badges' | 'achievements'>): UserLevelResult {
  const scoreXp = profile.score.score * 6
  const badgeXp = profile.badges.filter((badge) => badge.unlocked).length * 90
  const achievementXp = profile.achievements.filter((achievement) => achievement.unlocked).length * 70
  const streakXp = profile.streaks.reduce((sum, streak) => sum + Math.min(streak.bestValue, 30) * 6, 0)
  const xp = round(scoreXp + badgeXp + achievementXp + streakXp)
  const levels = [
    { level: 1, title: 'Operador', min: 0 },
    { level: 2, title: 'Ejecutor', min: 650 },
    { level: 3, title: 'Champion', min: 1200 },
    { level: 4, title: 'Strategist', min: 1900 },
    { level: 5, title: 'Transformation Leader', min: 2800 },
  ]
  const current = [...levels].reverse().find((level) => xp >= level.min) ?? levels[0]
  const next = levels.find((level) => level.level === current.level + 1) ?? null
  const progressToNext = next ? round(((xp - current.min) / (next.min - current.min)) * 100) : 100

  return {
    currentLevel: current.level,
    title: current.title,
    xp,
    progressToNext: clamp(progressToNext),
    nextTitle: next?.title ?? null,
    requirements: next
      ? [
          `Mantener score sobre ${current.level >= 3 ? 85 : 75}.`,
          'Cerrar acciones con evidencia verificable.',
          'Contribuir a gaps o sprints de impacto.',
        ]
      : ['Mantener consistencia y desarrollar a otros equipos.'],
  }
}

export function calculateTeamHealthScore(
  users: Pick<Usuario, 'id' | 'nombre' | 'area' | 'rol'>[],
  actions: AccionDiaria[],
  profiles: UserExecutionProfile[],
  sprints: Sprint[] = []
): TeamHealthResult[] {
  const profilesByUser = new Map(profiles.map((profile) => [profile.user.id, profile]))
  const teams = new Map<string, Pick<Usuario, 'id' | 'nombre' | 'area' | 'rol'>[]>()
  users.forEach((user) => {
    const team = user.area || 'Sin area'
    teams.set(team, [...(teams.get(team) ?? []), user])
  })

  const results = [...teams.entries()].map(([teamName, members]) => {
    const memberIds = new Set(members.map((member) => member.id))
    const teamActions = actions.filter((action) => memberIds.has(action.responsable))
    const avgScore = safeRate(
      members.reduce((sum, member) => sum + (profilesByUser.get(member.id)?.score.score ?? 0), 0),
      Math.max(members.length, 1)
    )
    const overdueActions = teamActions.filter((action) => isOverdue(action)).length
    const openGaps = new Set(teamActions.filter((action) => action.gap_id && !isDone(action)).map((action) => action.gap_id)).size
    const sprintActions = teamActions.filter((action) => action.sprint_id)
    const sprintCompletion = round(safeRate(sprintActions.filter(isDone).length, sprintActions.length) * 100)
    const activeSprintBonus = sprints.some((sprint) => sprint.estado === 'activo' && sprintActions.some((action) => action.sprint_id === sprint.id)) ? 4 : 0
    const score = round(clamp(avgScore - overdueActions * 2 - openGaps * 1.5 + sprintCompletion * 0.08 + activeSprintBonus))

    return {
      teamId: teamName,
      teamName,
      score,
      trend: score >= 80 ? ('up' as TrendDirection) : score < 60 ? ('down' as TrendDirection) : ('flat' as TrendDirection),
      ranking: 0,
      members: members.length,
      overdueActions,
      openGaps,
      sprintCompletion,
    }
  })

  return results
    .sort((a, b) => b.score - a.score)
    .map((team, index) => ({ ...team, ranking: index + 1 }))
}

export function buildUserExecutionProfiles(
  users: Pick<Usuario, 'id' | 'nombre' | 'area' | 'rol'>[],
  actions: AccionDiaria[]
): UserExecutionProfile[] {
  return users.map((user) => {
    const score = calculateExecutionScore(user.id, actions)
    const streaks = calculateStreaks(user.id, actions)
    const badges = evaluateBadges({ score, streaks })
    const achievements = evaluateAchievements({ score, streaks, badges })
    const level = calculateUserLevel({ score, streaks, badges, achievements })
    return { user, score, streaks, badges, achievements, level }
  })
}
