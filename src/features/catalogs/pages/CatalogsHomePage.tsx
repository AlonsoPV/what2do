import { Link } from 'react-router-dom'
import {
  Users,
  Shield,
  Building2,
  ListOrdered,
  ListTree,
  BarChart3,
  type LucideIcon,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import { cn } from '@/lib/utils'

type CatalogEntry = {
  title: string
  description: string
  href: string
  cta: string
  icon: LucideIcon
  iconClass: string
}

type CatalogGroup = {
  key: string
  title: string
  subtitle: string
  ringClass: string
  items: CatalogEntry[]
}

const GROUPS: CatalogGroup[] = [
  {
    key: 'organizacion',
    title: 'Organización',
    subtitle: 'Define quién usa el sistema y cómo se estructura el equipo.',
    ringClass: 'ring-blue-500/15',
    items: [
      {
        title: 'Usuarios',
        description: 'Altas, perfiles, responsables y acceso al tablero.',
        href: ROUTES.SETTINGS_USERS,
        cta: 'Ver usuarios',
        icon: Users,
        iconClass: 'bg-blue-500/12 text-blue-700 dark:text-blue-400',
      },
      {
        title: 'Roles',
        description: 'Perfiles visibles y base para permisos por rol.',
        href: ROUTES.SETTINGS_CATALOGS_ROLES,
        cta: 'Configurar roles',
        icon: Shield,
        iconClass: 'bg-blue-500/12 text-blue-700 dark:text-blue-400',
      },
      {
        title: 'Áreas',
        description: 'Departamentos para usuarios, filtros y reportes.',
        href: ROUTES.SETTINGS_CATALOGS_AREAS,
        cta: 'Gestionar áreas',
        icon: Building2,
        iconClass: 'bg-blue-500/12 text-blue-700 dark:text-blue-400',
      },
    ],
  },
  {
    key: 'operacion',
    title: 'Operación diaria',
    subtitle: 'Configura cómo se registra y prioriza el trabajo día a día.',
    ringClass: 'ring-amber-500/15',
    items: [
      {
        title: 'Estatus',
        description: 'Estados del flujo operativo, orden y reglas de cierre.',
        href: ROUTES.SETTINGS_CATALOGS_STATUSES,
        cta: 'Configurar estatus',
        icon: RefreshCw,
        iconClass: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',
      },
      {
        title: 'Prioridades',
        description: 'Niveles de urgencia para acciones y tablero.',
        href: ROUTES.SETTINGS_CATALOGS_PRIORITIES,
        cta: 'Editar prioridades',
        icon: ListOrdered,
        iconClass: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',
      },
      {
        title: 'Listas desplegables',
        description: 'Valores reutilizables (catálogo + opciones) en formularios.',
        href: ROUTES.SETTINGS_CATALOGS_DROPDOWNS,
        cta: 'Gestionar listas',
        icon: ListTree,
        iconClass: 'bg-amber-500/12 text-amber-800 dark:text-amber-300',
      },
    ],
  },
  {
    key: 'medicion',
    title: 'Medición y mejora',
    subtitle: 'Define cómo se mide el desempeño y dónde están las brechas O2C.',
    ringClass: 'ring-emerald-500/15',
    items: [
      {
        title: 'KPIs',
        description: 'Indicadores: unidad, meta, periodicidad y vínculo a gaps.',
        href: ROUTES.SETTINGS_CATALOGS_KPIS,
        cta: 'Editar KPIs',
        icon: BarChart3,
        iconClass: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300',
      },
      {
        title: 'Brechas (Gaps O2C)',
        description: 'Brechas operativas, área, avance y relación con KPIs y acciones.',
        href: ROUTES.SETTINGS_CATALOGS_GAPS,
        cta: 'Gestionar brechas',
        icon: AlertTriangle,
        iconClass: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300',
      },
    ],
  },
]

function CatalogRow({ item }: { item: CatalogEntry }) {
  const Icon = item.icon
  return (
    <div className="flex flex-col gap-3 border-b border-border/55 px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:py-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 dark:ring-white/10',
            item.iconClass
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{item.description}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="h-9 w-full shrink-0 sm:w-auto sm:min-w-[9.5rem]" asChild>
        <Link to={item.href}>{item.cta}</Link>
      </Button>
    </div>
  )
}

export function CatalogsHomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 lg:max-w-5xl">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Configuración</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Catálogos del sistema</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Listas maestras y parámetros agrupados por lógica de negocio. Menos ruido, más contexto: elige un bloque y
          abre solo lo que necesitas.
        </p>
      </header>

      <div className="space-y-10">
        {GROUPS.map((group) => (
          <section
            key={group.key}
            aria-labelledby={`catalog-group-${group.key}`}
            className="space-y-3"
          >
            <div className="space-y-1 px-0.5">
              <h2 id={`catalog-group-${group.key}`} className="text-lg font-semibold tracking-tight sm:text-xl">
                {group.title}
              </h2>
              <p className="max-w-3xl text-sm text-muted-foreground">{group.subtitle}</p>
            </div>
            <div
              className={cn(
                'overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-[2px]',
                'ring-1 ring-inset',
                group.ringClass
              )}
            >
              {group.items.map((item) => (
                <CatalogRow key={item.href} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
