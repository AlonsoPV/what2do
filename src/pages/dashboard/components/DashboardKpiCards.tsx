/**
 * Grid de tarjetas KPI del dashboard (spec §4.1).
 */

import {
  ListTodo,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  TrendingUp,
} from 'lucide-react'
import type { MetricasAcciones } from '@/features/operations'
import { DashboardKpiCard } from './DashboardKpiCard'

export interface DashboardKpiCardsProps {
  metricas: MetricasAcciones
  isLoading?: boolean
}

export function DashboardKpiCards({ metricas, isLoading }: DashboardKpiCardsProps) {
  return (
    <div
      id="dashboard-kpi-cards"
      className="dashboard-kpi-cards grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5"
    >
      <DashboardKpiCard
        id="dashboard-kpi-card-total"
        className="dashboard-kpi-card dashboard-kpi-card-total"
        title="Total"
        value={metricas.total}
        description="Acciones con la fecha del filtro"
        icon={ListTodo}
        accent="slate"
        isLoading={isLoading}
      />
      <DashboardKpiCard
        id="dashboard-kpi-card-completadas"
        className="dashboard-kpi-card dashboard-kpi-card-completadas"
        title="Completadas"
        value={metricas.completadas}
        description="Hecho o verificado"
        icon={CheckCircle2}
        accent="emerald"
        isLoading={isLoading}
      />
      <DashboardKpiCard
        id="dashboard-kpi-card-bloqueadas"
        className="dashboard-kpi-card dashboard-kpi-card-bloqueadas"
        title="Bloqueadas"
        value={metricas.bloqueadas}
        description="Estado bloqueado"
        icon={AlertCircle}
        accent="red"
        isLoading={isLoading}
      />
      <DashboardKpiCard
        id="dashboard-kpi-card-sin-evidencia"
        className="dashboard-kpi-card dashboard-kpi-card-sin-evidencia"
        title="Sin evidencia"
        value={metricas.sinEvidencia}
        description="Listas sin adjunto"
        icon={FileQuestion}
        accent="amber"
        isLoading={isLoading}
      />
      <DashboardKpiCard
        id="dashboard-kpi-card-eficiencia"
        className="dashboard-kpi-card dashboard-kpi-card-eficiencia"
        title="Eficiencia"
        value={`${metricas.eficienciaPorcentaje}%`}
        description="Completadas ÷ total"
        icon={TrendingUp}
        accent="blue"
        isLoading={isLoading}
      />
    </div>
  )
}
