# Telegram para acciones

## Alcance

- **Fase 1:** enviar una accion completa al Telegram vinculado del responsable.
- **Fase 2:** marcar checklist desde botones, recibir documentos/fotos y cerrar la accion solo si el checklist esta completo y existe evidencia cuando aplica.

## Secrets de Supabase

Configurar en Supabase Edge Functions:

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
npx supabase secrets set TELEGRAM_WEBHOOK_SECRET=valor-largo-aleatorio
npx supabase secrets set APP_BASE_URL=https://tu-dominio.vercel.app
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` tambien deben estar disponibles para Edge Functions.

## Webhook

Despues de desplegar `telegram-webhook`, configurar Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","allowed_updates":["message","callback_query"]}'
```

Para el ambiente dev de este repo:

```powershell
npm run supabase:db:push:dev
npm run supabase:deploy:telegram:dev

curl.exe -k -X POST "https://api.telegram.org/bot<TU_TELEGRAM_BOT_TOKEN>/setWebhook" `
  -H "Content-Type: application/json" `
  -d "{""url"":""https://tgiuevzlyptzlfgxsfhj.supabase.co/functions/v1/telegram-webhook"",""secret_token"":""TU_TELEGRAM_WEBHOOK_SECRET"",""allowed_updates"":[""message"",""callback_query""]}"

curl.exe -k "https://api.telegram.org/bot<TU_TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## Vinculacion de usuario

La activacion la hace `super_admin` desde **Configuracion > Usuarios > Detalle del usuario > Telegram**.

Campos:

- `chat_id` requerido: identificador del chat privado de Telegram.
- `telegram_user_id` opcional: si no se captura, se usa el mismo `chat_id`.
- `username` opcional: referencia visual, no se usa para enviar.

El usuario no entra al tablero ni genera token. Solo debe haber abierto el bot al menos una vez para que Telegram permita que el bot le envie mensajes. El administrador captura el `chat_id` y presiona **Activar Telegram**.

Para obtener los datos, el usuario puede enviar `/start` al bot. El bot respondera:

```text
chat_id: 123456789
telegram_user_id: 123456789
username: @usuario
```

Activacion interna:

```ts
await telegramIntegrationService.adminUpsertIdentity({
  usuarioId,
  externalChatId,
  externalUserId,
  externalUsername,
})
```

## Envio de accion

El envio no es automatico. Se detona manualmente desde el detalle de cada accion con el boton **Telegram**, visible solo para `super_admin`.

```ts
await telegramIntegrationService.sendAction(accionId)
```

La Edge Function `telegram-send-action` vuelve a validar el rol `super_admin`, busca el Telegram activo del responsable y guarda el envio en `action_delivery_log`.

## Cierre seguro

El cierre esta centralizado en `try_set_accion_hecho(accion_id, usuario_id)`:

- valida permiso del actor,
- exige todos los checkpoints activos completos,
- exige evidencia si `evidencia_esperada` no esta marcada como opcional/no aplica,
- actualiza `estado`, `completed_at`, `completed_by` y `updated_by` en la misma transaccion.

Los archivos recibidos por Telegram se guardan en el bucket `evidencias` y se registran en `accion_evidencias`.
