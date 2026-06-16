-- Vínculos con Google Calendar / Tasks al exportar recordatorios desde SCRUMBAN.
ALTER TABLE calendar_reminders
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS google_task_id text;

COMMENT ON COLUMN calendar_reminders.google_calendar_event_id IS
  'ID del evento en Google Calendar creado/vinculado desde SCRUMBAN.';
COMMENT ON COLUMN calendar_reminders.google_task_id IS
  'ID de la tarea en Google Tasks creada/vinculada desde SCRUMBAN.';
