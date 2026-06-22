import { addCalendarDays } from '@/lib/dateUtils'
import { isEnRetraso } from '@/features/operations/utils/accionUtils'
import type { AccionDiaria } from '@/types'
import type { AccionComentario } from '@/types/accionComentario'

const DONE_STATES = new Set(['Hecho', 'Verificado'])

export const ACTION_GAMIFICATION_POINTS = {
  onTimeClosed: 10,
  overdue: -8,
  commentsMade: 2,
  created: 3,
  assigned: 1,
  participationStreak: 5,
} as const

export type ActionGamificationTone = 'positive' | 'neutral' | 'warning' | 'negative'

export interface ActionGamificationRule {
  key:
    | 'onTimeClosed'
    | 'overdue'
    | 'commentsMade'
    | 'created'
    | 'assigned'
    | 'participationStreak'
  label: string
  count: number
  pointsPerUnit: number
  points: number
  helper: string
  tone: ActionGamificationTone
}

export interface ActionGamificationMetrics {
  assigned: number
  closedAssigned: number
  userActions: number
  closedUserActions: number
  closeRate: number
  onTimeClosed: number
  onTimeRate: number
  overdue: number
  created: number
  taggedActions: number
  commentsMade: number
  taggedComments: number
  participationStreak: number
  participationDays: string[]
  earnedPoints: number
  penaltyPoints: number
  totalPoints: number
  level: string
  levelTone: ActionGamificationTone
  rules: ActionGamificationRule[]
}

export function buildActionGamificationMetrics(
  userId: string | undefined,
  actions: AccionDiaria[],
  comments: AccionComentario[],
  today: string
): ActionGamificationMetrics {
  if (!userId) return emptyMetrics()

  const assigned = actions.filter((action) => action.responsable === userId)
  const closedAssigned = assigned.filter(isDone)
  const created = actions.filter((action) => action.created_by === userId)
  const commentsMade = comments.filter((comment) => comment.created_by === userId)
  const taggedComments = comments.filter((comment) => isTaggedInComment(comment, userId))
  const taggedActionIds = new Set(taggedComments.map((comment) => comment.accion_id))
  const taggedActions = actions.filter((action) => taggedActionIds.has(action.id))
  const userActions = uniqueActions([...assigned, ...created])
  const closedUserActions = userActions.filter(isDone)
  const onTimeClosed = closedUserActions.filter(isClosedOnTime)
  const overdue = userActions.filter(isActionOverdue)
  const participationDays = new Set<string>()

  created.forEach((action) => addDay(participationDays, action.created_at))
  closedUserActions.forEach((action) => addDay(participationDays, action.verified_at || action.completed_at || action.updated_at))
  commentsMade.forEach((comment) => addDay(participationDays, comment.created_at))

  const participationStreak = calculateParticipationStreak(participationDays, today)
  const rules: ActionGamificationRule[] = [
    {
      key: 'onTimeClosed',
      label: 'Cerradas en tiempo',
      count: onTimeClosed.length,
      pointsPerUnit: ACTION_GAMIFICATION_POINTS.onTimeClosed,
      points: calculateRulePoints(onTimeClosed.length, ACTION_GAMIFICATION_POINTS.onTimeClosed),
      helper: 'Cierres antes de la fecha y hora limite.',
      tone: 'positive',
    },
    {
      key: 'overdue',
      label: 'En retraso',
      count: overdue.length,
      pointsPerUnit: ACTION_GAMIFICATION_POINTS.overdue,
      points: calculateRulePoints(overdue.length, ACTION_GAMIFICATION_POINTS.overdue),
      helper: 'Acciones creadas por ti o asignadas a ti que el Kanban clasifica como Retraso.',
      tone: overdue.length > 0 ? 'negative' : 'neutral',
    },
    {
      key: 'commentsMade',
      label: 'Comentarios hechos',
      count: commentsMade.length,
      pointsPerUnit: ACTION_GAMIFICATION_POINTS.commentsMade,
      points: calculateRulePoints(commentsMade.length, ACTION_GAMIFICATION_POINTS.commentsMade),
      helper: 'Seguimiento escrito por el usuario.',
      tone: 'positive',
    },
    {
      key: 'created',
      label: 'Acciones creadas',
      count: created.length,
      pointsPerUnit: ACTION_GAMIFICATION_POINTS.created,
      points: calculateRulePoints(created.length, ACTION_GAMIFICATION_POINTS.created),
      helper: 'Acciones generadas por el usuario.',
      tone: 'positive',
    },
    {
      key: 'assigned',
      label: 'Acciones asignadas',
      count: assigned.length,
      pointsPerUnit: ACTION_GAMIFICATION_POINTS.assigned,
      points: calculateRulePoints(assigned.length, ACTION_GAMIFICATION_POINTS.assigned),
      helper: 'Responsabilidad tomada en el periodo.',
      tone: 'positive',
    },
    {
      key: 'participationStreak',
      label: 'Racha de participacion',
      count: participationStreak,
      pointsPerUnit: ACTION_GAMIFICATION_POINTS.participationStreak,
      points: calculateRulePoints(participationStreak, ACTION_GAMIFICATION_POINTS.participationStreak),
      helper: 'Dias seguidos creando, comentando o cerrando.',
      tone: participationStreak > 0 ? 'positive' : 'neutral',
    },
  ]
  const earnedPoints = rules.filter((rule) => rule.points > 0).reduce((sum, rule) => sum + rule.points, 0)
  const penaltyPoints = rules.filter((rule) => rule.points < 0).reduce((sum, rule) => sum + rule.points, 0)
  const totalPoints = earnedPoints + penaltyPoints
  const level = getScoreLevel(totalPoints)

  return {
    assigned: assigned.length,
    closedAssigned: closedAssigned.length,
    userActions: userActions.length,
    closedUserActions: closedUserActions.length,
    closeRate: percentage(closedUserActions.length, userActions.length),
    onTimeClosed: onTimeClosed.length,
    onTimeRate: percentage(onTimeClosed.length, closedUserActions.length),
    overdue: overdue.length,
    created: created.length,
    taggedActions: taggedActions.length,
    commentsMade: commentsMade.length,
    taggedComments: taggedComments.length,
    participationStreak,
    participationDays: [...participationDays].sort().reverse(),
    earnedPoints,
    penaltyPoints,
    totalPoints,
    level,
    levelTone: getLevelTone(totalPoints),
    rules,
  }
}

export function getUserOwnedActions(
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

export function getUserRelevantComments(
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

function emptyMetrics(): ActionGamificationMetrics {
  return {
    assigned: 0,
    closedAssigned: 0,
    userActions: 0,
    closedUserActions: 0,
    closeRate: 0,
    onTimeClosed: 0,
    onTimeRate: 0,
    overdue: 0,
    created: 0,
    taggedActions: 0,
    commentsMade: 0,
    taggedComments: 0,
    participationStreak: 0,
    participationDays: [],
    earnedPoints: 0,
    penaltyPoints: 0,
    totalPoints: 0,
    level: 'Sin actividad',
    levelTone: 'neutral',
    rules: [],
  }
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

function isClosedOnTime(action: AccionDiaria) {
  const closedAt = action.verified_at || action.completed_at || action.updated_at
  const dueAt = new Date(`${action.fecha}T${action.hora_limite || '23:59'}`)
  return new Date(closedAt).getTime() <= dueAt.getTime()
}

function isActionOverdue(action: AccionDiaria) {
  return action.estado === 'Retraso' || isEnRetraso(action)
}

function calculateRulePoints(count: number, pointsPerUnit: number) {
  if (count === 0) return 0
  return count * pointsPerUnit
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function addDay(days: Set<string>, value: string | null | undefined) {
  const day = toDayKey(value)
  if (day) days.add(day)
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

function getScoreLevel(points: number) {
  if (points >= 140) return 'Alto desempeno'
  if (points >= 70) return 'Confiable'
  if (points > 0) return 'En avance'
  if (points < 0) return 'En recuperacion'
  return 'Sin actividad'
}

function getLevelTone(points: number): ActionGamificationTone {
  if (points >= 70) return 'positive'
  if (points > 0) return 'warning'
  if (points < 0) return 'negative'
  return 'neutral'
}
