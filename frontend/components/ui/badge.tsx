import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-pill px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-all overflow-hidden backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "gradient-purple text-white shadow-glow-purple [a&]:hover:shadow-glow-purple",
        secondary:
          "gradient-teal text-white shadow-glow-teal [a&]:hover:shadow-glow-teal",
        destructive:
          "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg [a&]:hover:shadow-xl",
        outline:
          "border-2 border-border bg-transparent text-foreground [a&]:hover:bg-muted [a&]:hover:border-holo-purple/50",
        success:
          "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow-mint",
        warning:
          "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
