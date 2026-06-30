import { useEffect, useState } from 'react';

/**
 * Returns false during SSR and the first client render, then true after mount.
 * Use to gate client-only UI and avoid hydration mismatches without scattering
 * bespoke `setMounted(true)` effects across components.
 */
export default function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
