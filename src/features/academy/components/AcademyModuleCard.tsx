import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CheckCircle2, Lock, Unlock } from 'lucide-react'
import type { LearningModule } from '../types/academy.types'

interface AcademyModuleCardProps {
  module: LearningModule
  selected: boolean
  unlocked: boolean
  completed: boolean
  onSelect: (moduleId: number) => void
}

export function AcademyModuleCard({ module, selected, unlocked, completed, onSelect }: AcademyModuleCardProps) {
  const statusLabel = completed ? 'Completado' : unlocked ? 'Desbloqueado' : 'Bloqueado'
  const StatusIcon = completed ? CheckCircle2 : unlocked ? Unlock : Lock

  return (
    <button
      type="button"
      className="w-full text-left"
      onClick={() => unlocked && onSelect(module.id)}
      disabled={!unlocked}
      aria-disabled={!unlocked}
    >
      <Card
        className={cn(
          'transition-colors hover:border-primary/60',
          selected && 'border-primary',
          !unlocked && 'opacity-70'
        )}
      >
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                Modulo {module.id}: {module.title}
              </p>
              <p className="text-xs text-muted-foreground">{module.subtitle}</p>
            </div>
            <StatusIcon
              className={cn(
                'h-4 w-4 shrink-0',
                completed ? 'text-emerald-600' : unlocked ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Badge variant={completed ? 'default' : unlocked ? 'secondary' : 'outline'}>{statusLabel}</Badge>
            <span className="text-xs text-muted-foreground">{module.duration}</span>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}
