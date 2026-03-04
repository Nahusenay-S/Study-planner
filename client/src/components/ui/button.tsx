import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base — Inter font, precise letter spacing, sharp focus ring
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium tracking-[-0.01em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        // Solid primary — flat, single color, subtle shadow on hover
        default:
          "rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] shadow-sm hover:shadow-md hover:shadow-primary/20",
        destructive:
          "rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.97] shadow-sm",
        // Clean outline — border only, fills on hover
        outline:
          "rounded-lg border border-border bg-transparent text-foreground hover:bg-muted/60 hover:border-border/80 active:scale-[0.97]",
        // Subtle filled secondary
        secondary:
          "rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50 active:scale-[0.97]",
        // Ghost — zero chrome, just the label
        ghost:
          "rounded-lg border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.97]",
        // Link style
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
