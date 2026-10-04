import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Refresh only when layout dimensions change, including the docked Docent. */
export function observeScrollLayout(element: HTMLElement | null, measure?: () => void) {
  let frame = 0;
  let disposed = false;
  const refresh = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (disposed) return;
      measure?.();
      ScrollTrigger.refresh();
    });
  };
  const observer = new ResizeObserver(refresh);
  if (element) observer.observe(element);
  window.addEventListener("resize", refresh);
  window.addEventListener("load", refresh);
  document.fonts.ready.then(refresh);
  refresh();
  return () => {
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", refresh);
    window.removeEventListener("load", refresh);
  };
}
