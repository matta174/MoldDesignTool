import { useEffect, useRef } from 'react';
import type { BufferGeometry } from 'three';

/**
 * Tracks a geometry reference and disposes the previous one when it changes.
 * Prevents GPU memory leaks from replacing geometries in useMemo.
 * Also disposes on unmount.
 */
export function useDisposableGeometry(geometry: BufferGeometry | null): void {
  const prevRef = useRef<BufferGeometry | null>(null);

  useEffect(() => {
    // Dispose previous geometry when a new one replaces it
    if (prevRef.current && prevRef.current !== geometry) {
      prevRef.current.dispose();
    }
    prevRef.current = geometry;

    // Dispose on unmount
    return () => {
      if (prevRef.current) {
        prevRef.current.dispose();
        prevRef.current = null;
      }
    };
  }, [geometry]);
}
