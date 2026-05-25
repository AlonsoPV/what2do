/**
 * Plan de acción — Scrum Master consultor (6 meses, 3 pistas).
 * Acceso restringido a un único usuario (ver constants).
 */

import { useState } from 'react'
import {
  Building2,
  ChevronDown,
  ExternalLink,
  FileText,
  GraduationCap,
  Monitor,
  Video,
  Youtube,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLAN_ACCION_TRACKS } from '../data/planAccionContent'
import type {
  PlanBadgeTone,
  PlanCard,
  PlanResource,
  PlanResourceKind,
  PlanTask,
  PlanTaskTone,
  PlanTrack,
} from '../data/planAccionContent'

const TAB_ICONS = {
  capacitacion: GraduationCap,
  tablero: Monitor,
  empresa: Building2,
} as const

const BADGE_CLASS: Record<PlanBadgeTone, string> = {
  violet: 'bg-[#EEEDFE] text-[#3C3489]',
  green: 'bg-[#E1F5EE] text-[#085041]',
  amber: 'bg-[#FAEEDA] text-[#633806]',
}

const DOT_CLASS: Record<PlanTaskTone, string> = {
  violet: 'bg-[#534AB7]',
  green: 'bg-[#1D9E75]',
  amber: 'bg-[#BA7517]',
}

const TAB_ACTIVE: Record<PlanTrack['tabClass'], string> = {
  t1: 'border-[#AFA9EC] bg-[#EEEDFE] text-[#3C3489]',
  t2: 'border-[#5DCAA5] bg-[#E1F5EE] text-[#085041]',
  t3: 'border-[#EF9F27] bg-[#FAEEDA] text-[#633806]',
}

function ResourceIcon({ kind }: { kind: PlanResourceKind }) {
  const cls = 'mt-0.5 size-4 shrink-0 text-muted-foreground'
  if (kind === 'youtube') return <Youtube className={cls} aria-hidden />
  if (kind === 'video') return <Video className={cls} aria-hidden />
  if (kind === 'link') return <ExternalLink className={cls} aria-hidden />
  return <FileText className={cls} aria-hidden />
}

function TaskList({ tasks }: { tasks: PlanTask[] }) {
  return (
    <ul className="divide-y divide-border/40">
      {tasks.map((t, i) => (
        <li key={i} className="flex gap-2 py-2 first:pt-0 last:pb-0">
          <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', DOT_CLASS[t.tone])} />
          <span className="text-sm leading-snug text-foreground">{t.text}</span>
        </li>
      ))}
    </ul>
  )
}

function PlanCardItem({ card }: { card: PlanCard }) {
  const [open, setOpen] = useState(false)

  return (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 sm:gap-3 sm:px-4"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
            BADGE_CLASS[card.badgeTone]
          )}
        >
          {card.badge}
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
          {card.title}
        </span>
        {card.tag ? (
          <span className="hidden shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">
            {card.tag}
          </span>
        ) : null}
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border/50 px-3.5 py-3 sm:px-4">
          {card.resources?.length ? (
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {card.resourceLabel ?? 'Recursos'}
              </p>
              <ul className="divide-y divide-border/40">
                {card.resources.map((r) => (
                  <ResourceRow key={`${r.title}-${r.url ?? ''}`} resource={r} />
                ))}
              </ul>
            </section>
          ) : null}

          {card.taskSections?.length
            ? card.taskSections.map((section) => (
                <section key={section.label}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                  <TaskList tasks={section.tasks} />
                </section>
              ))
            : null}

          {!card.taskSections?.length && (card.tasks?.length ?? 0) > 0 ? (
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {card.taskLabel ?? 'Tareas'}
              </p>
              <TaskList tasks={card.tasks!} />
            </section>
          ) : null}

          {card.connection ? (
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Conexión con el tablero
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{card.connection}</p>
            </div>
          ) : null}

          {card.cursorNote ? (
            <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Instrucción para Cursor
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{card.cursorNote}</p>
            </div>
          ) : null}

          {card.deliverable ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Entregable
              </p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-900 dark:text-emerald-100">
                {card.deliverable}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function ResourceRow({ resource }: { resource: PlanResource }) {
  return (
    <li className="flex gap-2 py-2 first:pt-0 last:pb-0">
      <ResourceIcon kind={resource.kind} />
      <div className="min-w-0 flex-1">
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
          >
            {resource.title}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground">{resource.title}</p>
        )}
        {resource.url ? (
          <p className="mt-0.5 break-all text-[11px] text-muted-foreground">{resource.url}</p>
        ) : null}
        {resource.hint ? (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{resource.hint}</p>
        ) : null}
      </div>
    </li>
  )
}

export function PlanAccionPage() {
  const [trackIdx, setTrackIdx] = useState(0)
  const track = PLAN_ACCION_TRACKS[trackIdx]
  const TabIcon = TAB_ICONS[track.id]

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ruta personal · Scrum Master consultor
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Plan de acción</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Seis meses en tres pistas paralelas: capacitación, optimización del tablero y entendimiento
          profundo de la empresa.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pistas del plan">
        {PLAN_ACCION_TRACKS.map((t, i) => {
          const Icon = TAB_ICONS[t.id]
          const active = i === trackIdx
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTrackIdx(i)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? TAB_ACTIVE[t.tabClass]
                  : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {t.label}
            </button>
          )
        })}
      </div>

      <section role="tabpanel" aria-labelledby={`plan-track-${track.id}`}>
        <div className="mb-3 flex items-center gap-2">
          <TabIcon className="size-4 text-muted-foreground" aria-hidden />
          <p
            id={`plan-track-${track.id}`}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {track.phaseLabel}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {track.cards.map((card) => (
            <PlanCardItem key={`${track.id}-${card.badge}-${card.title}`} card={card} />
          ))}
        </div>

        {track.rules?.length ? (
          <div className="mt-6 space-y-2">
            <p className="border-b border-border/50 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recomendaciones críticas de consultoría
            </p>
            {track.rules.map((rule) => (
              <div
                key={rule.title}
                className="rounded-lg border border-border/50 bg-muted/25 px-3.5 py-3"
              >
                <p className="text-sm font-medium text-foreground">{rule.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rule.text}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
