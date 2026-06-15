import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard, SectionCardBody, SectionCardHeader } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { canManageAcademyModulesByRole } from '@/features/auth/lib/permissions'
import { useAcademyProgress } from '../hooks/useAcademyProgress'
import { useAcademyModules } from '../hooks/useAcademyModules'
import { AcademyModuleCard } from '../components/AcademyModuleCard'
import { AcademyProgressBar } from '../components/AcademyProgressBar'
import { AcademyModuleDetail } from '../components/AcademyModuleDetail'
import { AcademyQuiz } from '../components/AcademyQuiz'
import type { QuizAnswer } from '../types/academy.types'

export function AcademyPage() {
  const [selectedModuleId, setSelectedModuleId] = useState(1)
  const { profile } = useAuth()
  const { modules, totalModules, isLoadingModules, modulesError } = useAcademyModules()
  const {
    isLoading,
    isSaving,
    error,
    completedCount,
    isModuleUnlocked,
    isModuleCompleted,
    isQuizPassed,
    isStepCompleted,
    toggleStep,
    submitQuiz,
  } = useAcademyProgress()

  const selectedModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId) ?? modules[0],
    [modules, selectedModuleId]
  )
  const selectedIndex = modules.findIndex((m) => m.id === selectedModule?.id)
  const isSelectedLocked = selectedModule ? !isModuleUnlocked(selectedModule.id) : true

  const handleQuizSubmit = async (answers: QuizAnswer[]) => {
    if (!selectedModule) {
      return { allCorrect: false, incorrectIndexes: [] }
    }
    const result = await submitQuiz(selectedModule, answers)
    if (result.allCorrect) {
      const nextModule = modules[selectedIndex + 1]
      if (nextModule && isModuleUnlocked(nextModule.id)) {
        setSelectedModuleId(nextModule.id)
      }
    }
    return result
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Formacion O2C</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Academia O2C</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Ruta formativa con desbloqueo progresivo, quiz obligatorio y progreso persistente por usuario.
          </p>
        </div>
        {canManageAcademyModulesByRole(profile?.rol) ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.SETTINGS_ACADEMY_MODULES}>Crear modulo</Link>
          </Button>
        ) : null}
      </header>

      <SectionCard>
        <SectionCardHeader
          title="Progreso en la ruta"
          subtitle={`${totalModules} modulos - desbloqueo y quiz por etapa.`}
        />
        <SectionCardBody>
          <AcademyProgressBar completed={completedCount} total={totalModules} />
        </SectionCardBody>
      </SectionCard>

      {error && (
        <SectionCard className="border-destructive/35">
          <SectionCardBody className="text-sm text-destructive">
            Error al cargar/guardar progreso de academia: {error}
          </SectionCardBody>
        </SectionCard>
      )}

      {modulesError && (
        <SectionCard className="border-destructive/35">
          <SectionCardBody className="text-sm text-destructive">
            Error al cargar modulos de academia: {modulesError}
          </SectionCardBody>
        </SectionCard>
      )}

      {isLoading || isLoadingModules || !selectedModule ? (
        <SectionCard>
          <SectionCardBody className="text-sm text-muted-foreground">
            Cargando progreso de la academia...
          </SectionCardBody>
        </SectionCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {modules.map((module) => (
              <AcademyModuleCard
                key={module.id}
                module={module}
                selected={module.id === selectedModule.id}
                unlocked={isModuleUnlocked(module.id)}
                completed={isModuleCompleted(module.id)}
                onSelect={setSelectedModuleId}
              />
            ))}
          </aside>

          <div className="space-y-6">
            <AcademyModuleDetail
              module={selectedModule}
              isLocked={isSelectedLocked}
              isSaving={isSaving}
              isStepCompleted={isStepCompleted}
              onToggleStep={(moduleId, stepIndex) => {
                void toggleStep(moduleId, stepIndex)
              }}
            />
            <AcademyQuiz
              module={selectedModule}
              isLocked={isSelectedLocked}
              isPassed={isQuizPassed(selectedModule.id)}
              isSaving={isSaving}
              onSubmitQuiz={(_module, answers) => handleQuizSubmit(answers)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
