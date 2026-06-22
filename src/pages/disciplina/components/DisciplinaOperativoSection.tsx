import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Columns3, type LucideIcon } from 'lucide-react'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import { cn } from '@/lib/utils'
import type { CalendarNote } from '@/services/calendarNotes.service'
import type { CalendarReminder } from '@/services/calendarReminders.service'
import { DisciplinaAccionesCard } from './DisciplinaAccionesCard'
import { DisciplinaCalendarioSection } from './DisciplinaCalendarioSection'

type OperativoTab = 'acciones' | 'calendario'

type TabConfig = {
  id: OperativoTab
  label: string
  hint: string
  icon: LucideIcon
  actionLabel: string
  actionTo: string
}

const TABS: TabConfig[] = [
  {
    id: 'acciones',
    label: 'Acciones',
    hint: 'Qué debes ejecutar y cerrar hoy.',
    icon: Columns3,
    actionLabel: 'Abrir Kanban',
    actionTo: ROUTES.KANBAN,
  },
  {
    id: 'calendario',
    label: 'Calendario',
    hint: 'Recordatorios y minutas recientes.',
    icon: CalendarDays,
    actionLabel: 'Abrir calendario',
    actionTo: ROUTES.CALENDARIO,
  },
]

export interface DisciplinaOperativoSectionProps {
  fecha: string
  usuarioId: string
  accionesCount: number
  accionesBloqueadas: number
  reminders: CalendarReminder[]
  notes: CalendarNote[]
  remindersLoading: boolean
  notesLoading: boolean
  remindersError: boolean
  notesError: boolean
}

function TabBadge({
  count,
  tone = 'default',
}: {
  count: number | string
  tone?: 'default' | 'alert' | 'muted'
}) {
  return (
    <span
      className={cn(
        'max-w-full truncate rounded-full px-1.5 py-px text-[9px] font-semibold tabular-nums sm:text-[10px]',
        tone === 'alert' && 'bg-red-500/15 text-red-800 dark:text-red-200',
        tone === 'default' && 'bg-primary/10 text-primary',
        tone === 'muted' && 'bg-muted text-muted-foreground'
      )}
    >
      {count}
    </span>
  )
}

export function DisciplinaOperativoSection({
  fecha,
  usuarioId,
  accionesCount,
  accionesBloqueadas,
  reminders,
  notes,
  remindersLoading,
  notesLoading,
  remindersError,
  notesError,
}: DisciplinaOperativoSectionProps) {
  const [activeTab, setActiveTab] = useState<OperativoTab>('acciones')
  const calendarioCount = reminders.length + notes.length

  const tabBadges: Record<OperativoTab, { value: number | string; tone?: 'default' | 'alert' | 'muted' }> = {
    acciones: {
      value: accionesCount,
      tone: accionesBloqueadas > 0 ? 'alert' : accionesCount > 0 ? 'default' : 'muted',
    },
    calendario: {
      value: calendarioCount,
      tone: calendarioCount > 0 ? 'default' : 'muted',
    },
  }

  const activeConfig = TABS.find((tab) => tab.id === activeTab) ?? TABS[0]
  const actionHref =
    activeTab === 'acciones' ? `${activeConfig.actionTo}?fecha=${encodeURIComponent(fecha)}` : activeConfig.actionTo

  return (
    <section id="disciplina-operativo" aria-labelledby="disciplina-operativo-heading">
      <SectionCard className="flex h-full flex-col">
        <SectionCardHeader
          className="px-3 py-3 sm:px-4 sm:py-4 md:px-6"
          titleId="disciplina-operativo-heading"
          eyebrow="Tu día"
          title="Tu día operativo"
          subtitle="Acciones y calendario en un solo lugar."
          icon={Columns3}
        />
        <SectionCardBody className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">
          <div
            className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/25 p-1"
            role="tablist"
            aria-label="Secciones del día operativo"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon
              const badge = tabBadges[tab.id]
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`disciplina-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`disciplina-panel-${tab.id}`}
                  className={cn(
                    'flex min-h-[3.75rem] touch-manipulation flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 transition-colors',
                    'sm:min-h-11 sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5',
                    selected
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-4 w-4 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                  <span className="max-w-full truncate text-center text-[10px] font-semibold leading-tight sm:text-xs md:text-sm">
                    {tab.label}
                  </span>
                  <TabBadge count={badge.value} tone={badge.tone} />
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2.5 rounded-lg border border-border/50 bg-muted/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
            <p className="min-w-0 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              <span className="font-semibold text-foreground">{activeConfig.label}:</span> {activeConfig.hint}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full shrink-0 rounded-lg text-xs sm:h-8 sm:w-auto sm:text-sm"
              asChild
            >
              <Link to={actionHref}>{activeConfig.actionLabel}</Link>
            </Button>
          </div>

          <div
            role="tabpanel"
            id={`disciplina-panel-${activeTab}`}
            aria-labelledby={`disciplina-tab-${activeTab}`}
            className="min-h-0 flex-1"
          >
            {activeTab === 'acciones' ? (
              <DisciplinaAccionesCard fecha={fecha} usuarioId={usuarioId} embedded />
            ) : null}
            {activeTab === 'calendario' ? (
              <DisciplinaCalendarioSection
                embedded
                reminders={reminders}
                notes={notes}
                remindersLoading={remindersLoading}
                notesLoading={notesLoading}
                remindersError={remindersError}
                notesError={notesError}
              />
            ) : null}
          </div>
        </SectionCardBody>
      </SectionCard>
    </section>
  )
}
