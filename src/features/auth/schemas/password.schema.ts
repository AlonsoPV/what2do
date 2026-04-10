import { z } from 'zod'

/** Mínimo de caracteres; el administrador del proyecto puede exigir más en Supabase. */
export const PASSWORD_MIN_LENGTH = 6

export const emailFieldSchema = z
  .string()
  .min(1, 'Indica tu correo')
  .trim()
  .email('Escribe un correo válido')

export const newPasswordFieldSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Al menos ${PASSWORD_MIN_LENGTH} caracteres`)

export const forgotPasswordEmailSchema = z.object({
  email: emailFieldSchema,
})

export type ForgotPasswordEmailValues = z.infer<typeof forgotPasswordEmailSchema>

export const resetPasswordFormSchema = z
  .object({
    password: newPasswordFieldSchema,
    confirm: z.string().min(1, 'Repite la contraseña'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Las dos contraseñas deben coincidir',
    path: ['confirm'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
    newPassword: newPasswordFieldSchema,
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'La confirmación no coincide',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva debe ser distinta a la actual',
    path: ['newPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>
