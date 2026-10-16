import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Button PIMS (docs/02-components.md#button).
 * - `brand` (kuning, teks hitam) maksimal satu per layar — CTA utama.
 * - `default` = `primary` (ink di light, kuning di dark).
 * - Ukuran mobile-first: default 48 → 40 di `lg`; `xl` 56 untuk CTA sticky mobile.
 */
const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 disabled:pointer-events-none disabled:opacity-40 aria-disabled:opacity-40 aria-invalid:border-danger",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        brand: "bg-brand text-brand-foreground shadow-sm hover:bg-[color-mix(in_oklab,var(--brand)_88%,black)]",
        destructive: "bg-danger text-white shadow-sm hover:bg-danger/90 dark:text-background",
        outline:
          "border-(length:--bw) border-input bg-background text-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-muted",
        link: "h-auto px-0 text-foreground underline underline-offset-4 hover:no-underline",
      },
      size: {
        xl: "h-14 rounded-[12px] px-6 text-base [&_svg:not([class*='size-'])]:size-5",
        lg: "h-13 rounded-[12px] px-5 text-base",
        default: "h-12 rounded-[12px] px-4 text-[15px] lg:h-10 lg:rounded-[10px] lg:text-sm",
        sm: "h-9 rounded-lg px-3 text-[13px] lg:h-8",
        icon: "size-12 rounded-[12px] lg:size-10 lg:rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Tampilkan spinner; label tetap terlihat dan tombol dinonaktifkan. */
    loading?: boolean
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
