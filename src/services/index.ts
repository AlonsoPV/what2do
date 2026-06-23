/**
 * Servicios de comunicación con Supabase.
 * Cada servicio corresponde a un dominio de la spec (lovable-spec.md).
 */

export { authService } from './auth.service'
export { accionesService } from './acciones.service'
export type { AccionesFilter } from './acciones.service'
export { usuariosService } from './usuarios.service'
export { kpisService, semaforoFromValor } from './kpis.service'
export { disciplinaService } from './disciplina.service'
export { notificacionesService } from './notificaciones.service'
export { reportesService } from './reportes.service'
export { telegramIntegrationService } from './telegramIntegration.service'
export type { TelegramSendActionResult } from './telegramIntegration.service'
export { whatsappIntegrationService } from './whatsappIntegration.service'
export type { WhatsAppSendActionResult } from './whatsappIntegration.service'
