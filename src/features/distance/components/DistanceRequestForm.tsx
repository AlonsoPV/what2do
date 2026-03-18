/**
 * Formulario del tablero de distancias: origen/destino (dropdown + ubicación readonly),
 * botón Calcular kilometraje y botón Guardar ruta calculada.
 * Con simplified=false puede mostrar también ruta, fecha y hora (flujo legacy).
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { distanceRequestFormSchema, type DistanceRequestFormSchema } from '../schemas/distance-request.schema'
import { OriginSelect } from './OriginSelect'
import { DestinationSelect } from './DestinationSelect'
import type { DistanceOrigin } from '../types/distance.types'
import type { DistanceDestination } from '../types/distance.types'
import type { CalculateRouteResult } from '../types/distance.types'
import type { SavedRouteRequestRow } from '../types/distance.types'

const SENTINEL_EMPTY = '__none__'

export interface DistanceRequestFormProps {
  defaultFecha?: string
  defaultHoraAlta?: string
  /** Si true, solo muestra origen/destino y botones (sin ruta, fecha, hora) */
  simplified?: boolean
  /** Ruta ya guardada para este par (lookup); si existe no se llama a la API */
  savedRoute?: SavedRouteRequestRow | null
  /** Resultado de un cálculo reciente (Edge Function) */
  lastResult: CalculateRouteResult | null
  isCalculatePending: boolean
  isSavePending: boolean
  /** Llamado cuando cambian origen o destino (para lookup) */
  onOriginDestinationChange?: (originId: string, destinationId: string) => void
  onCalculate: (originId: string, destinationId: string) => void
  /** Flujo legacy: guardar en distance_requests con ruta/fecha/hora */
  onSaveRequest?: (values: DistanceRequestFormSchema, result: CalculateRouteResult) => void
  /** Flujo nuevo: guardar en saved_route_requests (dos filas A→B y B→A) */
  onSaveRouteCalculated?: (
    result: CalculateRouteResult,
    origin: { nombre: string; ubicacion: string },
    destination: { nombre: string; ubicacion: string }
  ) => void
}

const today = () => new Date().toISOString().slice(0, 10)

export function DistanceRequestForm({
  defaultFecha = today(),
  defaultHoraAlta = '09:00',
  simplified = false,
  savedRoute = null,
  lastResult,
  isCalculatePending,
  isSavePending,
  onOriginDestinationChange,
  onCalculate,
  onSaveRequest,
  onSaveRouteCalculated,
}: DistanceRequestFormProps) {
  const [selectedOrigin, setSelectedOrigin] = useState<DistanceOrigin | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<DistanceDestination | null>(null)

  const form = useForm<DistanceRequestFormSchema>({
    resolver: zodResolver(distanceRequestFormSchema),
    defaultValues: {
      ruta: '',
      fecha: defaultFecha,
      hora_alta: defaultHoraAlta,
      origin_id: '',
      destination_id: '',
    },
  })

  const originId = form.watch('origin_id')
  const destinationId = form.watch('destination_id')
  const originIdClean = originId && originId !== SENTINEL_EMPTY ? originId : ''
  const destinationIdClean = destinationId && destinationId !== SENTINEL_EMPTY ? destinationId : ''

  useEffect(() => {
    onOriginDestinationChange?.(originIdClean, destinationIdClean)
  }, [originIdClean, destinationIdClean, onOriginDestinationChange])

  const canCalculate =
    !!originIdClean &&
    !!destinationIdClean &&
    originIdClean !== destinationIdClean &&
    !savedRoute &&
    !isCalculatePending
  const canSaveLegacy =
    !!onSaveRequest &&
    !!lastResult?.ok &&
    lastResult.km_ida != null &&
    lastResult.km_vuelta != null &&
    lastResult.km_total != null &&
    form.formState.isValid &&
    !isSavePending
  const canSaveNew =
    !!onSaveRouteCalculated &&
    !!lastResult?.ok &&
    lastResult.km_ida != null &&
    lastResult.km_vuelta != null &&
    selectedOrigin &&
    selectedDestination &&
    !isSavePending
  const canSave = canSaveLegacy || canSaveNew

  const handleCalculate = () => {
    if (!originIdClean || !destinationIdClean) return
    form.clearErrors()
    onCalculate(originIdClean, destinationIdClean)
  }

  const handleSave = form.handleSubmit((values) => {
    if (!lastResult?.ok || lastResult.km_ida == null || lastResult.km_vuelta == null) return
    if (onSaveRouteCalculated && selectedOrigin && selectedDestination) {
      onSaveRouteCalculated(lastResult, { nombre: selectedOrigin.nombre, ubicacion: selectedOrigin.ubicacion }, { nombre: selectedDestination.nombre, ubicacion: selectedDestination.ubicacion })
    } else if (onSaveRequest) {
      onSaveRequest(values, lastResult)
    }
  })

  return (
    <form
      id="distance-request-form"
      className="distance-request-form space-y-4"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Solicitud de ruta / distancia"
    >
      <Card id="distance-request-card" className="distance-request-card border-border/60 bg-muted/5">
        <CardHeader id="distance-request-card-header" className="distance-request-card-header pb-3">
          <CardTitle id="distance-request-title" className="distance-request-title text-base">
            Solicitud de ruta
          </CardTitle>
          <p id="distance-request-description" className="distance-request-description text-xs text-muted-foreground">
            {simplified
              ? 'Elige origen y destino; si ya está guardada se mostrará. Si no, calcula y guarda la ruta.'
              : 'Elige origen y destino del catálogo; calcula ida/vuelta y guarda la solicitud.'}
          </p>
        </CardHeader>
        <CardContent id="distance-request-card-content" className="distance-request-card-content space-y-4">
          {!simplified && (
            <section id="distance-request-route-info" className="distance-request-route-info space-y-4" aria-label="Datos de la ruta">
              <div className="grid gap-4 sm:grid-cols-2">
                <div id="distance-request-field-ruta" className="distance-request-field space-y-2">
                  <Label id="distance-request-label-ruta" htmlFor="distance-request-input-ruta">
                    Ruta (opcional)
                  </Label>
                  <Input
                    id="distance-request-input-ruta"
                    className="distance-request-input h-9"
                    placeholder="ej. Ruta 01"
                    {...form.register('ruta')}
                  />
                </div>
                <div id="distance-request-field-fecha" className="distance-request-field space-y-2">
                  <Label id="distance-request-label-fecha" htmlFor="distance-request-input-fecha">
                    Fecha
                  </Label>
                  <Input
                    id="distance-request-input-fecha"
                    className="distance-request-input h-9"
                    type="date"
                    {...form.register('fecha')}
                    aria-required="true"
                  />
                  {form.formState.errors.fecha && (
                    <p id="distance-request-error-fecha" className="distance-request-error text-xs text-destructive" role="alert">
                      {form.formState.errors.fecha.message}
                    </p>
                  )}
                </div>
              </div>
              <div id="distance-request-field-hora" className="distance-request-field space-y-2">
                <Label id="distance-request-label-hora" htmlFor="distance-request-input-hora">
                  Hora de alta
                </Label>
                <Input
                  id="distance-request-input-hora"
                  className="distance-request-input h-9 w-fit"
                  type="time"
                  {...form.register('hora_alta')}
                  aria-required="true"
                />
                {form.formState.errors.hora_alta && (
                  <p id="distance-request-error-hora" className="distance-request-error text-xs text-destructive" role="alert">
                    {form.formState.errors.hora_alta.message}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Bloque: origen y destino */}
          <section id="distance-request-origin-destination" className="distance-request-origin-destination space-y-4" aria-label="Origen y destino">
            <div className="grid gap-4 sm:grid-cols-2">
              <div id="distance-request-field-origin" className="distance-request-field space-y-2">
                <Label id="distance-request-label-origin" htmlFor="distance-origin-select">
                  Origen
                </Label>
                <Controller
                  name="origin_id"
                  control={form.control}
                  render={({ field }) => (
                    <OriginSelect
                      id="distance-origin-select"
                      value={field.value}
                      onValueChange={field.onChange}
                      onOriginChange={setSelectedOrigin}
                      placeholder="Seleccionar origen"
                      className="distance-request-select"
                    />
                  )}
                />
                {form.formState.errors.origin_id && (
                  <p id="distance-request-error-origin" className="distance-request-error text-xs text-destructive" role="alert">
                    {form.formState.errors.origin_id.message}
                  </p>
                )}
                {selectedOrigin && (
                  <p
                    id="distance-request-ubicacion-origen"
                    className="distance-request-ubicacion text-xs text-muted-foreground truncate"
                    title={selectedOrigin.ubicacion}
                  >
                    {selectedOrigin.ubicacion}
                  </p>
                )}
              </div>
              <div id="distance-request-field-destination" className="distance-request-field space-y-2">
                <Label id="distance-request-label-destination" htmlFor="distance-destination-select">
                  Destino
                </Label>
                <Controller
                  name="destination_id"
                  control={form.control}
                  render={({ field }) => (
                    <DestinationSelect
                      id="distance-destination-select"
                      value={field.value}
                      onValueChange={field.onChange}
                      onDestinationChange={setSelectedDestination}
                      placeholder="Seleccionar destino"
                      className="distance-request-select"
                    />
                  )}
                />
                {form.formState.errors.destination_id && (
                  <p id="distance-request-error-destination" className="distance-request-error text-xs text-destructive" role="alert">
                    {form.formState.errors.destination_id.message}
                  </p>
                )}
                {selectedDestination && (
                  <p
                    id="distance-request-ubicacion-destino"
                    className="distance-request-ubicacion text-xs text-muted-foreground truncate"
                    title={selectedDestination.ubicacion}
                  >
                    {selectedDestination.ubicacion}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Acciones */}
          <div id="distance-request-actions" className="distance-request-actions flex flex-wrap gap-2">
            <Button
              id="distance-request-btn-calculate"
              type="button"
              variant="default"
              disabled={!canCalculate}
              onClick={handleCalculate}
              className="distance-request-btn-calculate"
              aria-busy={isCalculatePending}
            >
              {isCalculatePending ? 'Calculando…' : 'Calcular kilometraje'}
            </Button>
            <Button
              id="distance-request-btn-save"
              type="button"
              variant="secondary"
              disabled={!canSave}
              onClick={handleSave}
              className="distance-request-btn-save"
              aria-busy={isSavePending}
            >
              {isSavePending ? 'Guardando…' : simplified ? 'Guardar ruta calculada' : 'Guardar solicitud'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
