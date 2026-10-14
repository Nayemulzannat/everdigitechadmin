// Locks page scrolling while a modal is open. Counted, so stacked modals unlock only when the last one closes.
let lockCount = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/** Lock body scroll and return a function that releases this lock (safe to call more than once). */
export function lockBodyScroll() {
  const html = document.documentElement;

  if (lockCount === 0) {
    // Pad by the scrollbar width so the page doesn't shift sideways when the scrollbar disappears.
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    saved = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
    html.style.overflow = "hidden";
    if (scrollbarWidth > 0) html.style.paddingRight = `${scrollbarWidth}px`;
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0 && saved) {
      html.style.overflow = saved.overflow;
      html.style.paddingRight = saved.paddingRight;
      saved = null;
    }
  };
}
