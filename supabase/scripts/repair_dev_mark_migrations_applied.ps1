# Marca como "applied" migraciones que YA están en el esquema DEV
# (historial desincronizado tras repair de versiones fantasma o db push parcial).
#
# NO uses db push --include-all si el esquema ya existe: re-ejecuta SQL y falla.
#
# Uso (desde raíz del repo, con Supabase CLI enlazado a DEV):
#   .\supabase\scripts\repair_dev_mark_migrations_applied.ps1
#   npx supabase db push
#
# Pendientes esperados tras repair (solo SQL nuevo):
#   - 20260617150000_statuses_estado_key.sql
#   - 20260619035859_action_close_rpc_and_telegram.sql
# (20260617120000 puede estar ya marcada en DEV)

$versions = @(
  '20260313400000',
  '20260313500000',
  '20260313600000',
  '20260313610000',
  '20260313620000',
  '20260313630000',
  '20260313640000',
  '20260313700000',
  '20260313800000',
  '20260313900000',
  '20260314000000',
  '20260406120000',
  '20260410120000',
  '20260410180000',
  '20260411120000',
  '20260411200000',
  '20260413120000',
  '20260415120000',
  '20260513190000',
  '20260520120000',
  '20260521120000',
  '20260524120000',
  '20260525120000',
  '20260525143000',
  '20260525150000',
  '20260525160000',
  '20260525170000',
  '20260525170100',
  '20260525180000',
  '20260526120000',
  '20260527120000',
  '20260527130000',
  '20260527140000',
  '20260601120000',
  '20260601140000',
  '20260601150000',
  '20260601160000',
  '20260601170000',
  '20260601180000',
  '20260603120000',
  '20260603130000',
  '20260603133000',
  '20260603140000',
  '20260604120000',
  '20260608120000',
  '20260608130000',
  '20260608140000',
  '20260609160000',
  '20260610120000',
  '20260610120100',
  '20260610123000',
  '20260612100000',
  '20260615120000',
  '20260615130000',
  '20260615140000',
  '20260616120000',
  '20260617120000'
)

Write-Host "Marcando $($versions.Count) migraciones como applied en DEV..."
npx supabase migration repair --status applied @versions
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Listo. Ejecuta solo lo pendiente con:"
Write-Host "  npx supabase db push"
Write-Host ""
Write-Host "NO uses --include-all."
