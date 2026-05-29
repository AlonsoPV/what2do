import { useCallback, useEffect, useState } from 'react'
import { getAcademyPdfDownloadUrl } from '@/services/academyStorage.service'

type Params = {
  moduleId: number
  pdfName: string
  enabled?: boolean
}

export function useAcademyPdfUrl({ moduleId, pdfName, enabled = true }: Params) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUrl(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const href = await getAcademyPdfDownloadUrl(pdfName, moduleId)
      setUrl(href)
    } catch {
      setUrl(null)
    } finally {
      setLoading(false)
    }
  }, [enabled, moduleId, pdfName])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    url,
    loading,
    available: Boolean(url),
    refresh,
  }
}
