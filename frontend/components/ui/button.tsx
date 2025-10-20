import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-semibold tracking-tight transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-holo-purple to-holo-purple-light text-white shadow-glow-purple hover:shadow-glow-purple hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border-2 border-border bg-transparent hover:bg-muted hover:border-holo-purple/50 glass-panel backdrop-blur-sm",
        secondary:
          "bg-gradient-to-r from-holo-teal to-holo-teal-dark text-white shadow-glow-teal hover:shadow-glow-teal hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "hover:bg-muted/50 hover:text-foreground backdrop-blur-sm",
        link: "text-holo-purple underline-offset-4 hover:underline hover:text-holo-purple-light",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-8 px-4 py-2 text-xs has-[>svg]:px-3",
        lg: "h-12 px-7 py-3 text-base has-[>svg]:px-5",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
