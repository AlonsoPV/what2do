/**
 * Asistente IA O2C: chat streaming, insights (gap/KPI), narrativa de sprint.
 * Consume Edge Functions definidas en docs/ia.md.
 */

import { useCallback, useRef, useState } from 'react'
import { Bot, ClipboardList, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AiChatMessage } from '@/features/ai-support/types'
import { streamAiChat } from '@/features/ai-support/services/aiChatStream.service'
import { fetchAiInsights } from '@/features/ai-support/services/aiInsights.service'
import { generateSprintReport } from '@/features/ai-support/services/aiReport.service'

type TabKey = 'chat' | 'gap' | 'sprint'

const MAX_MESSAGES = 32
const MIN_MS_BETWEEN_SENDS = 900

const areaClass =
  'min-h-[100px] w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function AiAssistPage() {
  const [tab, setTab] = useState<TabKey>('chat')
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const lastSendRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const [gapName, setGapName] = useState('')
  const [gapContext, setGapContext] = useState('')
  const [gapLoading, setGapLoading] = useState(false)
  const [gapResult, setGapResult] = useState<string | Record<string, unknown> | null>(null)
  const [gapWarn, setGapWarn] = useState<string | null>(null)

  const [kpiQuestion, setKpiQuestion] = useState('')
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiReply, setKpiReply] = useState<string | null>(null)

  const [sprintInput, setSprintInput] = useState('')
  const [sprintLoading, setSprintLoading] = useState(false)
  const [sprintReply, setSprintReply] = useState<string | null>(null)

  const sendChatMessage = useCallback(async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || streaming) return
    const now = Date.now()
    if (now - lastSendRef.current < MIN_MS_BETWEEN_SENDS) {
      toast.warning('Espera un momento antes de enviar otro mensaje.')
      return
    }
    lastSendRef.current = now

    const prevSnap = [...chatMessages]
    const sliced =
      prevSnap.length >= MAX_MESSAGES ? prevSnap.slice(-(MAX_MESSAGES - 1)) : prevSnap
    const payloadForApi: AiChatMessage[] = [...sliced, { role: 'user', content: trimmed }]

    setChatInput('')
    setChatMessages([...payloadForApi])
    setStreaming(true)
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      let accumulated = ''
      for await (const token of streamAiChat(payloadForApi, abortRef.current.signal)) {
        accumulated += token
        setChatMessages([...payloadForApi, { role: 'assistant', content: accumulated }])
      }
      const finalAssistant = accumulated.trim()
      if (!finalAssistant) {
        toast.error('No hubo contenido en la respuesta.')
        setChatMessages(prevSnap)
      } else {
        setChatMessages([...payloadForApi, { role: 'assistant', content: finalAssistant }])
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) {
        toast.error(e instanceof Error ? e.message : 'Error en el chat')
      }
      setChatMessages(prevSnap)
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [chatInput, chatMessages, streaming])

  const clearChat = () => {
    abortRef.current?.abort()
    setChatMessages([])
    setStreaming(false)
  }

  const runGapInsights = async () => {
    setGapLoading(true)
    setGapResult(null)
    setGapWarn(null)
    try {
      const { reply, parseWarning } = await fetchAiInsights({
        mode: 'gap_risk',
        gap_name: gapName.trim() || undefined,
        context: gapContext.trim() || undefined,
      })
      setGapResult(reply as string | Record<string, unknown>)
      if (parseWarning) setGapWarn(parseWarning)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al analizar gap')
    } finally {
      setGapLoading(false)
    }
  }

  const runKpiAssist = async () => {
    setKpiLoading(true)
    setKpiReply(null)
    try {
      const { reply } = await fetchAiInsights({
        mode: 'kpi_assist',
        user_message: kpiQuestion.trim(),
      })
      setKpiReply(typeof reply === 'string' ? reply : JSON.stringify(reply, null, 2))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al consultar KPIs')
    } finally {
      setKpiLoading(false)
    }
  }

  const runSprint = async () => {
    setSprintLoading(true)
    setSprintReply(null)
    try {
      const out = await generateSprintReport(sprintInput)
      setSprintReply(out)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar reporte')
    } finally {
      setSprintLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-7 w-7 text-primary shrink-0" aria-hidden />
          Asistente IA O2C
        </h2>
        <p className="text-muted-foreground mt-1">
          Apoyo técnico y operativo mediante el gateway Lovable (clave solo en servidor). Usa menos mensajes para
          ahorrar coste (max. {MAX_MESSAGES} en conversación enviados al modelo).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-border/70 bg-muted/20 p-1">
        {(
          [
            { key: 'chat' as const, label: 'Chat', Icon: Bot },
            { key: 'gap' as const, label: 'Riesgo / KPIs', Icon: ClipboardList },
            { key: 'sprint' as const, label: 'Sprint', Icon: FileText },
          ] as const
        ).map(({ key, label, Icon }) => (
          <Button
            key={key}
            type="button"
            variant={tab === key ? 'secondary' : 'ghost'}
            size="sm"
            className={cn('gap-1.5 rounded-md', tab === key && 'shadow-sm')}
            onClick={() => setTab(key)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Button>
        ))}
      </div>

      {tab === 'chat' && (
        <Card>
          <CardHeader>
            <CardTitle>Chat con streaming</CardTitle>
            <CardDescription>Pregunta sobre procesos O2C, KPIs u operaciones; respuesta por fragmentos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="min-h-[200px] max-h-[380px] overflow-y-auto rounded-lg border border-border/60 bg-card p-4 space-y-3"
              aria-live="polite"
            >
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Escribe abajo tu primera consulta.</p>
              ) : (
                chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-sm rounded-lg px-3 py-2 max-w-[95%]',
                      m.role === 'user'
                        ? 'ml-auto bg-primary/10 border border-primary/20'
                        : 'mr-auto bg-muted/50 border border-border/50 whitespace-pre-wrap'
                    )}
                  >
                    {m.content}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[180px] space-y-1.5">
                <Label htmlFor="ai-chat-input">Tu mensaje</Label>
                <Input
                  id="ai-chat-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ej. ¿Cómo se relacionan gaps y KPIs en O2C?"
                  disabled={streaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendChatMessage()
                    }
                  }}
                />
              </div>
              <Button type="button" onClick={() => void sendChatMessage()} disabled={streaming || !chatInput.trim()}>
                {streaming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Enviando…
                  </>
                ) : (
                  'Enviar'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={clearChat} disabled={streaming}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'gap' && (
        <div className="grid gap-6 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de riesgo de un gap</CardTitle>
              <CardDescription>Devuelve estructura JSON (nivel, factores, mitigaciones).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="gap-name">Nombre del gap</Label>
                <Input id="gap-name" value={gapName} onChange={(e) => setGapName(e.target.value)} placeholder="Ej. Ciclo cerrado tardío" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gap-ctx">Contexto (opcional)</Label>
                <textarea
                  id="gap-ctx"
                  className={areaClass}
                  value={gapContext}
                  onChange={(e) => setGapContext(e.target.value)}
                  rows={5}
                  placeholder="Dependencias, equipo, fecha límite, complejidad…"
                />
              </div>
              <Button type="button" onClick={() => void runGapInsights()} disabled={gapLoading}>
                {gapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analizar riesgo'}
              </Button>
              {gapWarn && <p className="text-sm text-amber-600">{gapWarn}</p>}
              {gapResult !== null && (
                <pre className="text-xs whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 overflow-x-auto">
                  {typeof gapResult === 'string' ? gapResult : JSON.stringify(gapResult, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Asistente de KPIs</CardTitle>
              <CardDescription>Consultas sobre métricas, fórmulas y mejoras O2C.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className={areaClass}
                value={kpiQuestion}
                onChange={(e) => setKpiQuestion(e.target.value)}
                rows={4}
                placeholder="Ej. ¿Cómo se calcula OTIF en nuestro contexto?"
              />
              <Button type="button" onClick={() => void runKpiAssist()} disabled={kpiLoading || !kpiQuestion.trim()}>
                {kpiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Consultar'}
              </Button>
              {kpiReply && (
                <div className="text-sm whitespace-pre-wrap rounded-lg border bg-muted/20 p-4">{kpiReply}</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'sprint' && (
        <Card>
          <CardHeader>
            <CardTitle>Narrativa de sprint</CardTitle>
            <CardDescription>
              Resume logros e impedimentos (máx. ~200 palabras en servidor). Pega texto o bullets con avances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className={areaClass}
              value={sprintInput}
              onChange={(e) => setSprintInput(e.target.value)}
              rows={10}
              placeholder={`• Completamos… \n• Bloqueante: …\n• Métricas: …`}
            />
            <Button type="button" onClick={() => void runSprint()} disabled={sprintLoading || !sprintInput.trim()}>
              {sprintLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generar reporte ejecutivo'}
            </Button>
            {sprintReply && (
              <div className="text-sm whitespace-pre-wrap rounded-lg border bg-muted/20 p-4">{sprintReply}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
