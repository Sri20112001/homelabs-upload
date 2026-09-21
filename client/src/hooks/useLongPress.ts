import { useRef, useCallback, useEffect } from 'react';

// Long-press (touch) helper: fires onLongPress(x, y) after `ms` of steady
// contact. Scrolling/moving/lifting cancels. After a long-press fires, the
// next click (synthesized tap) is swallowed via suppressClick() so the item
// doesn't also open/select.
//
// Used to give touch users the right-click context menu on files/folders.
export function useLongPress(onLongPress: (x: number, y: number) => void, ms = 500) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Clear pending timers on unmount.
  useEffect(() => cancel, [cancel]);

  const start = useCallback(
    (x: number, y: number) => {
      fired.current = false;
      cancel();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        timer.current = null;
        onLongPress(x, y);
      }, ms);
    },
    [cancel, ms, onLongPress],
  );

  // Returns true when the click follows a long-press (caller should ignore it).
  const suppressClick = useCallback(() => {
    if (fired.current) {
      fired.current = false;
      return true;
    }
    return false;
  }, []);

  return { start, cancel, suppressClick };
}
