-- Permite adjuntar CSV y Excel en evidencias de acciones y comentarios.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
]
WHERE id = 'evidencias';

COMMENT ON COLUMN accion_comentarios.adjuntos IS
  'Array de { storage_path, file_name } para archivos adjuntos (PDF, PNG, JPG, CSV, Excel)';
