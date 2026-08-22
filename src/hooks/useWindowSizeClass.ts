import { useEffect, useState } from "react";

export type WindowSizeClass = "compact" | "medium" | "expanded";

/** MD3 window width classes: compact <600, medium 600–839, expanded >=840. */
export function getWindowSizeClass(width: number): WindowSizeClass {
  if (width < 600) return "compact";
  if (width < 840) return "medium";
  return "expanded";
}

export function useWindowSizeClass(): WindowSizeClass {
  const [sizeClass, setSizeClass] = useState<WindowSizeClass>(() =>
    getWindowSizeClass(window.innerWidth),
  );

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setSizeClass(getWindowSizeClass(window.innerWidth));
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return sizeClass;
}
