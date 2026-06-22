-- La evidencia queda como dato opcional: se puede adjuntar, pero no bloquea
-- el cierre de acciones ni desde el tablero ni desde Telegram.
CREATE OR REPLACE FUNCTION public.accion_requires_evidencia_text(p_evidencia_esperada text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT false;
$$;

COMMENT ON FUNCTION public.accion_requires_evidencia_text(text) IS
  'La evidencia es opcional y no impide cerrar acciones.';

NOTIFY pgrst, 'reload schema';
