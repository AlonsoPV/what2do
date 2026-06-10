import { useCallback, useEffect, useRef } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { cn } from '@/lib/utils'

const textareaBase =
  'flex min-h-[6rem] w-full resize-y rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm leading-relaxed transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

type AccionDescripcionTextareaProps = {
  id: string
  register: UseFormRegisterReturn
  value: string
  placeholder?: string
  className?: string
}

export function AccionDescripcionTextarea({
  id,
  register,
  value,
  placeholder,
  className,
}: AccionDescripcionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const { ref: registerRef, ...registerRest } = register

  const syncHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`
  }, [])

  useEffect(() => {
    syncHeight()
  }, [value, syncHeight])

  return (
    <textarea
      id={id}
      {...registerRest}
      ref={(node) => {
        registerRef(node)
        textareaRef.current = node
        if (node) syncHeight()
      }}
      placeholder={placeholder}
      rows={4}
      data-accion-field-editable="true"
      onInput={syncHeight}
      className={cn(
        textareaBase,
        'max-h-[min(40vh,360px)] overflow-y-auto whitespace-pre-wrap break-words',
        className
      )}
    />
  )
}
