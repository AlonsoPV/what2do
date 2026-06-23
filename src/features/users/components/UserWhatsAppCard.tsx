import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { whatsappIntegrationService, type WhatsAppIdentity } from '@/services/whatsappIntegration.service'
import { toast } from 'sonner'
import { MessageCircle } from 'lucide-react'

type UserWhatsAppSectionProps = {
  usuarioId: string
  displayName: string
  canManage: boolean
  onIdentityChange?: (identity: WhatsAppIdentity | null) => void
}

function statusVariant(status: string | undefined): 'success' | 'secondary' | 'muted' {
  if (status === 'active') return 'success'
  if (status === 'pending') return 'secondary'
  return 'muted'
}

function statusLabel(status: string | undefined): string {
  if (!status) return 'Sin vincular'
  if (status === 'active') return 'Vinculado'
  if (status === 'pending') return 'Pendiente'
  return status
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '')
}

export function UserWhatsAppSection({
  usuarioId,
  displayName,
  canManage,
  onIdentityChange,
}: UserWhatsAppSectionProps) {
  const qc = useQueryClient()
  const queryKey = ['whatsapp-identity', usuarioId]
  const { data: identity, isLoading } = useQuery({
    queryKey,
    queryFn: () => whatsappIntegrationService.getIdentity(usuarioId),
    enabled: canManage,
  })

  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    onIdentityChange?.(identity ?? null)
  }, [identity, onIdentityChange])

  useEffect(() => {
    setPhone(identity?.external_chat_id ?? '')
  }, [identity])

  if (!canManage) return null

  const handleSave = async () => {
    const cleanPhone = normalizePhone(phone)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      toast.error('Indica el WhatsApp con lada, solo numeros. Ej: 525511981149')
      return
    }

    setSaving(true)
    try {
      await whatsappIntegrationService.adminUpsertIdentity({
        usuarioId,
        phone: cleanPhone,
        displayName,
      })
      await qc.invalidateQueries({ queryKey })
      toast.success('WhatsApp vinculado. Ya puedes enviar acciones a este usuario.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la vinculacion.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4 border-t border-border/60 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">WhatsApp</h3>
            <Badge variant={statusVariant(identity?.status)}>{statusLabel(identity?.status)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Usa formato internacional sin espacios ni +. Ejemplo: 525511981149.
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-phone">Numero de WhatsApp *</Label>
          <Input
            id="whatsapp-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="525511981149"
            inputMode="numeric"
            disabled={isLoading || saving}
          />
        </div>

        <Button
          type="button"
          className="w-full lg:w-auto"
          onClick={handleSave}
          disabled={isLoading || saving}
        >
          {saving ? 'Guardando...' : identity ? 'Actualizar' : 'Vincular'}
        </Button>
      </div>
    </section>
  )
}
