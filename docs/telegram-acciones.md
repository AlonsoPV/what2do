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

## Vinculacion de usuario

Cada usuario puede vincular su propio Telegram desde **Mi perfil**. La app genera un token temporal y abre:

```text
https://t.me/<VITE_TELEGRAM_BOT_USERNAME>?start=<token>
```

`super_admin` tambien puede generar tokens para otros usuarios desde servicios internos:

```ts
const token = await telegramIntegrationService.createLinkToken(usuarioId)
```

El usuario abre el bot con:

```text
/start <token>
```

Si Telegram Web abre el chat pero envia solo `/start`, copiar desde el perfil el comando completo `/start <token>` y pegarlo en el bot.

El token dura 15 minutos y queda consumido al vincularse.

El frontend necesita configurar el username publico del bot:

```bash
VITE_TELEGRAM_BOT_USERNAME=tu_bot
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
