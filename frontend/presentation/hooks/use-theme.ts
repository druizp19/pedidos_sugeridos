"use client";
import { useEffect, useRef, useState } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(false);
  const frame = useRef<number | null>(null);

  function applyTheme(next: boolean) {
    const root = document.documentElement;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    root.classList.add('theme-switching');
    root.classList.toggle('dark', next);
    root.style.colorScheme = next ? 'dark' : 'light';
    // Commit the new palette while transitions are disabled, before painting.
    void getComputedStyle(root).color;
    setDark(next);
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => {
        root.classList.remove('theme-switching');
        frame.current = null;
      });
    });
  }

  useEffect(() => {
    let value = false;
    try { value = localStorage.getItem('pedidos-theme') === 'dark'; } catch { /* Storage can be disabled. */ }
    applyTheme(value);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      document.documentElement.classList.remove('theme-switching');
    };
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    applyTheme(next);
    try { localStorage.setItem('pedidos-theme', next ? 'dark' : 'light'); } catch { /* Theme still works for this session. */ }
  }
  return { dark, toggle };
}
