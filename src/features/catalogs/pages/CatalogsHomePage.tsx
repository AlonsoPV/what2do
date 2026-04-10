import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import {
  Users,
  Shield,
  MapPin,
  Flag,
  ArrowUpCircle,
  List,
  Target,
  MapPinned,
  Navigation,
  ClipboardList,
  FolderKanban,
} from 'lucide-react'

const CATALOGS = [
  {
    title: 'Roles',
    description: 'Roles visibles del sistema. Preparado para permisos por rol.',
    href: ROUTES.SETTINGS_CATALOGS_ROLES,
    icon: Shield,
  },
  {
    title: 'Áreas',
    description: 'Departamentos o áreas para usuarios, filtros y reportes.',
    href: ROUTES.SETTINGS_CATALOGS_AREAS,
    icon: MapPin,
  },
  {
    title: 'Estatus',
    description: 'Estatus operativos con orden, color y estatus de cierre.',
    href: ROUTES.SETTINGS_CATALOGS_STATUSES,
    icon: Flag,
  },
  {
    title: 'Prioridades',
    description: 'Niveles de prioridad para acciones y tareas.',
    href: ROUTES.SETTINGS_CATALOGS_PRIORITIES,
    icon: ArrowUpCircle,
  },
  {
    title: 'Listas desplegables',
    description: 'Catálogos reutilizables (tipo + opciones label/value).',
    href: ROUTES.SETTINGS_CATALOGS_DROPDOWNS,
    icon: List,
  },
  {
    title: 'KPIs',
    description: 'KPIs configurables: unidad, tipo, meta, periodicidad.',
    href: ROUTES.SETTINGS_CATALOGS_KPIS,
    icon: Target,
  },
  {
    title: 'Brechas O2C',
    description: 'Gaps operativos: área, estado, responsable y vínculo a KPIs.',
    href: ROUTES.SETTINGS_CATALOGS_GAPS,
    icon: FolderKanban,
  },
  {
    title: 'Orígenes',
    description: 'Catálogo de orígenes para el tablero de distancias.',
    href: ROUTES.SETTINGS_CATALOGS_ORIGINS,
    icon: MapPinned,
  },
  {
    title: 'Destinos',
    description: 'Catálogo de destinos para el tablero de distancias.',
    href: ROUTES.SETTINGS_CATALOGS_DESTINATIONS,
    icon: Navigation,
  },
  {
    title: 'Solicitudes guardadas',
    description: 'Historial de solicitudes de rutas guardadas.',
    href: ROUTES.SETTINGS_CATALOGS_SOLICITUDES_GUARDADAS,
    icon: ClipboardList,
  },
] as const

export function CatalogsHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Catálogos</h2>
        <p className="text-muted-foreground">
          Administración de catálogos y configuración del sistema.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to={ROUTES.SETTINGS_USERS}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center gap-2">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>Gestión de perfiles de usuario</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        {CATALOGS.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} to={href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-2">
                <Icon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" size="sm" className="w-full">
                  Administrar
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
