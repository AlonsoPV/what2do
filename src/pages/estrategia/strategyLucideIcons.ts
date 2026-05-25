import {
  Activity,
  Landmark,
  Layers,
  Package,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/** Iconos Lucide referenciados por columna `fce.icono` (seed en migración). */
const STRATEGY_ICONS: Record<string, LucideIcon> = {
  Activity,
  Landmark,
  Package,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Users,
  Zap,
}

export function resolveStrategyIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Layers
  return STRATEGY_ICONS[iconName] ?? Layers
}
