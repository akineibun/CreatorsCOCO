import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bf8f52]/60 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#bf8f52] text-[#14110f] hover:bg-[#c99a63] font-semibold',
        outline:
          'border border-[rgba(243,239,230,0.12)] bg-[rgba(243,239,230,0.04)] text-[#f3efe6] hover:bg-[rgba(243,239,230,0.08)] hover:border-[rgba(243,239,230,0.18)]',
        ghost:
          'text-[#f3efe6] hover:bg-[rgba(243,239,230,0.08)] hover:text-[#f3efe6]',
        destructive:
          'bg-[rgba(255,92,92,0.18)] border border-[rgba(255,92,92,0.32)] text-[#f2a6a6] hover:bg-[rgba(255,92,92,0.28)]',
        accent:
          'border border-[rgba(215,180,138,0.28)] bg-[rgba(191,143,82,0.12)] text-[#d7b48a] hover:bg-[rgba(191,143,82,0.2)]',
        active:
          'bg-gradient-to-br from-[#bf8f52] to-[#7d5a37] border-[rgba(255,225,191,0.32)] text-[#f9f5ec] font-semibold',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs rounded-lg',
        lg: 'h-11 px-6',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 text-xs rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
