import { z } from 'zod'
import { emailFieldSchema } from './password.schema'

export const loginFormSchema = z.object({
  email: emailFieldSchema,
  password: z.string().min(1, 'Escribe tu contraseña'),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
