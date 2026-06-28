import { useEffect, useState } from 'react';

/**
 * Estimates how many columns a CSS grid will render for repeat(auto-fill, minmax(...)).
 */
export function useGridColumnCount(containerRef, { minColumnWidth = 280, gap = 25 } = {}) {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const measure = () => {
      const width = element.clientWidth;
      const nextColumns = Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)));
      setColumns(nextColumns);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [containerRef, minColumnWidth, gap]);

  return columns;
}
