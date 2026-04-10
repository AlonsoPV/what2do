/** Etiquetas fijas al guardar en `descripcion_accion` (una sola columna texto). */
const L_COMO = 'Cómo:'
const L_QUIERO = 'Quiero:'
const L_PARA_QUE = 'Para qué:'

export function formatDescripcionTriada(como: string, quiero: string, paraQue: string): string {
  return `${L_COMO} ${como.trim()}\n\n${L_QUIERO} ${quiero.trim()}\n\n${L_PARA_QUE} ${paraQue.trim()}`
}

/** Parsea texto guardado; si no coincide el formato (datos antiguos), devuelve todo en `como`. */
export function parseDescripcionTriada(text: string): {
  descripcion_como: string
  descripcion_quiero: string
  descripcion_para_que: string
} {
  const t = text.trim()
  if (!t) {
    return { descripcion_como: '', descripcion_quiero: '', descripcion_para_que: '' }
  }

  const reComo = new RegExp(
    `^${L_COMO}\\s*([\\s\\S]*?)(?=\\n\\n${escapeRe(L_QUIERO)}|\\n\\n${escapeRe(L_PARA_QUE)}|$)`
  )
  const reQuiero = new RegExp(
    `\\n\\n${escapeRe(L_QUIERO)}\\s*([\\s\\S]*?)(?=\\n\\n${escapeRe(L_PARA_QUE)}|$)`
  )
  const rePara = new RegExp(`\\n\\n${escapeRe(L_PARA_QUE)}\\s*([\\s\\S]*)$`)

  const mC = t.match(reComo)
  const mQ = t.match(reQuiero)
  const mP = t.match(rePara)

  if (mC && mQ && mP) {
    return {
      descripcion_como: mC[1].trim(),
      descripcion_quiero: mQ[1].trim(),
      descripcion_para_que: mP[1].trim(),
    }
  }

  return { descripcion_como: t, descripcion_quiero: '', descripcion_para_que: '' }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
