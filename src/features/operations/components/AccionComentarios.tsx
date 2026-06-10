/**
 * Comentarios de una acción: ver, crear, etiquetar personas.
 */

import { useMemo, useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { SectionCard, SectionCardHeader, SectionCardBody } from '@/components/SectionCard'
import { useAccionComentarios, useCreateAccionComentario } from '../hooks/useAccionComentarios'
import { notificacionesService } from '@/services/notificaciones.service'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useCurrentUser } from '@/features/users/hooks/useCurrentUser'
import {
  EVIDENCIA_REJECTED_MESSAGE,
  EVIDENCIA_ACCEPTED_FORMATS_SHORT,
  getEvidenciaAcceptedAccept,
} from '@/lib/evidenciaFileTypes'
import {
  uploadEvidenciaFile,
  getSignedUrlEvidencia,
  isAcceptedEvidenciaFile,
} from '@/services/evidenciaStorage.service'
import type { AccionComentario, ComentarioAdjunto } from '@/types/accionComentario'
import { formatDateTimeCDMX } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Tag,
  Paperclip,
  FileText,
  X,
  Send,
  Image as ImageIcon,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_COMMENT_CHARS = 2000

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function etiquetadosTriggerLabel(selected: { nombre: string }[]): string {
  if (selected.length === 0) return 'Etiquetar'
  if (selected.length === 1) return selected[0].nombre
  return `${selected.length} personas`
}

function resolveEtiquetasUsuarios(
  etiquetas: string[],
  userNames: Record<string, string>
): { userIds: string[]; textTags: string[] } {
  const userIds: string[] = []
  const textTags: string[] = []
  for (const tag of etiquetas) {
    if (userNames[tag] || UUID_RE.test(tag)) userIds.push(tag)
    else textTags.push(tag)
  }
  return { userIds, textTags }
}

export interface AccionComentariosProps {
  accionId: string
  tituloAccion?: string
  descripcionAccion?: string
  creadorId?: string | null
  creadorNombre?: string | null
  responsableId?: string | null
  responsableNames?: Record<string, string>
}

export function AccionComentarios({
  accionId,
  tituloAccion = '',
  descripcionAccion = '',
  creadorId = null,
  creadorNombre = null,
  responsableId,
  responsableNames = {},
}: AccionComentariosProps) {
  const { data: comments = [], isLoading, isError } = useAccionComentarios(accionId)
  const { data: users = [] } = useUsers({ activo: true })
  const { data: currentUser } = useCurrentUser()
  const createComment = useCreateAccionComentario(accionId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [contenido, setContenido] = useState('')
  const [etiquetadosIds, setEtiquetadosIds] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const userNames = useMemo(() => {
    const map: Record<string, string> = { ...responsableNames }
    for (const user of users) map[user.id] = user.nombre
    return map
  }, [responsableNames, users])

  const selectedUsers = useMemo(
    () => users.filter((user) => etiquetadosIds.includes(user.id)),
    [etiquetadosIds, users]
  )

  const canSubmit =
    contenido.trim().length > 0 && !createComment.isPending && contenido.length <= MAX_COMMENT_CHARS

  const toggleEtiquetado = (userId: string) => {
    setEtiquetadosIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    const contenidoTrim = contenido.trim()
    if (!contenidoTrim) {
      toast.error('Escribe un comentario')
      textareaRef.current?.focus()
      return
    }
    const currentUserId = currentUser?.id ?? null
    let adjuntos: ComentarioAdjunto[] = []
    if (pendingFiles.length > 0) {
      try {
        adjuntos = await Promise.all(
          pendingFiles.map((file) => uploadEvidenciaFile(`comentarios/${accionId}`, file))
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al subir archivos')
        return
      }
    }
    createComment.mutate(
      {
        accion_id: accionId,
        contenido: contenidoTrim,
        created_by: currentUserId,
        asignado: etiquetadosIds[0] ?? null,
        etiquetas: etiquetadosIds.length ? etiquetadosIds : undefined,
        adjuntos: adjuntos.length ? adjuntos : undefined,
      },
      {
        onSuccess: async () => {
          setContenido('')
          setEtiquetadosIds([])
          setPendingFiles([])
          toast.success('Comentario publicado')
          const toNotify = new Set<string>()
          for (const uid of etiquetadosIds) {
            if (uid !== currentUserId) toNotify.add(uid)
          }
          if (responsableId && responsableId !== currentUserId) toNotify.add(responsableId)
          for (const uid of toNotify) {
            const isTagged = etiquetadosIds.includes(uid)
            const tipo = isTagged ? 'comentario_asignado' : 'comentario'
            const titulo = isTagged
              ? 'Te etiquetaron en un comentario'
              : 'Nuevo comentario en una acción de la que eres responsable'
            try {
              await notificacionesService.create({
                usuario_id: uid,
                tipo,
                payload: {
                  titulo,
                  titulo_accion: tituloAccion.trim() || undefined,
                  descripcion_accion: descripcionAccion.trim().slice(0, 500) || undefined,
                  creador_id: creadorId,
                  creador_nombre: creadorNombre,
                  mensaje: contenidoTrim.slice(0, 200),
                  accion_id: accionId,
                  autor_id: currentUserId,
                  autor_nombre: currentUser?.nombre ?? null,
                },
              })
            } catch {
              // no bloquear UX
            }
          }
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Error al agregar comentario'),
      }
    )
  }

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSubmit) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const authorName = currentUser?.nombre ?? 'Tú'
  const authorInitials = userInitials(authorName)

  return (
    <SectionCard className="accion-comentarios">
      <SectionCardHeader
        titleId="accion-comentarios-title"
        eyebrow="Colaboración"
        title="Comentarios"
        subtitle="Registra acuerdos, bloqueos o contexto para el equipo."
        icon={MessageSquare}
        action={
          !isLoading && !isError ? (
            <Badge variant="secondary" className="tabular-nums font-medium">
              {comments.length}
            </Badge>
          ) : null
        }
      />
      <SectionCardBody className="space-y-4">
        <div
          className="max-h-[min(20rem,40vh)] space-y-2 overflow-y-auto pr-0.5"
          role="feed"
          aria-labelledby="accion-comentarios-title"
        >
          {isError ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-800 dark:text-amber-200">
              No se pudieron cargar los comentarios. Verifica que la migración{' '}
              <code className="text-xs">accion_comentarios</code> esté aplicada.
            </div>
          ) : isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-border/40 p-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-12 w-full animate-pulse rounded bg-muted/80" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center">
              <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden />
              <p className="text-sm font-medium text-foreground">Sin comentarios aún</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Sé el primero en dejar contexto o coordinar con el responsable.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <ComentarioItem key={c.id} comment={c} userNames={userNames} />
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="overflow-hidden rounded-xl border border-border/60 bg-muted/10 shadow-sm ring-1 ring-border/30 focus-within:border-primary/40 focus-within:ring-primary/20"
        >
          <div className="flex gap-3 p-3 sm:p-4">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
              aria-hidden
            >
              {authorInitials}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{authorName}</p>
              <textarea
                ref={textareaRef}
                id="comentario-contenido"
                value={contenido}
                onChange={(e) => setContenido(e.target.value.slice(0, MAX_COMMENT_CHARS))}
                onKeyDown={onComposerKeyDown}
                placeholder="Escribe un comentario… (Ctrl+Enter para enviar)"
                rows={3}
                disabled={createComment.isPending}
                className={cn(
                  'w-full resize-none bg-transparent text-sm leading-relaxed text-foreground',
                  'placeholder:text-muted-foreground/80',
                  'focus:outline-none disabled:opacity-60'
                )}
              />
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="gap-1 pr-1 text-xs font-normal"
                    >
                      <Tag className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                      {user.nombre}
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-muted-foreground/20"
                        aria-label={`Quitar ${user.nombre}`}
                        onClick={() => toggleEtiquetado(user.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {pendingFiles.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {pendingFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/50 bg-background px-2 py-1 text-xs"
                    >
                      {f.type.startsWith('image/') ? (
                        <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate font-medium">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Quitar archivo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/50 bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex flex-wrap items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept={getEvidenciaAcceptedAccept()}
                className="hidden"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  const valid = files.filter(isAcceptedEvidenciaFile)
                  if (valid.length < files.length) toast.error(EVIDENCIA_REJECTED_MESSAGE)
                  setPendingFiles((prev) => [...prev, ...valid].slice(0, 5))
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={createComment.isPending || pendingFiles.length >= 5}
                title={`Adjuntar ${EVIDENCIA_ACCEPTED_FORMATS_SHORT}`}
              >
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">Adjuntar</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 gap-1.5 px-2',
                      selectedUsers.length > 0
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    disabled={createComment.isPending}
                  >
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">{etiquetadosTriggerLabel(selectedUsers)}</span>
                    {selectedUsers.length > 0 ? (
                      <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
                        {selectedUsers.length}
                      </Badge>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-64 w-[min(100vw-2rem,18rem)] overflow-y-auto"
                >
                  {users.map((user) => (
                    <DropdownMenuCheckboxItem
                      key={user.id}
                      checked={etiquetadosIds.includes(user.id)}
                      onCheckedChange={() => toggleEtiquetado(user.id)}
                    >
                      {user.nombre}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span
                className={cn(
                  'text-[11px] tabular-nums text-muted-foreground',
                  contenido.length > MAX_COMMENT_CHARS * 0.9 && 'text-amber-600'
                )}
              >
                {contenido.length}/{MAX_COMMENT_CHARS}
              </span>
              <Button type="submit" size="sm" disabled={!canSubmit} className="gap-1.5 shrink-0">
                <Send className="h-4 w-4" />
                {createComment.isPending ? 'Publicando…' : 'Publicar'}
              </Button>
            </div>
          </div>
        </form>
      </SectionCardBody>
    </SectionCard>
  )
}

function AdjuntoLink({ storage_path, file_name }: ComentarioAdjunto) {
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    getSignedUrlEvidencia(storage_path)
      .then(setUrl)
      .catch(() => setErr(true))
  }, [storage_path])
  if (err) return <span className="text-xs text-muted-foreground">{file_name}</span>
  if (!url) return <span className="animate-pulse text-xs text-muted-foreground">{file_name}…</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background px-2 py-1 text-xs font-medium text-primary hover:bg-muted/40 hover:underline"
    >
      <FileText className="h-3 w-3 shrink-0" />
      <span className="max-w-[12rem] truncate">{file_name}</span>
    </a>
  )
}

function ComentarioItem({
  comment,
  userNames,
}: {
  comment: AccionComentario
  userNames: Record<string, string>
}) {
  const adjuntos = comment.adjuntos ?? []
  const rawTags = comment.etiquetas ?? []
  const { userIds, textTags } = resolveEtiquetasUsuarios(rawTags, userNames)
  const taggedIds = new Set(userIds)
  if (comment.asignado) taggedIds.add(comment.asignado)
  const taggedPeople = [...taggedIds].map((id) => ({
    id,
    name: userNames[id] ?? id,
  }))
  const authorLabel = comment.created_by
    ? userNames[comment.created_by] ?? 'Usuario'
    : 'Usuario'
  const authorInitials = userInitials(authorLabel)

  return (
    <li className="flex gap-3 rounded-xl border border-border/50 bg-background/80 p-3 text-sm shadow-sm">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
        aria-hidden
      >
        {authorInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-foreground">{authorLabel}</span>
          <time
            className="text-[11px] text-muted-foreground"
            dateTime={comment.created_at}
            title={comment.created_at}
          >
            {formatDateTimeCDMX(comment.created_at)}
          </time>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-foreground/95">
          {comment.contenido}
        </p>
        {adjuntos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {adjuntos.map((a, i) => (
              <AdjuntoLink
                key={`${a.storage_path}-${i}`}
                storage_path={a.storage_path}
                file_name={a.file_name}
              />
            ))}
          </div>
        )}
        {(taggedPeople.length > 0 || textTags.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {taggedPeople.length > 0 ? (
              <>
                <Tag className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                {taggedPeople.map(({ id, name }) => (
                  <Badge key={id} variant="outline" className="text-[11px] font-normal">
                    {name}
                  </Badge>
                ))}
              </>
            ) : null}
            {textTags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[11px] font-normal">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}
