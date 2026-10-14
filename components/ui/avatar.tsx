import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type AvatarSize = 36 | 40;

/** First letter of up to the first two words: "Nayemul Zannat" → "NZ". */
export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export type AvatarProps = Omit<ComponentProps<"span">, "children"> & {
  name: string;
  size?: AvatarSize;
  /**
   * Avatars usually sit next to the visible name, so they're hidden from screen readers.
   * Set to false when the avatar stands alone and should announce the name.
   */
  decorative?: boolean;
};

export function Avatar({ name, size = 40, decorative = true, className, ...props }: AvatarProps) {
  return (
    <span
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-pill bg-primary text-[13px] font-extrabold text-on-primary select-none",
        size === 36 ? "size-9" : "size-10",
        className,
      )}
      {...props}
    >
      {getInitials(name)}
    </span>
  );
}
