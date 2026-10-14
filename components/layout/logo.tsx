import Image from "next/image";
import { cn } from "@/lib/cn";

export type LogoSize = "sm" | "md" | "lg";
export type LogoVariant = "default" | "white";

// Height of the logo in px at each size. The full logo is 760x114 (about 6.7 wide for 1 high), the mark is square.
const heights: Record<LogoSize, number> = {
  sm: 26, // top bar
  md: 32, // sidebar
  lg: 38, // sign-in brand panel
};

const FULL = { src: "/images/everdigitech-logo.png", width: 760, height: 114 } as const;
const MARK = { src: "/images/everdigitech-mark.png", width: 192, height: 192 } as const;

/** On the blue brand panel the dark wordmark would disappear, so the white variant turns the whole logo white. */
const whiteClass = "brightness-0 invert";

/** The ring mark of the EverDigitech logo, on its own. */
export function LogoMark({ variant = "default", height = 32, className }: { variant?: LogoVariant; height?: number; className?: string }) {
  return (
    <Image
      src={MARK.src}
      width={MARK.width}
      height={MARK.height}
      alt=""
      aria-hidden="true"
      priority
      style={{ height, width: height }}
      className={cn("shrink-0 object-contain", variant === "white" && whiteClass, className)}
    />
  );
}

export interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  /** Show only the rings (the name stays available to screen readers). */
  markOnly?: boolean;
  /** Show only the rings below sm, the full logo from sm up. */
  compact?: boolean;
  className?: string;
}

/** The EverDigitech logo (public/images/everdigitech-logo.png). Made from the website's logo. */
export function Logo({ size = "md", variant = "default", markOnly = false, compact = false, className }: LogoProps) {
  const height = heights[size];
  const white = variant === "white";
  const fullWidth = Math.round((height * FULL.width) / FULL.height);

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <span className="sr-only">EverDigitech</span>

      {markOnly ? (
        <LogoMark variant={variant} height={height} />
      ) : (
        <>
          {compact ? <LogoMark variant={variant} height={height} className="sm:hidden" /> : null}
          <Image
            src={FULL.src}
            width={FULL.width}
            height={FULL.height}
            alt=""
            aria-hidden="true"
            priority
            style={{ height, width: fullWidth }}
            className={cn("object-contain", white && whiteClass, compact && "max-sm:hidden")}
          />
        </>
      )}
    </span>
  );
}
