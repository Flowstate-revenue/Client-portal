import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground font-semibold hover:bg-primary-hover',
  secondary:
    'bg-transparent text-muted-foreground border border-border hover:border-primary hover:text-foreground',
  destructive: 'bg-destructive text-destructive-foreground font-semibold hover:bg-destructive-hover',
}

export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
