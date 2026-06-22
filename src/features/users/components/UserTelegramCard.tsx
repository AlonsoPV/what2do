import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { telegramIntegrationService, type TelegramIdentity } from '@/services/telegramIntegration.service'
import { toast } from 'sonner'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type UserTelegramSectionProps = {
  usuarioId: string
  displayName: string
  canManage: boolean
  onIdentityChange?: (identity: TelegramIdentity | null) => void
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

export function UserTelegramSection({
  usuarioId,
  displayName,
  canManage,
  onIdentityChange,
}: UserTelegramSectionProps) {
  const qc = useQueryClient()
  const queryKey = ['telegram-identity', usuarioId]
  const { data: identity, isLoading } = useQuery({
    queryKey,
    queryFn: () => telegramIntegrationService.getIdentity(usuarioId),
    enabled: canManage,
  })

  const [chatId, setChatId] = useState('')
  const [username, setUsername] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [telegramUserId, setTelegramUserId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    onIdentityChange?.(identity ?? null)
  }, [identity, onIdentityChange])

  useEffect(() => {
    if (!identity) {
      setChatId('')
      setUsername('')
      setTelegramUserId('')
      return
    }
    setChatId(identity.external_chat_id ?? '')
    setUsername(identity.external_username ?? '')
    setTelegramUserId(identity.external_user_id ?? '')
  }, [identity])

  if (!canManage) return null

  const handleSave = async () => {
    const cleanChatId = chatId.trim()
    if (!cleanChatId) {
      toast.error('Indica el chat_id que devolvió el bot.')
      return
    }

    setSaving(true)
    try {
      await telegramIntegrationService.adminUpsertIdentity({
        usuarioId,
        externalChatId: cleanChatId,
        externalUserId: telegramUserId.trim() || cleanChatId,
        externalUsername: username,
        displayName,
      })
      await qc.invalidateQueries({ queryKey })
      toast.success('Telegram vinculado. Ya puedes enviar acciones a este usuario.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la vinculación.')
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
            <h3 className="text-sm font-semibold text-foreground">Telegram</h3>
            <Badge variant={statusVariant(identity?.status)}>{statusLabel(identity?.status)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            El responsable debe enviar <code className="rounded bg-muted px-1">/start</code> al bot; copia el{' '}
            <code className="rounded bg-muted px-1">chat_id</code> de la respuesta.
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="telegram-chat-id">chat_id *</Label>
          <Input
            id="telegram-chat-id"
            value={chatId}
            onChange={(event) => setChatId(event.target.value)}
            placeholder="123456789"
            inputMode="numeric"
            disabled={isLoading || saving}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telegram-username">Usuario de Telegram</Label>
          <Input
            id="telegram-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="@usuario (opcional)"
            disabled={isLoading || saving}
          />
        </div>

        <Button
          type="button"
          className="w-full lg:w-auto"
          onClick={handleSave}
          disabled={isLoading || saving}
        >
          {saving ? 'Guardando…' : identity ? 'Actualizar' : 'Vincular'}
        </Button>
      </div>

      <div>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setShowAdvanced((open) => !open)}
          aria-expanded={showAdvanced}
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAdvanced && 'rotate-180')} />
          Campo avanzado
        </button>
        {showAdvanced ? (
          <div className="mt-2 max-w-md space-y-1.5">
            <Label htmlFor="telegram-user-id">telegram_user_id</Label>
            <Input
              id="telegram-user-id"
              value={telegramUserId}
              onChange={(event) => setTelegramUserId(event.target.value)}
              placeholder="Igual que chat_id si se deja vacío"
              inputMode="numeric"
              disabled={isLoading || saving}
            />
            <p className="text-xs text-muted-foreground">
              Solo si difiere del chat_id. Si está vacío al guardar, usamos el chat_id.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function telegramSummary(identity: TelegramIdentity | null | undefined): string {
  if (!identity?.external_chat_id) return 'Sin vincular'
  if (identity.external_username) return `@${identity.external_username.replace(/^@/, '')}`
  return identity.external_chat_id
}
