import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 min-h-11 px-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-accent/90",
        secondary: "bg-surface-2 text-fg border border-border hover:bg-surface",
        ghost: "text-muted hover:text-fg hover:bg-surface-2",
        danger: "bg-bad text-fg hover:bg-bad/90",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
