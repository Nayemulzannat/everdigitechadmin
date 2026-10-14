/**
 * Responsive + accessibility check for every page, in mock mode.
 *
 *   npm run dev                      # with NEXT_PUBLIC_USE_MOCK=true (see .env.example)
 *   npm run check:responsive         # or: BASE_URL=http://localhost:3003 node scripts/responsive-check.ts [--strict]
 *
 * For each page × width it saves a full-page screenshot to screenshots/<page>-<width>.png and checks:
 * - horizontal page scroll (document.documentElement.scrollWidth > window.innerWidth) → FAILS the run;
 * - axe-core WCAG 2.1 A/AA rules (contrast, names, labels…), tap targets under 44×44, keyboard focus rings,
 *   layout shift while fonts and data load → reported (and fail with --strict).
 * Then it exercises the Drawer, Sheets, Dialog and account menu: focus trap, Esc, focus return, reduced motion.
 * Uses the installed Google Chrome (channel "chrome"), so no Playwright browser download is needed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3003";
const STRICT = process.argv.includes("--strict");
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
const AXE_WIDTHS = [360, 1440];
const OUT_DIR = "screenshots";
const MOCK_SESSION_KEY = "everdigitech.mock.session";
const SUPER_ADMIN = "nayem@everdigitech.com";
const SUPPORT = "support@example.com";

interface PageSpec {
  name: string;
  path: string;
  /** Mock sign-in email, or null to open signed out. */
  as: string | null;
  /** Selector that appears once real content (not skeletons) has rendered. */
  ready: string;
}

const PAGES: PageSpec[] = [
  { name: "login", path: "/login", as: null, ready: "form button[type=submit]" },
  { name: "dashboard", path: "/dashboard", as: SUPER_ADMIN, ready: "[role=img][aria-label^='Monthly revenue']" },
  { name: "clients", path: "/clients", as: SUPER_ADMIN, ready: "text=/^Showing \\d/" },
  { name: "roles", path: "/roles", as: SUPER_ADMIN, ready: "text=/permissions selected/" },
  { name: "forbidden", path: "/roles", as: SUPPORT, ready: "text=Error 403" },
  { name: "ui-preview", path: "/ui-preview", as: null, ready: "h1:has-text('UI preview')" },
];

type Issue = { page: string; width?: number; kind: string; detail: string };
const failures: Issue[] = [];
const warnings: Issue[] = [];

async function newContext(browser: Browser, email: string | null, options: { reducedMotion?: "reduce" | "no-preference" } = {}) {
  const context = await browser.newContext({ deviceScaleFactor: 1, reducedMotion: options.reducedMotion ?? "no-preference" });
  if (email) {
    await context.addCookies([{ name: "ed_signed_in", value: "1", url: BASE_URL }]);
    await context.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // ignore
        }
      },
      [MOCK_SESSION_KEY, JSON.stringify({ email })],
    );
  }
  // Collect layout shifts from the very first paint.
  await context.addInitScript(() => {
    const w = window as unknown as { __cls: number; __shifts: string[] };
    w.__cls = 0;
    w.__shifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean; sources?: Array<{ node?: Node }> }>) {
          if (entry.hadRecentInput) continue;
          w.__cls += entry.value;
          const node = entry.sources?.[0]?.node as Element | undefined;
          w.__shifts.push(`${entry.value.toFixed(3)} ${node?.tagName ?? "?"}.${String(node?.className ?? "").slice(0, 60)}`);
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // layout-shift not supported
    }
  });
  return context;
}

async function open(page: Page, spec: PageSpec, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE_URL}${spec.path}`, { waitUntil: "domcontentloaded" });
  await page.locator(spec.ready).first().waitFor({ timeout: 30_000 });
  // Next's dev-only "N" indicator isn't part of the app.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/** Tables that scroll sideways inside their card. Fine on tablets, a layout problem on desktops. */
async function scrollingTables(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("table")]
      .filter((t) => t.getClientRects().length > 0 && t.parentElement && t.scrollWidth > t.parentElement.clientWidth + 1)
      .map((t) => `${t.querySelector("caption")?.textContent ?? "table"}: ${t.scrollWidth}px in ${t.parentElement!.clientWidth}px`),
  );
}

/** Elements that stick out past the right edge of the viewport and aren't inside their own scroll container. */
async function overflowCulprits(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
      }
      return false;
    };
    return [...document.body.querySelectorAll("*")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > vw + 1 && !inScroller(el) && !el.closest("dialog:not([open]), nextjs-portal");
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} (right=${Math.round(el.getBoundingClientRect().right)})`);
  });
}

/** Interactive elements whose tap area (including a ::before hit-area extension) is under 44×44. */
async function smallTapTargets(page: Page) {
  return page.evaluate(() => {
    const MIN = 44;
    const out: string[] = [];
    const seen = new Set<string>();
    const candidates = document.querySelectorAll<HTMLElement>(
      "a[href], button, select, input:not([type=hidden]), textarea, summary, [role=tab], [role=radio]",
    );
    for (const el of candidates) {
      if (el.closest("nextjs-portal, dialog:not([open]), [popover]:not(:popover-open)")) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      // Checkboxes/radios are measured by their label (the real tap area).
      let target: HTMLElement = el;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) target = el.closest("label") ?? el;
      // Text inputs inside a styled field count as the field.
      const r = target.getBoundingClientRect();
      const ts = getComputedStyle(target);
      // Visually hidden (sr-only, e.g. the skip link until it's focused).
      if (r.width < 2 || r.height < 2 || ts.clipPath.startsWith("inset(50%") || ts.clip.startsWith("rect(0")) continue;
      // Inline links inside running text are exempt (WCAG 2.5.8 "inline" exception).
      if (target.tagName === "A" && target.closest("p") && getComputedStyle(target).display === "inline") continue;
      let w = r.width;
      let h = r.height;
      const before = getComputedStyle(target, "::before");
      if (before.content !== "none" && before.position === "absolute") {
        const neg = (v: string) => Math.max(0, -parseFloat(v) || 0);
        w += neg(before.left) + neg(before.right);
        h += neg(before.top) + neg(before.bottom);
      }
      if (w + 0.5 < MIN || h + 0.5 < MIN) {
        const name = (target.getAttribute("aria-label") || target.textContent || target.getAttribute("placeholder") || "").trim().slice(0, 40);
        const key = `${target.tagName}|${name}|${Math.round(w)}x${Math.round(h)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(`${target.tagName.toLowerCase()} "${name}" ${Math.round(w)}×${Math.round(h)}`);
      }
    }
    return out;
  });
}

/** Tabs through the page and lists focused elements that show no outline or box-shadow ring. */
async function focusRingGaps(page: Page, maxStops = 45) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.click(1, 1); // reset focus to the document start without hitting a control
  const missing: string[] = [];
  const seen = new Set<Element>();
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const ring = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== "none");
      const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName).trim().slice(0, 40);
      return { ring: Boolean(ring), label: `${el.tagName.toLowerCase()} "${label}"`, inPortal: Boolean(el.closest("nextjs-portal")) };
    });
    if (!info || info.inPortal) continue;
    const handle = await page.evaluateHandle(() => document.activeElement);
    const el = handle.asElement() as unknown as Element;
    if (seen.has(el)) break;
    seen.add(el);
    if (!info.ring) missing.push(info.label);
  }
  return missing;
}

async function checkPages(browser: Browser) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const spec of PAGES) {
    const context = await newContext(browser, spec.as);
    const page = await context.newPage();
    for (const width of WIDTHS) {
      await open(page, spec, width);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      if (scrollWidth > innerWidth) {
        failures.push({ page: spec.name, width, kind: "horizontal-scroll", detail: `scrollWidth ${scrollWidth} > ${innerWidth}: ${(await overflowCulprits(page)).join("; ")}` });
      }
      for (const t of await smallTapTargets(page)) warnings.push({ page: spec.name, width, kind: "tap-target", detail: t });
      if (width >= 1440) {
        for (const t of await scrollingTables(page)) warnings.push({ page: spec.name, width, kind: "inner-scroll", detail: t });
      }
      // Screenshot before the keyboard checks, so no focus ring or scrolled strip ends up in it.
      await page.screenshot({ path: `${OUT_DIR}/${spec.name}-${width}.png`, fullPage: true });

      if (AXE_WIDTHS.includes(width)) {
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("nextjs-portal").analyze();
        for (const v of axe.violations) {
          const nodes = v.nodes.slice(0, 4).map((n) => `${n.target.join(" ")}${n.any[0]?.message ? ` (${n.any[0].message})` : ""}`);
          warnings.push({ page: spec.name, width, kind: `axe:${v.id}`, detail: `${v.help}: ${nodes.join(" | ")}` });
        }
        for (const label of await focusRingGaps(page)) warnings.push({ page: spec.name, width, kind: "focus-ring", detail: `no visible focus ring on ${label}` });
      }

      process.stdout.write(".");
    }
    await context.close();

    // Layout shift on a cold load (fonts + data), at a phone and a desktop width.
    for (const width of [360, 1440]) {
      const cold = await newContext(browser, spec.as);
      const p = await cold.newPage();
      await open(p, spec, width);
      await p.waitForTimeout(800);
      const { cls, shifts } = await p.evaluate(() => {
        const w = window as unknown as { __cls: number; __shifts: string[] };
        return { cls: w.__cls, shifts: w.__shifts };
      });
      if (cls > 0.1) warnings.push({ page: spec.name, width, kind: "layout-shift", detail: `CLS ${cls.toFixed(3)}: ${shifts.slice(0, 4).join(" | ")}` });
      await cold.close();
    }
  }
  process.stdout.write("\n");
}

/** Opens an overlay, checks focus moves in, Tab stays inside, Esc closes it and focus returns to the trigger. */
async function checkOverlay(context: BrowserContext, label: string, url: string, width: number, ready: string, openIt: (page: Page) => Promise<void>, triggerName: string) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 800 });
  await page.goto(`${BASE_URL}${url}`, { waitUntil: "domcontentloaded" });
  await page.locator(ready).first().waitFor({ timeout: 30_000 });
  await openIt(page);
  await page.waitForTimeout(400);
  const fail = (detail: string) => failures.push({ page: label, width, kind: "overlay", detail });

  const insideAfterOpen = await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]")));
  if (!insideAfterOpen) fail("focus did not move into the open dialog");
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press(i % 7 === 6 ? "Shift+Tab" : "Tab");
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]")));
    if (!inside) {
      fail(`focus escaped the dialog after ${i + 1} Tab presses`);
      break;
    }
  }
  const scrollLocked = await page.evaluate(() => getComputedStyle(document.documentElement).overflow === "hidden");
  if (!scrollLocked) fail("page scroll is not locked while the dialog is open");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(450);
  const state = await page.evaluate(() => ({
    open: Boolean(document.querySelector("dialog[open]")),
    focused: (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "").trim(),
  }));
  if (state.open) fail("Esc did not close the dialog");
  if (!state.focused.startsWith(triggerName)) fail(`focus returned to "${state.focused}" instead of "${triggerName}"`);
  await page.close();
}

async function checkBehaviour(browser: Browser) {
  const context = await newContext(browser, SUPER_ADMIN);
  await checkOverlay(context, "drawer", "/dashboard", 360, "[role=img][aria-label^='Monthly revenue']", (p) => p.getByRole("button", { name: "Open menu" }).click(), "Open menu");
  await checkOverlay(context, "search-sheet", "/dashboard", 360, "[role=img][aria-label^='Monthly revenue']", (p) => p.getByRole("button", { name: "Search", exact: true }).click(), "Search");
  await checkOverlay(context, "filters-sheet", "/clients", 360, "text=/^Showing \\d/", (p) => p.getByRole("button", { name: /^Filters/ }).click(), "Filters");
  await checkOverlay(context, "new-role-dialog", "/roles", 1440, "text=/permissions selected/", (p) => p.getByRole("button", { name: "New role" }).click(), "New role");

  // The search sheet must put focus straight into its input.
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.locator("[role=img][aria-label^='Monthly revenue']").waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForTimeout(300);
    const type = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.type);
    if (type !== "search") failures.push({ page: "search-sheet", width: 390, kind: "overlay", detail: `focus is on "${type}", not the search input` });
    // Ctrl+K at phone width opens the sheet too.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(400);
    const ctrlK = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.type === "search" && Boolean(document.activeElement?.closest("dialog[open]")));
    if (!ctrlK) failures.push({ page: "search-sheet", width: 390, kind: "keyboard", detail: "Ctrl+K did not open search with focus in the input" });
    await page.close();
  }

  // Account menu (popover): opens from the sidebar card, closes with Esc.
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.locator("[role=img][aria-label^='Monthly revenue']").waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: /^Account:/ }).first().focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const opened = await page.evaluate(() => Boolean(document.querySelector("[popover]:popover-open")));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const closed = await page.evaluate(() => !document.querySelector("[popover]:popover-open"));
    if (!opened || !closed) failures.push({ page: "account-menu", width: 1440, kind: "keyboard", detail: `opened=${opened} closedByEsc=${closed}` });
    await page.close();
  }
  await context.close();

  // Reduced motion: the drawer must not animate when the user asks for less motion.
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    const ctx = await newContext(browser, SUPER_ADMIN, { reducedMotion });
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.locator("[role=img][aria-label^='Monthly revenue']").waitFor({ timeout: 30_000 });
    const duration = await page.evaluate(() => getComputedStyle(document.querySelector("dialog.ui-modal")!).transitionDuration);
    const longest = Math.max(...duration.split(",").map((d) => parseFloat(d) * (d.trim().endsWith("ms") ? 1 : 1000)));
    if (reducedMotion === "reduce" && longest > 1) failures.push({ page: "reduced-motion", kind: "motion", detail: `drawer still animates (${duration})` });
    if (reducedMotion === "no-preference" && longest < 100) warnings.push({ page: "reduced-motion", kind: "motion", detail: `drawer has no animation by default (${duration})` });
    await ctx.close();
  }
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  console.log(`Checking ${PAGES.length} pages × ${WIDTHS.length} widths against ${BASE_URL}`);
  await checkPages(browser);
  console.log("Checking overlays, keyboard and motion");
  await checkBehaviour(browser);
} finally {
  await browser.close();
}

writeFileSync(`${OUT_DIR}/report.json`, JSON.stringify({ baseUrl: BASE_URL, failures, warnings }, null, 2));
const print = (title: string, list: Issue[]) => {
  console.log(`\n${title} (${list.length})`);
  for (const i of list) console.log(`  [${i.page}${i.width ? ` @${i.width}` : ""}] ${i.kind}: ${i.detail}`);
};
print("FAILURES", failures);
print("Warnings", warnings);
console.log(`\nScreenshots and report.json in ${OUT_DIR}/`);
process.exit(failures.length > 0 || (STRICT && warnings.length > 0) ? 1 : 0);
