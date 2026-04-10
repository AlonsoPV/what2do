import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KeyRound } from 'lucide-react'
import { ROUTES } from '@/constants'

type Props = {
  /** Correo en Auth; si existe, se prellena el formulario de recuperación. */
  userEmail?: string | null
}

/**
 * Contexto admin: la contraseña vive solo en Supabase Auth.
 * La persona usa el mismo flujo que desde el inicio de sesión (correo prellenado si aplica).
 */
export function PasswordManagementCard({ userEmail }: Props) {
  const forgotHref =
    userEmail?.trim() != null && userEmail.trim() !== ''
      ? `${ROUTES.FORGOT_PASSWORD}?email=${encodeURIComponent(userEmail.trim())}`
      : ROUTES.FORGOT_PASSWORD

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden />
          Contraseña de acceso
        </CardTitle>
        <CardDescription>
          La contraseña solo se define o restablece por correo (invitación o recuperación). Desde aquí
          abres el mismo flujo que esa persona usaría en el inicio de sesión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Si conoces el correo, el formulario se abre ya rellenado; esa persona confirma y recibe el enlace
          en su bandeja.
        </p>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to={forgotHref} target="_blank" rel="noopener noreferrer">
            Abrir recuperación de contraseña con este correo
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
