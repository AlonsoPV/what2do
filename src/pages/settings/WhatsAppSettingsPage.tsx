import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  appSettingsService,
  DEFAULT_WHATSAPP_FOLLOWUP_SETTINGS,
  type WhatsAppFollowupSettings,
} from '@/services/appSettings.service'

const QUERY_KEY = ['app-settings', 'whatsapp-followup'] as const

function clampNumber(value: string, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

export function WhatsAppSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => appSettingsService.getWhatsAppFollowup(),
  })
  const [settings, setSettings] = useState<WhatsAppFollowupSettings>(DEFAULT_WHATSAPP_FOLLOWUP_SETTINGS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) setSettings(data)
  }, [data])

  const save = async () => {
    setSaving(true)
    try {
      const saved = await appSettingsService.saveWhatsAppFollowup(settings)
      setSettings(saved)
      await qc.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Configuracion de WhatsApp guardada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la configuracion')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">WhatsApp</h2>
        <p className="text-muted-foreground">
          Define el ritmo de seguimientos automáticos después de enviar una acción.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden />
            <CardTitle>Seguimientos de checklist</CardTitle>
          </div>
          <CardDescription>
            El mensaje principal se manda manualmente desde la acción. Los seguimientos se programan después.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-delay">Tiempo entre envíos (minutos)</Label>
              <Input
                id="whatsapp-delay"
                type="number"
                min={1}
                max={240}
                value={settings.followup_delay_minutes}
                disabled={isLoading || saving}
                onChange={(event) => setSettings((prev) => ({
                  ...prev,
                  followup_delay_minutes: clampNumber(event.target.value, 1, 240),
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-count">Veces al día</Label>
              <Input
                id="whatsapp-count"
                type="number"
                min={0}
                max={12}
                value={settings.followups_per_day}
                disabled={isLoading || saving}
                onChange={(event) => setSettings((prev) => ({
                  ...prev,
                  followups_per_day: clampNumber(event.target.value, 0, 12),
                }))}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            Con la configuración actual, después de enviar la acción se mandarán {settings.followups_per_day}{' '}
            seguimiento(s), cada {settings.followup_delay_minutes} minuto(s), solo para actividades pendientes.
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={save} disabled={isLoading || saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
