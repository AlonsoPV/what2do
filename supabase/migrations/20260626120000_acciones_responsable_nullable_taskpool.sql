-- Taskpool → Kanban: las acciones pueden crearse sin responsable (taskpool).
-- Al asignar responsable pasan al tablero Kanban.

ALTER TABLE public.acciones_diarias
  ALTER COLUMN responsable DROP NOT NULL;

COMMENT ON COLUMN public.acciones_diarias.responsable IS
  'Responsable asignado (usuarios.id). NULL = actividad en taskpool sin asignar; al asignar aparece en Kanban.';
