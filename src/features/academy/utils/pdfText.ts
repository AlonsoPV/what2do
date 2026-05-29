function decodePdfString(value: string): string {
  return value
    .replace(/\\([nrtbf()\\])/g, (_match, token: string) => {
      const map: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }
      return map[token] ?? token
    })
    .replace(/\\([0-7]{1,3})/g, (_match, octal: string) => String.fromCharCode(parseInt(octal, 8)))
}

function cleanPdfText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const raw = new TextDecoder('latin1').decode(buffer)
  const chunks: string[] = []

  for (const match of raw.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    chunks.push(decodePdfString(match[0].replace(/\)\s*Tj$/, '').slice(1)))
  }

  for (const match of raw.matchAll(/\[((?:\s*\((?:\\.|[^\\)])*\)\s*)+)\]\s*TJ/g)) {
    const inner = match[1]
    for (const part of inner.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      chunks.push(decodePdfString(part[0].slice(1, -1)))
    }
    chunks.push('\n')
  }

  return cleanPdfText(chunks.join(' '))
}
