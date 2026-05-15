/** Mensajes válidos para el endpoint de streaming. */
export type AiChatMessage = {
  role: 'user' | 'assistant'
  content: string
}
