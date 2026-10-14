import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the custom tokens in app/globals.css so e.g.
// "rounded-control rounded-pill" resolves to the last one instead of keeping both.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["card", "control", "nav", "pill"],
      shadow: ["segment"],
    },
  },
});

/** Merge conditional class names and resolve Tailwind conflicts (last one wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
