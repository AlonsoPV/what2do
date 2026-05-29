import { useCallback, useEffect, useMemo, useState } from 'react'
import { ACADEMY_MODULES } from '../data/modules'
import { listAcademyModules } from '../services/academyModules.service'
import type { LearningModule } from '../types/academy.types'

export function useAcademyModules() {
  const [customModules, setCustomModules] = useState<LearningModule[]>([])
  const [isLoadingModules, setIsLoadingModules] = useState(true)
  const [modulesError, setModulesError] = useState<string | null>(null)

  const refreshModules = useCallback(async () => {
    setIsLoadingModules(true)
    setModulesError(null)
    try {
      const rows = await listAcademyModules()
      setCustomModules(rows)
    } catch (err) {
      setModulesError(err instanceof Error ? err.message : 'No se pudieron cargar los modulos de academia.')
    } finally {
      setIsLoadingModules(false)
    }
  }, [])

  useEffect(() => {
    void refreshModules()
  }, [refreshModules])

  const modules = useMemo(() => [...ACADEMY_MODULES, ...customModules], [customModules])

  return {
    modules,
    totalModules: modules.length,
    customModules,
    isLoadingModules,
    modulesError,
    refreshModules,
  }
}
