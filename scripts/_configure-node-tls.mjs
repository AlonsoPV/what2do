/**
 * Mitiga "UNABLE_TO_VERIFY_LEAF_SIGNATURE" en redes con proxy/SSL corporativo.
 * Debe llamarse antes de cualquier import que haga HTTPS (p. ej. @supabase/supabase-js).
 */
export function configureNodeTls(argv = process.argv.slice(2)) {
  const insecure =
    argv.includes('--insecure-tls') ||
    process.env.SUPABASE_INSECURE_TLS === '1' ||
    process.env.SUPABASE_INSECURE_TLS === 'true'

  if (insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    console.warn(
      'AVISO: verificación TLS desactivada (--insecure-tls o SUPABASE_INSECURE_TLS=1). Solo en entorno de confianza.'
    )
    return 'insecure'
  }

  return 'default'
}

export const TLS_HELP = `
Si falla con "unable to verify the first certificate", prueba en este orden:
  1) node --use-system-ca scripts/fix-auth-users-via-admin.mjs ...
  2) npm run auth:fix-users -- jorgegonzalez@emx.mx
  3) node scripts/fix-auth-users-via-admin.mjs ... --insecure-tls
     (o SUPABASE_INSECURE_TLS=1 en .env — solo red corporativa)
`.trim()
