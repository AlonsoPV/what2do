import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { ROUTES } from '@/constants'

export function DistanceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Distancias</h2>
        <p className="text-muted-foreground">
          Cálculo de rutas y catálogos de orígenes, destinos y solicitudes guardadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Accesos</CardTitle>
              <CardDescription>
                Abre el módulo principal o gestiona los datos maestros desde catálogos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.DISTANCIAS}>Módulo Distancias</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.SETTINGS_CATALOGS_ORIGINS}>Orígenes</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.SETTINGS_CATALOGS_DESTINATIONS}>Destinos</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.SETTINGS_CATALOGS_SOLICITUDES_GUARDADAS}>Solicitudes guardadas</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
