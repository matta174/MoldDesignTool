import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the input value.
 * The output only updates after `delay` ms of no changes to the input.
 * Useful for expensive computations triggered by slider changes.
 */
export function useDebouncedValue<T>(value: T, delay: number = 100): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
