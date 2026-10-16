import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input PIMS (docs/02-components.md#formfield): 52px mobile / 44px desktop,
 * radius 10, font 16 di mobile (cegah zoom iOS), border merah tetap saat invalid.
 */
const inputClassName =
  "flex w-full min-w-0 rounded-[10px] border-(length:--bw) border-input bg-background px-3.5 text-base text-foreground transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground selection:bg-brand selection:text-brand-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground lg:text-[15px] focus-visible:border-foreground focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_55%,transparent)] aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--danger)_22%,transparent)]"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputClassName, "h-13 py-1 lg:h-11", className)}
      {...props}
    />
  )
}

export { Input, inputClassName }
