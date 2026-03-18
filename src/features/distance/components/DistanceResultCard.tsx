/**
 * Tarjeta que muestra el resultado de la consulta de distancia (km) o error.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

/** Formatea segundos a "X min" o "X h Y min". */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const min = Math.round(seconds / 60)
  if (min < 60) return `~${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `~${h} h ${m} min` : `~${h} h`
}

export interface DistanceResultCardProps {
  /** Distancia en kilómetros (cuando ok) — legado una sola dirección */
  distanceKm?: number | null
  /** Duración estimada en segundos (opcional) */
  duracionSegundos?: number | null
  /** Ida/vuelta/total (nuevo flujo) */
  km_ida?: number | null
  km_vuelta?: number | null
  km_total?: number | null
  duracion_ida_segundos?: number | null
  duracion_vuelta_segundos?: number | null
  /** Mensaje de error cuando la consulta falló */
  errorMessage?: string | null
  /** Si la consulta se guardó en el historial */
  saved?: boolean
  /** Si el resultado vino de caché */
  cached?: boolean
  /** Origen del dato: guardado previo vs calculado ahora */
  sourceLabel?: 'saved' | 'calculated' | null
  /** Ocultar la tarjeta si no hay resultado ni error */
  hidden?: boolean
}

export function DistanceResultCard({
  distanceKm,
  duracionSegundos,
  km_ida,
  km_vuelta,
  km_total,
  duracion_ida_segundos,
  duracion_vuelta_segundos,
  errorMessage,
  saved,
  cached,
  sourceLabel,
  hidden,
}: DistanceResultCardProps) {
  const hasIdaVuelta = km_ida != null && km_vuelta != null && km_total != null
  const hasLegacy = distanceKm != null
  const hasSuccess = hasIdaVuelta || (hasLegacy && !errorMessage)
  if (hidden && !hasSuccess && !errorMessage) return null

  const sourceMessage =
    sourceLabel === 'saved'
      ? 'Ruta encontrada en solicitudes guardadas.'
      : sourceLabel === 'calculated'
        ? 'Ruta calculada exitosamente, puedes guardarla.'
        : null

  const hasError = !!errorMessage

  return (
    <Card
      id="distance-result-card"
      className={`distance-result-card ${hasError ? 'border-destructive/50 bg-destructive/5' : 'border-border/60 bg-muted/5'}`}
      aria-live="polite"
    >
      <CardHeader id="distance-result-card-header" className="distance-result-card-header pb-2">
        <div id="distance-result-header-row" className="flex items-center gap-2">
          {hasError ? (
            <AlertCircle id="distance-result-icon-error" className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle2 id="distance-result-icon-ok" className="h-5 w-5 text-green-600 dark:text-green-500" />
          )}
          <CardTitle id="distance-result-title" className="distance-result-title text-base">
            {hasError ? 'Error' : 'Resultado'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent id="distance-result-card-content" className="distance-result-card-content space-y-1">
        {hasError && (
          <p id="distance-result-error-message" className="distance-result-error-message text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        {hasSuccess && hasIdaVuelta && (
          <>
            <div id="distance-result-ida-vuelta-total" className="distance-result-ida-vuelta-total grid grid-cols-3 gap-2 text-sm">
              <div id="distance-result-km-ida" className="distance-result-km-ida">
                <p className="text-muted-foreground">Ida</p>
                <p className="font-semibold tabular-nums">{Number(km_ida).toFixed(2)} km</p>
                {duracion_ida_segundos != null && duracion_ida_segundos > 0 && (
                  <p className="text-xs text-muted-foreground">{formatDuration(duracion_ida_segundos)}</p>
                )}
              </div>
              <div id="distance-result-km-vuelta" className="distance-result-km-vuelta">
                <p className="text-muted-foreground">Vuelta</p>
                <p className="font-semibold tabular-nums">{Number(km_vuelta).toFixed(2)} km</p>
                {duracion_vuelta_segundos != null && duracion_vuelta_segundos > 0 && (
                  <p className="text-xs text-muted-foreground">{formatDuration(duracion_vuelta_segundos)}</p>
                )}
              </div>
              <div id="distance-result-km-total" className="distance-result-km-total">
                <p className="text-muted-foreground">Total</p>
                <p className="text-lg font-semibold tabular-nums">{Number(km_total).toFixed(2)} km</p>
              </div>
            </div>
            {(sourceMessage || saved || cached) && (
              <p id="distance-result-source-hint" className="distance-result-source-hint text-xs text-muted-foreground pt-1">
                {sourceMessage ?? (saved && 'Solicitud guardada.')}
                {!sourceMessage && saved && cached && ' '}
                {!sourceMessage && cached && 'Resultado desde catálogo.'}
              </p>
            )}
          </>
        )}
        {hasSuccess && !hasIdaVuelta && hasLegacy && (
          <>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {Number(distanceKm).toFixed(2)} km
              {duracionSegundos != null && duracionSegundos > 0 && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  · {formatDuration(duracionSegundos)}
                </span>
              )}
            </p>
            {(sourceMessage || saved || cached) && (
              <p className="text-xs text-muted-foreground pt-1">
                {sourceMessage ?? (saved && 'Consulta guardada en el historial.')}
                {!sourceMessage && saved && cached && ' '}
                {!sourceMessage && cached && 'Resultado desde caché.'}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
