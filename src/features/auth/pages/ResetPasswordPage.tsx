/**
 * Establecer nueva contraseña tras hacer clic en el enlace del correo.
 * Supabase redirige aquí con el token; al cargar la página la sesión se recupera.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME, ROUTES } from '@/constants'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

const MIN_PASSWORD_LENGTH = 6

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const checkSession = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true)
      })
    }
    checkSession()
    const hasRecoveryHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery')
    const retryTimer = hasRecoveryHash ? window.setTimeout(checkSession, 600) : undefined
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true)
    })
    const redirectTimer = window.setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) navigate(ROUTES.LOGIN, { replace: true })
      })
    }, 2000)
    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      subscription.unsubscribe()
      clearTimeout(redirectTimer)
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
      return
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Contraseña actualizada. Inicia sesión.')
      await supabase.auth.signOut()
      navigate(ROUTES.LOGIN, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>
            Elige una contraseña segura para tu cuenta de {APP_NAME}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nueva contraseña</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                minLength={MIN_PASSWORD_LENGTH}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo {MIN_PASSWORD_LENGTH} caracteres
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Confirmar contraseña</Label>
              <Input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
