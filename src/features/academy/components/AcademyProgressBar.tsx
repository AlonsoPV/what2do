import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { academyGlobalProgressPercent } from '../utils/academyProgress'

interface AcademyProgressBarProps {
  completed: number
  total: number
}

export function AcademyProgressBar({ completed, total }: AcademyProgressBarProps) {
  const percent = academyGlobalProgressPercent(completed, total)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Progreso global</CardTitle>
        <CardDescription>
          {completed} de {total} modulos completados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">{percent}% de avance</p>
      </CardContent>
    </Card>
  )
}
