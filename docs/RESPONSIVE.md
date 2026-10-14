# Responsive rules

Every page and component in this app follows these rules. Check new work against them before calling it done.

## Approach

- **Mobile first.** Write base styles for phones, then add `sm:` / `md:` / `lg:` / `xl:` overrides.
- **Breakpoints** (Tailwind defaults):

  | Prefix | Min width | Device           |
  | ------ | --------- | ---------------- |
  | base   | < 640     | phone            |
  | `sm`   | 640       | large phone      |
  | `md`   | 768       | tablet           |
  | `lg`   | 1024      | laptop           |
  | `xl`   | 1280      | desktop          |
  | `2xl`  | 1536      | wide desktop     |

- **Must work perfectly at:** 360, 390, 430, 768, 1024, 1280, 1440, 1920 px.

## Overflow

- The page itself must **never** scroll horizontally at any width.
- Only an inner container (a wide table, a chart) may scroll sideways, inside its own `overflow-x-auto` wrapper.
- Use `min-w-0` on flex/grid children that contain text.
- Truncate long names and emails with an ellipsis (`truncate`) instead of letting them overflow.

## Touch and input

- Every touch target is at least **44×44 px** (`min-h-11 min-w-11`, or `size-11` for icon buttons).
- Inputs use **16px** font size on phones so iOS does not zoom on focus (enforced globally in `app/globals.css`; don't override it below `sm`).
- Hover-only interactions must also work on tap. Nothing important is hidden behind hover.

## Spacing and type

- **Page padding:** 16px phone, 24px tablet, 32px desktop → `px-4 md:px-6 xl:px-8` (same for vertical padding).
- **Content max-width:** 1360px → `max-w-[1360px]`.
- **Page title:** 24px phone, 28px tablet, 30px desktop → `text-2xl md:text-[28px] xl:text-[30px]`.

## Viewport and safe areas

- Viewport meta has `viewport-fit=cover` (set in `app/layout.tsx`).
- Fixed bottom bars pad with `env(safe-area-inset-bottom)`, e.g. `pb-[env(safe-area-inset-bottom)]`.
- Use `dvh` instead of `vh` for full-height layouts (`min-h-dvh`, `h-dvh`).

## Motion

- Respect `prefers-reduced-motion` for drawer and accordion animations. A global rule in `app/globals.css` neutralises transitions; prefer `motion-safe:` variants for any new animation.
