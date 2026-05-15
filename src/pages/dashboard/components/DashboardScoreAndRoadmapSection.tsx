import {
  GlobalScoreWidget,
  type GlobalScoreCoverage,
  type GlobalScoreEvolutionCopy,
} from '@/features/kpi'
import type { PortfolioComplianceBreakdown } from '@/features/kpi/utils/kpiCalculations'
import { cn } from '@/lib/utils'

export type DashboardScoreAndRoadmapSectionProps = {
  scoreLoading: boolean
  globalScore: number | null
  portfolioBreakdown: PortfolioComplianceBreakdown
  coverage: GlobalScoreCoverage
  evolution: GlobalScoreEvolutionCopy
  weightSum?: number | null
  weightWarning?: string | null
  className?: string
}

/** Bloque ejecutivo: score global O2C (KPIs ponderados). */
export function DashboardScoreAndRoadmapSection({
  scoreLoading,
  globalScore,
  portfolioBreakdown,
  coverage,
  evolution,
  weightSum,
  weightWarning,
  className,
}: DashboardScoreAndRoadmapSectionProps) {
  return (
    <section
      id="dashboard-section-o2c-global"
      data-section="portfolio-health"
      className={cn('scroll-mt-4 space-y-4', className)}
      aria-labelledby="dashboard-score-heading"
    >
      <h2 id="dashboard-score-heading" className="sr-only">
        Score global O2C
      </h2>

      {scoreLoading ? (
        <div
          className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 px-4 py-8"
          aria-busy="true"
        >
          <p className="text-sm text-muted-foreground">Cargando score global…</p>
        </div>
      ) : (
        <GlobalScoreWidget
          score={globalScore}
          breakdown={{
            on_track: portfolioBreakdown.on_track,
            at_risk: portfolioBreakdown.at_risk,
            off_track: portfolioBreakdown.off_track,
            sin_datos: portfolioBreakdown.sin_datos,
          }}
          coverage={coverage}
          evolution={evolution}
          weightSum={weightSum}
          weightWarning={weightWarning}
          cardTitle="Score Global O2C"
          subtitle="Salud operativa: media ponderada del cumplimiento de KPIs con observación válida (medición o valor actual en catálogo). Los KPIs sin dato operativo no entran al numerador y su peso se renormaliza entre los medibles."
        />
      )}
    </section>
  )
}
