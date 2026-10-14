import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "danger-outline" | "ghost";
export type ButtonSize = "md" | "sm";

const base =
  "relative inline-flex shrink-0 items-center justify-center border font-bold whitespace-nowrap select-none transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:pointer-events-none [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary",
  secondary: "border-input-border bg-surface text-text-secondary hover:bg-surface-muted hover:text-text",
  "danger-outline": "border-danger-border bg-surface text-danger hover:bg-danger-soft hover:text-danger",
  ghost: "border-transparent bg-transparent text-text-secondary hover:bg-neutral-soft hover:text-text",
};

// sm is 40px to match the design; the ::before grows its hit area to 44px (docs/RESPONSIVE.md).
const sizes: Record<ButtonSize, { text: string; icon: string }> = {
  md: { text: "h-11 gap-2 rounded-control px-4 text-sm", icon: "size-11 rounded-control" },
  sm: {
    text: "h-10 gap-1.5 rounded-nav px-3 text-[13px] before:absolute before:-inset-0.5",
    icon: "size-10 rounded-nav before:absolute before:-inset-0.5",
  },
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
}

/** Button classes, for links and other elements that should look like a Button. */
export function buttonVariants({ variant = "primary", size = "md", iconOnly = false, className }: ButtonStyleOptions = {}) {
  return cn(base, variants[variant], iconOnly ? sizes[size].icon : sizes[size].text, className);
}

/** Small spinning loader. Static when the user prefers reduced motion. */
export function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return <LoaderCircle aria-hidden="true" className={cn("size-4 motion-safe:animate-spin", className)} {...props} />;
}

type ButtonBaseProps = Omit<ComponentProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
};

type TextButtonProps = ButtonBaseProps & {
  iconOnly?: false;
  /** Icon before the label; replaced by the spinner while loading. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
};

type IconButtonProps = ButtonBaseProps & {
  /** Square button holding only an icon. An aria-label is required so it has an accessible name. */
  iconOnly: true;
  "aria-label": string;
  leadingIcon?: never;
  trailingIcon?: never;
  /** The icon. */
  children: ReactNode;
};

export type ButtonProps = TextButtonProps | IconButtonProps;

export function Button({
  variant = "primary",
  size = "md",
  iconOnly = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({
        variant,
        size,
        iconOnly,
        className: cn(loading ? "cursor-wait" : "disabled:opacity-45", className),
      })}
      {...props}
    >
      {iconOnly ? (
        loading ? <Spinner /> : children
      ) : (
        <>
          {loading ? <Spinner /> : leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </button>
  );
}
