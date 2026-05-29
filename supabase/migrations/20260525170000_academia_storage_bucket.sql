-- =============================================================================
-- Bucket Storage: academia — PDFs de módulos compartidos entre usuarios.
-- Lectura: cualquier usuario autenticado.
-- Escritura: admins de app (user_roles) o rol de negocio DG / Sistemas.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academia',
  'academia',
  false,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS academia_select ON storage.objects;
CREATE POLICY academia_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'academia');

DROP POLICY IF EXISTS academia_insert ON storage.objects;
CREATE POLICY academia_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academia'
    AND (
      is_app_admin()
      OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.user_id = auth.uid()
          AND trim(u.rol) IN ('DG', 'Sistemas')
      )
    )
  );

DROP POLICY IF EXISTS academia_update ON storage.objects;
CREATE POLICY academia_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academia'
    AND (
      is_app_admin()
      OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.user_id = auth.uid()
          AND trim(u.rol) IN ('DG', 'Sistemas')
      )
    )
  );

DROP POLICY IF EXISTS academia_delete ON storage.objects;
CREATE POLICY academia_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'academia'
    AND (
      is_app_admin()
      OR EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.user_id = auth.uid()
          AND trim(u.rol) IN ('DG', 'Sistemas')
      )
    )
  );
